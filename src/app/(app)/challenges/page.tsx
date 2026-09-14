import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveChallengesWithProgress } from "@/services/challenge.service";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Flag } from "lucide-react";

export const metadata: Metadata = { title: "Défis" };

function daysRemaining(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default async function ChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [challenges, { data: season }] = await Promise.all([
    getActiveChallengesWithProgress(user.id),
    supabase.from("seasons").select("*").eq("is_active", true).maybeSingle(),
  ]);

  const daysLeft = season ? daysRemaining(season.ends_at) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-lg border border-gold/30 bg-gradient-to-br from-gold/10 via-card to-card p-6">
        <span className="text-xs font-semibold uppercase tracking-wide text-gold">
          {season?.name ?? "Saison ASCEND"}
        </span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">{season?.label}</h1>
        {daysLeft != null && (
          <p className="mt-1 text-sm text-text-secondary">{daysLeft} jours restants dans cette saison.</p>
        )}
      </div>

      {challenges.length === 0 ? (
        <EmptyState icon={Flag} title="Le prochain défi arrive bientôt." description="Reviens vite." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}
