import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, getUserRank } from "@/services/leaderboard.service";
import { LeaderboardControls } from "@/components/leaderboard/LeaderboardControls";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
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

  const [rows, yourRank] = await Promise.all([
    getLeaderboard(scope, scopeValue, 50, 0),
    user ? getUserRank(user.id, scope, scopeValue) : Promise.resolve(null),
  ]);
  const isOnPage = rows.some((r) => r.is_current_user);
  const openTopTenSpots = Math.max(0, 10 - rows.length);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Classement</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Seuls les fondateurs vérifiés apparaissent ici, classés par revenus mensuels.
        </p>
      </div>

      <LeaderboardControls scope={scope} scopeValue={scopeValue} />

      {user && !yourRank && (
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" elevated>
          <div>
            <p className="text-sm font-semibold text-text-primary">Tu n&apos;apparais pas encore dans ce classement.</p>
            <p className="mt-0.5 text-sm text-text-secondary">
              {openTopTenSpots > 0
                ? `Il reste ${openTopTenSpots} place${openTopTenSpots > 1 ? "s" : ""} dans le top 10. Vérifie tes revenus pour prendre la tienne.`
                : "Vérifie tes revenus pour découvrir ton rang et commencer à grimper."}
            </p>
          </div>
          <Button href="/app/settings#comptes-connectes" size="sm" className="shrink-0">
            Vérifier mes revenus <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Card>
      )}

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
