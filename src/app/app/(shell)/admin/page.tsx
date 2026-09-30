import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { computeBusinessMetrics, getMetricsTokenStatus } from "@/services/metrics.service";
import { listSurveyResponses, summarizeSurvey } from "@/services/survey.service";
import { getActiveSeason, getSeasonStandings } from "@/services/season.service";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, getAppUrl } from "@/lib/utils";
import { AdminSection } from "./AdminSection";
import { ExcelLinkPanel } from "./ExcelLinkPanel";

export const metadata: Metadata = { title: "Administration" };

function pct(value: number | null) {
  return value == null ? "—" : `${(value * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

export default async function AdminOverviewPage() {
  const [metrics, tokenStatus, survey, season] = await Promise.all([
    computeBusinessMetrics(),
    getMetricsTokenStatus().catch(() => ({ active: 0, lastUsedAt: null })),
    listSurveyResponses(),
    getActiveSeason(),
  ]);
  const standings = season ? await getSeasonStandings(season.id, 3) : [];
  const discovery = summarizeSurvey(survey)[0];
  const { members, subscriptions: subs, rates } = metrics;
  const maxSignups = Math.max(1, ...metrics.monthly.map((m) => m.signups));

  return (
    <div className="flex flex-col gap-6">
      {metrics.stripeError && (
        <p className="flex items-center gap-2 rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Stripe n&apos;a pas répondu : les chiffres d&apos;abonnement sont
          incomplets ({metrics.stripeError}).
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Inscrits" value={members.total} trend={`+${members.last7Days} cette semaine · +${members.last30Days} sur 30 jours`} />
        <StatCard label="Membres vérifiés" value={members.verified} trend={`${pct(rates.verification)} des inscrits`} />
        <StatCard label="Abonnés Pro" value={subs.pro} trend={`${subs.proMonthly} mensuels · ${subs.proAnnual} annuels`} />
        <StatCard label="Abonnés Elite" value={subs.elite} trend={`${subs.eliteMonthly} mensuels · ${subs.eliteAnnual} annuels`} accent />
        <StatCard label="Revenu mensuel récurrent" value={formatCurrency(subs.mrrCents)} trend={`${formatCurrency(subs.mrrCents * 12)} par an`} accent />
        <StatCard label="Conversion inscrit → payant" value={pct(rates.paid)} trend={`${subs.payingCustomers} clients payants`} />
        <StatCard label="Essais Elite en cours" value={subs.trialing} trend={subs.pastDue > 0 ? `${subs.pastDue} paiement(s) en échec` : "Aucun paiement en échec"} trendPositive={subs.pastDue === 0} />
        <StatCard label="Résiliations (30 jours)" value={subs.canceledLast30Days} trend={`Marché : ${metrics.marketplace.sales} ventes · ${formatCurrency(metrics.marketplace.commissionCents)}`} />
      </div>

      <AdminSection
        title="Connexion Excel et Google Sheets"
        description="Ces chiffres, en direct depuis Stripe et la base, dans ton classeur. Aucune saisie à la main."
      >
        <ExcelLinkPanel appUrl={getAppUrl()} activeLinks={tokenStatus.active} lastUsedAt={tokenStatus.lastUsedAt} />
      </AdminSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminSection title="12 derniers mois" description="Inscriptions, nouveaux abonnements et résiliations.">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-muted">
                  <th className="pb-2 font-medium">Mois</th>
                  <th className="pb-2 font-medium">Inscrits</th>
                  <th className="pb-2 text-right font-medium">Pro</th>
                  <th className="pb-2 text-right font-medium">Elite</th>
                  <th className="pb-2 text-right font-medium">Résil.</th>
                </tr>
              </thead>
              <tbody>
                {metrics.monthly
                  .slice()
                  .reverse()
                  .map((m) => (
                    <tr key={m.month} className="border-t border-border">
                      <td className="py-1.5 tabular-nums text-text-secondary">
                        {new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" })}
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 tabular-nums text-text-primary">{m.signups}</span>
                          <span className="h-1.5 rounded-full bg-gold/70" style={{ width: `${(m.signups / maxSignups) * 100}%`, maxWidth: 120 }} />
                        </div>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-text-primary">{m.newPro}</td>
                      <td className="py-1.5 text-right tabular-nums text-text-primary">{m.newElite}</td>
                      <td className="py-1.5 text-right tabular-nums text-text-secondary">{m.cancellations}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <div className="flex flex-col gap-6">
          <AdminSection
            title={season ? `${season.name} : podium actuel` : "Saison"}
            action={
              <Link href="/app/admin/saisons" className="flex items-center gap-1 text-xs font-medium text-gold hover:text-gold-light">
                Gérer <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            {!season ? (
              <p className="text-xs text-text-muted">Aucune saison active.</p>
            ) : standings.length === 0 ? (
              <p className="text-xs text-text-muted">Personne n&apos;a encore marqué de points cette saison.</p>
            ) : (
              <ol className="flex flex-col gap-1.5 text-sm">
                {standings.map((s) => (
                  <li key={s.user_id} className="flex justify-between">
                    <span className="text-text-secondary">
                      <span className="mr-2 font-semibold tabular-nums text-gold">#{s.rank}</span>
                      {s.first_name} {s.last_name} <span className="text-text-muted">@{s.username}</span>
                    </span>
                    <span className="tabular-nums text-text-primary">{s.points} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </AdminSection>

          <AdminSection
            title="D'où viennent les inscrits"
            description={`${survey.length} réponse${survey.length > 1 ? "s" : ""} au questionnaire.`}
            action={
              <Link href="/app/admin/marketing" className="flex items-center gap-1 text-xs font-medium text-gold hover:text-gold-light">
                Détail <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <ul className="flex flex-col gap-1.5 text-xs">
              {discovery.rows
                .filter((r) => r.count > 0)
                .slice(0, 5)
                .map((r) => (
                  <li key={r.label} className="flex justify-between text-text-secondary">
                    <span>{r.label}</span>
                    <span className="tabular-nums text-text-primary">{r.count}</span>
                  </li>
                ))}
              {survey.length === 0 && <li className="text-text-muted">Aucune réponse pour l&apos;instant.</li>}
            </ul>
          </AdminSection>
        </div>
      </div>
    </div>
  );
}
