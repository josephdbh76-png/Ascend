import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevenue, nextRevenueMilestone } from "@/services/revenue.service";
import { getUserRank } from "@/services/leaderboard.service";
import { VerificationReveal } from "./VerificationReveal";

export const metadata: Metadata = { title: "Vérification" };

export default async function VerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current } = await getCurrentRevenue(user.id);
  const rankResult = current ? await getUserRank(user.id, "global", "") : null;
  const milestone = current ? nextRevenueMilestone(current.amountCents) : null;

  return (
    <VerificationReveal
      rank={rankResult?.rank ?? null}
      revenueCents={current?.amountCents ?? null}
      milestoneCents={milestone?.targetCents ?? null}
    />
  );
}
