import { CalendarClock, ExternalLink, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/LoadingState";
import { getSellerPayoutSummary, type SellerPayoutSummary } from "@/services/marketplace.service";
import { SELLER_PAYOUT_DAY, exactEuros, formatPayoutDate } from "@/lib/sellerPayouts";
import { cn } from "@/lib/utils";

const PAYOUT_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Versé", className: "text-success" },
  in_transit: { label: "En route vers ta banque", className: "text-text-secondary" },
  pending: { label: "En préparation", className: "text-text-secondary" },
  failed: { label: "Échoué, vérifie ton IBAN", className: "text-error" },
  canceled: { label: "Annulé", className: "text-text-muted" },
};

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Wallet className="h-4 w-4 text-gold" /> Mes versements
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Tes ventes sont versées sur ton compte bancaire <span className="font-medium text-text-primary">une fois par mois, le {SELLER_PAYOUT_DAY}</span>.
          </p>
        </div>
        <Button href="/api/marketplace/dashboard" variant="secondary" size="sm" className="shrink-0">
          <ExternalLink className="h-3.5 w-3.5" /> IBAN et relevés
        </Button>
      </div>
      {children}
    </section>
  );
}

export function SellerPayoutsSkeleton() {
  return (
    <Shell>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </Shell>
  );
}

function Amount({ label, value, hint, accent }: { label: string; value: number; hint: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-md border p-3", accent ? "border-gold/30 bg-gold/5" : "border-border-strong bg-card-elevated")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums tracking-tight", accent ? "text-gold" : "text-text-primary")}>
        {exactEuros(value)}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">{hint}</p>
    </div>
  );
}

/** Live balance of an active seller, read from their Stripe account. */
export async function SellerPayoutsPanel({ userId }: { userId: string }) {
  let summary: SellerPayoutSummary | null = null;
  try {
    summary = await getSellerPayoutSummary(userId);
  } catch (err) {
    console.error("[marketplace] seller payout summary:", err);
  }
  return <SellerPayoutsView summary={summary} />;
}

export function SellerPayoutsView({ summary }: { summary: SellerPayoutSummary | null }) {
  if (!summary) {
    return (
      <Shell>
        <p className="text-xs text-text-muted">
          Ton solde n&apos;a pas pu être chargé pour le moment. Tu le retrouves aussi dans « IBAN et relevés ».
        </p>
      </Shell>
    );
  }

  const next = formatPayoutDate(summary.nextPayoutDate);
  const later = formatPayoutDate(summary.laterPayoutDate);

  return (
    <Shell>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Amount label={`Prochain versement · ${next}`} value={summary.nextPayoutCents} hint="Montant estimé, déjà net de la commission." accent />
        <Amount label="Disponible" value={summary.availableCents} hint={`Paiements validés, versés le ${next}.`} />
        <Amount
          label="En cours de validation"
          value={summary.pendingCents}
          hint="Stripe valide chaque paiement quelques jours après la vente."
        />
      </div>

      {summary.laterCents > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-text-secondary">
          <CalendarClock className="mt-px h-3.5 w-3.5 shrink-0 text-text-muted" />
          {exactEuros(summary.laterCents)} seront validés après le {next} : ils partiront avec le versement du {later}.
        </p>
      )}

      {summary.recentPayouts.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Derniers versements</p>
          {summary.recentPayouts.map((p) => {
            const status = PAYOUT_STATUS[p.status] ?? { label: p.status, className: "text-text-muted" };
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="shrink-0 whitespace-nowrap text-text-secondary">{shortDate(p.arrivalDate)}</span>
                <span className={cn("ml-auto text-right text-xs", status.className)}>{status.label}</span>
                <span className="w-20 shrink-0 text-right font-medium tabular-nums text-text-primary">{exactEuros(p.amountCents)}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-text-muted">
        Le virement part le {SELLER_PAYOUT_DAY} et arrive en général sous 1 à 3 jours ouvrés (un peu plus si le {SELLER_PAYOUT_DAY} tombe un week-end ou un jour férié).
      </p>
    </Shell>
  );
}
