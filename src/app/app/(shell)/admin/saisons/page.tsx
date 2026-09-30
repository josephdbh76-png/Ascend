import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listSeasons,
  getSeasonRewards,
  listSeasonChallengesForAdmin,
  previewSeasonClosing,
  listPhysicalRewards,
} from "@/services/season.service";
import { SeasonsAdmin } from "./SeasonsAdmin";

export const metadata: Metadata = { title: "Saisons · Administration" };

export default async function AdminSeasonsPage({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const selected = seasons.find((s) => s.id === params.saison) ?? seasons.find((s) => s.isActive) ?? seasons[0] ?? null;

  const admin = createAdminClient();
  const [{ data: titles }, { data: trophies }, challenges, rewards, standings, physical] = await Promise.all([
    admin.from("titles").select("id, name, rarity, type").order("created_at"),
    admin.from("trophies").select("id, name").order("created_at"),
    selected ? listSeasonChallengesForAdmin(selected.id) : Promise.resolve([]),
    selected ? getSeasonRewards(selected.id) : Promise.resolve([]),
    selected ? previewSeasonClosing(selected.id) : Promise.resolve([]),
    selected?.rewardsDistributedAt ? listPhysicalRewards(selected.id) : Promise.resolve([]),
  ]);

  return (
    <SeasonsAdmin
      seasons={seasons}
      selected={selected}
      challenges={challenges}
      rewards={rewards}
      standings={standings.slice(0, 30)}
      participants={standings.length}
      physical={physical}
      titles={(titles ?? []).filter((t) => t.type === "earned").map((t) => ({ id: t.id, name: t.name }))}
      trophies={(trophies ?? []).map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}
