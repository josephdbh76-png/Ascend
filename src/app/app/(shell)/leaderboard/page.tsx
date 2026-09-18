import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, getUserRank } from "@/services/leaderboard.service";
import { LeaderboardControls } from "@/components/leaderboard/LeaderboardControls";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatCurrencyRange, formatPercent } from "@/lib/utils";
import type { LeaderboardScope } from "@/types/database.types";

export const metadata: Metadata = { title: "Classement" };

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; value?: string }>;
}) {
  const params = await searchParams;
  const scope = (params.scope as LeaderboardScope) ?? "global";
  const scopeValue = params.value ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = await getLeaderboard(scope, scopeValue, 50, 0);
  const yourRank = user ? await getUserRank(user.id, scope, scopeValue) : null;
  const isOnPage = rows.some((r) => r.is_current_user);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Classement</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Seuls les fondateurs vérifiés apparaissent ici, classés par revenus mensuels.
        </p>
      </div>

      <LeaderboardControls scope={scope} scopeValue={scopeValue} />

      {yourRank && !isOnPage && (
        <Card className="flex items-center justify-between p-4" elevated>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tabular-nums text-gold">#{yourRank.rank}</span>
            <span className="text-sm text-text-secondary">Ton rang · {yourRank.total} fondateurs classés</span>
          </div>
          {yourRank.growth_percent != null && (
            <span className={yourRank.growth_percent >= 0 ? "text-success text-sm" : "text-error text-sm"}>
              {formatPercent(yourRank.growth_percent)}
            </span>
          )}
        </Card>
      )}

      <LeaderboardTable rows={rows} />

      {yourRank && (
        <p className="text-center text-xs text-text-muted">
          Tes revenus :{" "}
          {yourRank.revenue_display_cents != null
            ? formatCurrency(yourRank.revenue_display_cents)
            : yourRank.revenue_range_min_cents != null && yourRank.revenue_range_max_cents != null
              ? formatCurrencyRange(yourRank.revenue_range_min_cents, yourRank.revenue_range_max_cents)
              : "masqués par tes réglages de confidentialité"}
        </p>
      )}
    </div>
  );
}
