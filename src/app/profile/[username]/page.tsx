import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicProfileByUsername } from "@/services/profile.service";
import { createClient } from "@/lib/supabase/server";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { MilestoneTimeline } from "@/components/profile/MilestoneTimeline";
import { ProfileBusinesses, hasBusinessDetails } from "@/components/profile/ProfileBusinesses";
import { TrainingSpotlight } from "@/components/trainings/TrainingSpotlight";
import { listProfileTrainings } from "@/services/training.service";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { TrophyCard } from "@/components/achievements/TrophyCard";
import { TitleCard } from "@/components/titles/TitleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { getProfile } from "@/services/profile.service";
import { getNotifications, getUnreadCount } from "@/services/notification.service";
import { getUserTitles } from "@/services/title.service";
import { getFollowCounts, isFollowing as checkIsFollowing } from "@/services/network.service";
import { recordProfileView } from "@/services/profileView.service";
import { getUnreadMessageCount } from "@/services/message.service";
import { isCurrentUserAdmin } from "@/services/admin.service";
import { formatCurrency, formatCurrencyRange, getAppUrl } from "@/lib/utils";
import { activityLabel, ofName } from "@/lib/business";
import { isShareKind, shareCardPath, type ShareTarget } from "@/lib/share/params";
import { JsonLd } from "@/components/seo/JsonLd";
import { Award, Trophy, Gem, TrendingUp, ArrowRight } from "lucide-react";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const profile = await getPublicProfileByUsername(username);
  if (!profile) return { title: "Profil introuvable", robots: { index: false, follow: false } };

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || `@${profile.username}`;
  const main = profile.businesses[0];
  const revenueLine =
    profile.revenueVisibility === "exact" && profile.revenueDisplayCents != null
      ? `${formatCurrency(profile.revenueDisplayCents)} de revenus mensuels vérifiés`
      : profile.revenueVisibility === "range" &&
          profile.revenueRangeMinCents != null &&
          profile.revenueRangeMaxCents != null
        ? `${formatCurrencyRange(profile.revenueRangeMinCents, profile.revenueRangeMaxCents)} de revenus mensuels vérifiés`
        : profile.revenueVerified
          ? "Revenus vérifiés"
          : null;
  // The layout template appends " — ASCEND".
  const title = profile.globalRank ? `${name} — #${profile.globalRank} au classement` : name;
  const description = [
    main ? `Fondateur ${ofName(main.name)} (${activityLabel(main.category, main.customCategory)}).` : null,
    revenueLine ? `${revenueLine}.` : null,
    "Profil public sur ASCEND, le classement des entrepreneurs aux revenus vérifiés.",
  ]
    .filter(Boolean)
    .join(" ");

  // A shared card (?partage=achievement&id=...) becomes the link preview.
  const kind = typeof query.partage === "string" ? query.partage : null;
  const id = typeof query.id === "string" ? query.id : null;
  const target: ShareTarget =
    isShareKind(kind) && (kind === "rank" || id) ? { kind, username: profile.username, id } : { kind: "rank", username: profile.username };
  const image = { url: shareCardPath(target, "landscape", "prestige"), width: 1200, height: 630, alt: `Carte ASCEND de ${name}` };
  const path = `/profile/${profile.username}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: profile.isDemo ? { index: false, follow: true } : undefined,
    openGraph: { title, description, type: "profile", url: path, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel !== aal.nextLevel) redirect("/mfa-challenge");
  }

  const isOwner = user?.id === profile.userId;
  const [viewerProfile, titles, followCounts, following, , trainings] = await Promise.all([
    user ? getProfile(user.id) : Promise.resolve(null),
    getUserTitles(profile.userId),
    getFollowCounts(profile.userId),
    user && !isOwner ? checkIsFollowing(user.id, profile.userId) : Promise.resolve(false),
    user && !isOwner ? recordProfileView(profile.userId, user.id) : Promise.resolve(),
    listProfileTrainings(profile.userId, { userId: user?.id ?? null, tier: null }).catch(() => []),
  ]);
  const [notifications, unreadCount, viewerIsAdmin, viewerUnreadMessages] = viewerProfile
    ? await Promise.all([
        getNotifications(user!.id, 8),
        getUnreadCount(user!.id),
        isCurrentUserAdmin(),
        getUnreadMessageCount(user!.id),
      ])
    : [[], 0, false, 0];
  const isCreator = profile.isCofounder;

  const appUrl = getAppUrl();
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || `@${profile.username}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateCreated: profile.memberSince,
    url: `${appUrl}/profile/${profile.username}`,
    mainEntity: {
      "@type": "Person",
      name: fullName,
      alternateName: `@${profile.username}`,
      identifier: profile.username,
      url: `${appUrl}/profile/${profile.username}`,
      ...(profile.bio ? { description: profile.bio } : {}),
      ...(profile.avatarUrl ? { image: profile.avatarUrl } : {}),
      ...(profile.businesses.length > 0
        ? {
            jobTitle: "Fondateur",
            worksFor: profile.businesses.map((b) => ({
              "@type": "Organization",
              name: b.name,
              ...(b.description ? { description: b.description } : {}),
              ...(b.website ? { url: b.website } : {}),
            })),
          }
        : {}),
      interactionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/FollowAction",
        userInteractionCount: followCounts.followers,
      },
    },
  };

  const body = (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      {!profile.isDemo && <JsonLd data={structuredData} />}
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        viewerId={user?.id ?? null}
        isFollowing={following}
        followerCount={followCounts.followers}
        followingCount={followCounts.following}
        isCreator={isCreator}
      />

      <TrainingSpotlight trainings={trainings} isOwner={isOwner} />

      {hasBusinessDetails(profile.businesses) && <ProfileBusinesses businesses={profile.businesses} />}

      {profile.revenueVerified && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
            <TrendingUp className="h-4 w-4" /> Trajectoire
          </h2>
          <MilestoneTimeline achievements={profile.achievements} />
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
          <Gem className="h-4 w-4" /> Titres
        </h2>
        {titles.length === 0 ? (
          <EmptyState title="Pas encore de titre." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {titles.map((t) => (
              <TitleCard
                key={t.id}
                id={t.id}
                name={t.name}
                description={t.description}
                icon={t.icon}
                rarity={t.rarity}
                owned
                isActive={t.isActive}
                interactive={isOwner}
                shareUsername={isOwner ? profile.username : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
          <Trophy className="h-4 w-4" /> Trophées
        </h2>
        {profile.trophies.length === 0 ? (
          <EmptyState title="Pas encore de trophée." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {profile.trophies.map((t) => (
              <TrophyCard
                key={t.id}
                id={t.id}
                name={t.name}
                description={t.description}
                earnedAt={t.earnedAt}
                shareUsername={isOwner ? profile.username : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
          <Award className="h-4 w-4" /> Accomplissements
        </h2>
        {profile.achievements.length === 0 ? (
          <EmptyState title="Pas encore d'accomplissement." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {profile.achievements.map((a) => (
              <AchievementCard
                key={a.id}
                id={a.id}
                name={a.name}
                description={a.description}
                rarity={a.rarity}
                earnedAt={a.earnedAt}
                shareUsername={isOwner ? profile.username : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {!user && (
        <section className="flex flex-col items-center gap-4 rounded-lg border border-gold/30 bg-gold/5 px-6 py-8 text-center">
          <h2 className="text-lg font-semibold text-text-primary">
            Et toi, tu te situes où à côté de {profile.firstName ?? `@${profile.username}`} ?
          </h2>
          <p className="max-w-md text-sm text-text-secondary">
            Crée ton profil gratuitement, vérifie tes revenus et découvre ta place au classement. Les 500
            premiers inscrits reçoivent le titre de Membre fondateur.
          </p>
          <Button href="/signup" size="lg">
            Créer mon profil gratuit <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-text-muted">Sans carte bancaire · 2 minutes</p>
        </section>
      )}
    </div>
  );

  if (viewerProfile) {
    return (
      <AppShell
        username={viewerProfile.username}
        avatarUrl={viewerProfile.avatarUrl}
        firstName={viewerProfile.firstName}
        notifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt,
          readAt: n.readAt,
          metadata: n.metadata,
        }))}
        unreadCount={unreadCount}
        isAdmin={viewerIsAdmin}
        unreadMessageCount={viewerUnreadMessages}
      >
        {body}
      </AppShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      <main id="main-content" className="flex-1">{body}</main>
      <Footer />
    </div>
  );
}
