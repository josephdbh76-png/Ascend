import { Crown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatPercent } from "@/lib/utils";

const ROWS = [
  { rank: 1, name: "Thomas Dubois", business: "SaaS", revenue: 18254000, growth: 12.5 },
  { rank: 2, name: "Lucas Martin", business: "E-commerce", revenue: 14123000, growth: 28.4 },
  { rank: 3, name: "Emma Laurent", business: "SaaS", revenue: 12689000, growth: 9.7 },
  { rank: 4, name: "Julien Moreau", business: "Agency", revenue: 9820000, growth: 15.1 },
  { rank: 5, name: "Sofia Rossi", business: "Consulting", revenue: 8410000, growth: 22.3 },
];

const RANK_COLORS: Record<number, string> = { 1: "text-rank-1", 2: "text-rank-2", 3: "text-rank-3" };

export function LeaderboardPreview() {
  return (
    <section id="leaderboard" className="border-b border-border">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
              Where do you stand?
            </h2>
            <p className="mt-3 max-w-lg text-sm text-text-secondary">
              Global, country and category leaderboards ranked by verified monthly revenue.
            </p>
          </div>
          <Button href="/signup" variant="secondary">
            See the full leaderboard
          </Button>
        </div>

        <div className="mt-10 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="w-16 px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Founder</th>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 text-right font-medium">Monthly Revenue</th>
                <th className="px-4 py-3 text-right font-medium">Growth</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.rank} className="border-b border-border last:border-0">
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1.5">
                      {row.rank <= 3 && <Crown className={`h-4 w-4 ${RANK_COLORS[row.rank]}`} />}
                      <span className={`font-semibold tabular-nums ${RANK_COLORS[row.rank] ?? "text-text-primary"}`}>
                        #{row.rank}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-text-primary">{row.name}</td>
                  <td className="px-4 py-3.5 text-text-secondary">{row.business}</td>
                  <td className="px-4 py-3.5 text-right font-medium tabular-nums text-text-primary">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium tabular-nums text-success">
                    {formatPercent(row.growth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Illustrative example data for demonstration purposes — not live rankings.
        </p>
      </div>
    </section>
  );
}
