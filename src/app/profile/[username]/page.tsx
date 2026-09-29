import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicProfileByUsername } from "@/services/profile.service";
import { createClient } from "@/lib/supabase/server";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { MilestoneTimeline } from "@/components/profile/MilestoneTimeline";
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
import { formatCurrency, formatCurrencyRange } from "@/lib/utils";
import { Award, Trophy, Gem, TrendingUp, ArrowRight } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) return { title: "Profil introuvable" };

  const revenueLine =
    profile.revenueVisibility === "exact" && profile.revenueDisplayCents != null
      ? `${formatCurrency(profile.revenueDisplayCents)}/mois · Vérifié`
      : profile.revenueVisibility === "range" &&
          profile.revenueRangeMinCents != null &&
          profile.revenueRangeMaxCents != null
        ? `${formatCurrencyRange(profile.revenueRangeMinCents, profile.revenueRangeMaxCents)}/mois · Vérifié`
        : profile.revenueVerified
          ? "Vérifié"
          : "Profil fondateur ASCEND";

  const rankLine = profile.globalRank ? `#${profile.globalRank} mondial sur ASCEND` : "ASCEND";
  const title = `${profile.firstName} ${profile.lastName} — ${rankLine}`;

  return {
    title,
    description: revenueLine,
    openGraph: { title, description: revenueLine, type: "profile" },
    twitter: { card: "summary", title, description: revenueLine },
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
  const [viewerProfile, titles, followCounts, following] = await Promise.all([
    user ? getProfile(user.id) : Promise.resolve(null),
    getUserTitles(profile.userId),
    getFollowCounts(profile.userId),
    user && !isOwner ? checkIsFollowing(user.id, profile.userId) : Promise.resolve(false),
    user && !isOwner ? recordProfileView(profile.userId, user.id) : Promise.resolve(),
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

  const body = (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        viewerId={user?.id ?? null}
        isFollowing={following}
        followerCount={followCounts.followers}
        followingCount={followCounts.following}
        isCreator={isCreator}
      />

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
              <TrophyCard key={t.id} name={t.name} description={t.description} earnedAt={t.earnedAt} />
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
                name={a.name}
                description={a.description}
                rarity={a.rarity}
                earnedAt={a.earnedAt}
                shareName={isOwner ? (profile.firstName ?? `@${profile.username}`) : undefined}
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
