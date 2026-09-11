import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProfileByUsername } from "@/services/profile.service";
import { createClient } from "@/lib/supabase/server";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { TrophyCard } from "@/components/achievements/TrophyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Navbar } from "@/components/layout/Navbar";
import { PublicNav } from "@/components/layout/PublicNav";
import { getProfile } from "@/services/profile.service";
import { formatCurrency, formatCurrencyRange } from "@/lib/utils";
import { Award, Trophy } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) return { title: "Profile not found" };

  const revenueLine =
    profile.revenueVisibility === "exact" && profile.revenueDisplayCents != null
      ? `${formatCurrency(profile.revenueDisplayCents)}/month · Verified`
      : profile.revenueVisibility === "range" &&
          profile.revenueRangeMinCents != null &&
          profile.revenueRangeMaxCents != null
        ? `${formatCurrencyRange(profile.revenueRangeMinCents, profile.revenueRangeMaxCents)}/month · Verified`
        : profile.revenueVerified
          ? "Verified"
          : "ASCEND founder profile";

  const rankLine = profile.globalRank ? `#${profile.globalRank} on ASCEND` : "ASCEND";
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
  const isOwner = user?.id === profile.userId;
  const viewerProfile = user ? await getProfile(user.id) : null;

  const body = (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <ProfileHeader profile={profile} isOwner={isOwner} />

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
          <Trophy className="h-4 w-4" /> Trophies
        </h2>
        {profile.trophies.length === 0 ? (
          <EmptyState title="No trophies yet." />
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
          <Award className="h-4 w-4" /> Achievements
        </h2>
        {profile.achievements.length === 0 ? (
          <EmptyState title="No achievements yet." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {profile.achievements.map((a) => (
              <AchievementCard key={a.id} name={a.name} description={a.description} rarity={a.rarity} earnedAt={a.earnedAt} />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  if (viewerProfile) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-primary">
        <Navbar username={viewerProfile.username} avatarUrl={viewerProfile.avatarUrl} firstName={viewerProfile.firstName} />
        {body}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      {body}
    </div>
  );
}
