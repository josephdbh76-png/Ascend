import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAllAchievementCatalog, getUserAchievements } from "@/services/achievement.service";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { TrophyCard } from "@/components/achievements/TrophyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Trophy } from "lucide-react";

export const metadata: Metadata = { title: "Accomplissements" };

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [catalog, earned] = await Promise.all([getAllAchievementCatalog(), getUserAchievements(user.id)]);
  const earnedById = new Map(earned.map((e) => [e.id, e.earnedAt]));

  const { data: trophyRows } = await supabase
    .from("user_trophies")
    .select("trophy_id, earned_at")
    .eq("user_id", user.id);
  const trophyIds = (trophyRows ?? []).map((t) => t.trophy_id);
  const { data: trophyCatalog } = trophyIds.length
    ? await supabase.from("trophies").select("*").in("id", trophyIds)
    : { data: [] };
  const trophyById = new Map((trophyCatalog ?? []).map((t) => [t.id, t]));

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-text-primary">Accomplissements</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Les résultats méritent d&apos;être reconnus. Voici tes trophées et accomplissements sur ASCEND.
        </p>
      </div>

      <section>
        <h2 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">Trophées</h2>
        {(trophyRows?.length ?? 0) === 0 ? (
          <EmptyState icon={Trophy} title="Pas encore de trophée." description="Les trophées sont rares — ils récompensent le classement, la croissance et le prestige de saison." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(trophyRows ?? [])
              .filter((t) => trophyById.has(t.trophy_id))
              .map((t) => {
                const def = trophyById.get(t.trophy_id)!;
                return <TrophyCard key={t.trophy_id} name={def.name} description={def.description} earnedAt={t.earned_at} />;
              })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">
          Accomplissements ({earned.length}/{catalog.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((a) => (
            <AchievementCard
              key={a.id}
              name={a.name}
              description={a.description}
              rarity={a.rarity}
              earnedAt={earnedById.get(a.id) ?? null}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
