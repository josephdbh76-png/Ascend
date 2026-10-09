import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clanRank, getMembership } from "@/services/clan.service";
import { getClanWarState } from "@/services/clanWar.service";
import { ClanHero } from "@/components/clans/ClanHero";
import { LigueTabs } from "@/components/clans/LigueTabs";

export default async function LigueLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const membership = await getMembership(data.user.id);
  const [rank, war] = membership
    ? await Promise.all([clanRank(membership.clan), getClanWarState(membership.clan.id, data.user.id)])
    : [0, null];

  return (
    <div className="flex flex-col gap-6">
      {membership ? (
        <ClanHero clan={membership.clan} rank={rank} role={membership.role} />
      ) : (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Ligues</h1>
          <p className="mt-1 text-sm text-text-secondary">Joue en équipe, défie d&apos;autres ligues et gagne de l&apos;argent en invitant.</p>
        </div>
      )}
      <LigueTabs hasClan={!!membership} warLive={war?.current?.phase === "live"} />
      {children}
    </div>
  );
}
