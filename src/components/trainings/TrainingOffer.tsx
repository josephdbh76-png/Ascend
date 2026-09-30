"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatPrice, trainingDiscountPercent } from "@/lib/trainings";

export interface TrainingOfferData {
  id: string;
  priceCents: number;
  memberPriceCents: number | null;
  promoCode: string | null;
  hasPromoCode: boolean;
  offerUnlocked: boolean;
  audience: "members" | "elite";
}

/**
 * Price and member offer. What a visitor sees depends on who they are:
 * the code for eligible members, the reason it is locked for the others.
 */
export function TrainingOffer({ training: t, signedIn }: { training: TrainingOfferData; signedIn: boolean }) {
  const [copied, setCopied] = useState(false);
  const discount = trainingDiscountPercent(t.priceCents, t.memberPriceCents);
  const hasOffer = t.memberPriceCents != null || t.hasPromoCode;
  const goHref = `/api/formations/${t.id}/go`;

  function copy() {
    if (!t.promoCode) return;
    navigator.clipboard.writeText(t.promoCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gold/30 bg-gold/5 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {t.memberPriceCents != null ? (t.audience === "elite" ? "Prix membres Elite" : "Prix membres ASCEND") : "Prix"}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-gold">
              {formatPrice(t.memberPriceCents ?? t.priceCents)}
            </span>
            {t.memberPriceCents != null && (
              <span className="text-sm text-text-muted line-through">{formatPrice(t.priceCents)}</span>
            )}
          </p>
        </div>
        {discount != null && (
          <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-[#0a0a0a]">-{discount} %</span>
        )}
      </div>

      {hasOffer && t.offerUnlocked && t.promoCode && (
        <button
          type="button"
          onClick={copy}
          className="flex items-center justify-between gap-3 rounded-md border-[1.5px] border-dashed border-gold/60 bg-black/30 px-4 py-3 text-left transition-colors hover:bg-black/45"
        >
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Ton code</span>
            <span className="font-mono text-base font-extrabold tracking-wide text-text-primary">{t.promoCode}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-gold">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié" : "Copier"}
          </span>
        </button>
      )}

      {hasOffer && !t.offerUnlocked && (
        <p className="flex items-start gap-2 text-sm text-text-secondary">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          {signedIn
            ? "Ce prix et le code sont réservés aux membres Elite."
            : "Ce prix et le code sont réservés aux membres ASCEND. L'inscription est gratuite."}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {hasOffer && !t.offerUnlocked ? (
          <>
            <Button href={signedIn ? "/app/settings#abonnement" : "/signup"} className="w-full">
              {signedIn ? "Débloquer avec Elite" : "Créer mon compte gratuit"}
            </Button>
            <Button href={goHref} variant="ghost" size="sm" className="w-full">
              Voir la formation au prix public <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Button href={goHref} className="w-full">
            Accéder à la formation <ArrowUpRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      {hasOffer && t.offerUnlocked && t.promoCode && (
        <p className="text-[11px] text-text-muted">Colle le code au moment du paiement sur le site de la formation.</p>
      )}
    </div>
  );
}
