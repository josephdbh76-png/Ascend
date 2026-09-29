import { Download } from "lucide-react";
import type { SurveyTally } from "@/services/survey.service";

export function SurveyPanel({
  total,
  tallies,
  referrers,
}: {
  total: number;
  tallies: SurveyTally[];
  referrers: { name: string; count: number }[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          <span className="font-semibold tabular-nums text-text-primary">{total}</span> réponse{total > 1 ? "s" : ""}
        </p>
        <a
          href="/api/admin/survey-export"
          download
          className="inline-flex h-8 items-center gap-2 rounded-md border border-border-strong bg-card-elevated px-3 text-xs font-medium text-text-primary transition-colors hover:bg-card-active"
        >
          <Download className="h-3.5 w-3.5" /> Exporter pour Excel (.csv)
        </a>
      </div>

      {total === 0 ? (
        <p className="text-xs text-text-muted">
          Aucune réponse pour l&apos;instant. Elles arrivent à chaque nouvelle inscription.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {tallies.map((t) => (
            <div key={t.question}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">{t.question}</h3>
              <ul className="flex flex-col gap-1.5">
                {t.rows
                  .filter((r) => r.count > 0)
                  .map((r) => {
                    const pct = Math.round((r.count / t.total) * 100);
                    return (
                      <li key={r.label} className="text-xs">
                        <div className="mb-0.5 flex justify-between gap-2 text-text-secondary">
                          <span>{r.label}</span>
                          <span className="tabular-nums text-text-primary">
                            {r.count} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border">
                          <div className="h-1.5 rounded-full bg-gold" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}

          {referrers.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Recommandé par</h3>
              <ul className="flex flex-col gap-1 text-xs">
                {referrers.map((r) => (
                  <li key={r.name} className="flex justify-between text-text-secondary">
                    <span>{r.name}</span>
                    <span className="tabular-nums text-text-primary">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
