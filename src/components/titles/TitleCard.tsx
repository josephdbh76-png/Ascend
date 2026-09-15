"use client";

import { useTransition } from "react";
import {
  Gem,
  Medal,
  Flame,
  Trophy,
  Hammer,
  Settings,
  Crown,
  Lock,
  Check,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { setActiveTitleAction } from "@/app/app/(shell)/titles/actions";
import type { TitleRarity } from "@/types/database.types";

const ICONS: Record<string, typeof Gem> = {
  gem: Gem,
  medal: Medal,
  flame: Flame,
  trophy: Trophy,
  hammer: Hammer,
  settings: Settings,
  crown: Crown,
};

const RARITY_STYLES: Record<TitleRarity, string> = {
  common: "border-border-strong text-text-secondary",
  rare: "border-info/40 text-info",
  epic: "border-exclusive/40 text-exclusive",
  legendary: "border-gold/50 text-gold",
  exclusive: "border-gold/60 text-gold",
};

const RARITY_LABELS: Record<TitleRarity, string> = {
  common: "commun",
  rare: "rare",
  epic: "épique",
  legendary: "légendaire",
  exclusive: "exclusif",
};

function requirementLabel(requirement: Record<string, unknown>): string | null {
  const type = requirement.type as string | undefined;
  if (type === "rank_threshold") return `Condition : classement top ${requirement.rank}`;
  if (type === "revenue_threshold") return `Condition : ${formatCurrency(requirement.cents as number)} de revenus mensuels`;
  if (type === "growth_threshold") return `Condition : +${requirement.percent} % de croissance`;
  if (type === "founding_member") return "Condition : faire partie des 500 premiers membres";
  if (type === "verification") return "Condition : vérifier ta première source de revenus";
  if (type === "consistency") return `Condition : ${requirement.days} jours de revenus vérifiés d'affilée`;
  return null;
}

export function TitleCard({
  id,
  name,
  description,
  icon,
  rarity,
  requirement,
  priceCents,
  remainingSupply,
  supply,
  owned,
  isActive,
  interactive = true,
}: {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: TitleRarity;
  requirement?: Record<string, unknown>;
  priceCents?: number | null;
  remainingSupply?: number | null;
  supply?: number | null;
  owned: boolean;
  isActive?: boolean;
  /** Set to false on someone else's profile — display only, no CTA. */
  interactive?: boolean;
}) {
  const Icon = ICONS[icon] ?? Gem;
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  // Purchasable is a mechanic (price_cents is only ever set on purchasable
  // titles); rarity is purely cosmetic and independent of it — a title can
  // be paid and still not be a 1-of-1 "exclusive".
  const isPurchasable = priceCents != null;
  const hasSupplyInfo = supply != null || isPurchasable;
  const soldOut = isPurchasable && supply != null && (remainingSupply ?? 0) <= 0 && !owned;
  const isScarce = supply != null && (remainingSupply ?? 0) / supply <= 0.2;

  function toggleActive() {
    startTransition(async () => {
      const result = await setActiveTitleAction(isActive ? null : id);
      if (!result.success) return toast.show(result.error, "error");
      toast.show(isActive ? "Titre retiré de ton profil." : "Titre affiché sur ton profil.", "success");
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-5 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)]",
        owned ? RARITY_STYLES[rarity] : "border-border opacity-80 hover:border-border-strong hover:opacity-100",
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            owned ? "bg-gold/10" : "bg-card-elevated",
          )}
        >
          {owned ? <Icon className="h-5 w-5 text-gold" /> : <Lock className="h-4 w-4 text-text-muted" />}
        </div>
        <span className={cn("text-[10px] font-semibold uppercase tracking-wide", owned ? RARITY_STYLES[rarity].split(" ")[1] : "text-text-muted")}>
          {RARITY_LABELS[rarity]}
        </span>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-tight text-text-primary">{name}</h3>
        <p className="mt-1 text-xs text-text-secondary">{description}</p>
        {requirement && requirementLabel(requirement) && (
          <p className="mt-2 text-[11px] text-text-muted">{requirementLabel(requirement)}</p>
        )}
      </div>

      {hasSupplyInfo && (
        <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className={cn("font-medium", isScarce ? "text-error" : "text-text-muted")}>
            {supply != null
              ? `${remainingSupply ?? 0} / ${supply} exemplaire${supply > 1 ? "s" : ""} restant${(remainingSupply ?? 0) > 1 ? "s" : ""}`
              : "Illimité"}
          </span>
          {isPurchasable && <span className="font-medium text-gold">{formatCurrency(priceCents!)}</span>}
        </div>
      )}

      {interactive && (
        <div className="mt-1">
          {owned ? (
            <Button
              variant={isActive ? "secondary" : "primary"}
              size="sm"
              className="w-full"
              onClick={toggleActive}
              disabled={pending}
            >
              {isActive ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Affiché sur ton profil
                </>
              ) : (
                "Afficher sur mon profil"
              )}
            </Button>
          ) : isPurchasable ? (
            <Button href={soldOut ? undefined : `/api/stripe/titles/checkout?title=${id}`} size="sm" className="w-full" disabled={soldOut}>
              {soldOut ? "Épuisé" : `Acheter — ${formatCurrency(priceCents!)}`}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" className="w-full" disabled>
              Verrouillé
            </Button>
          )}
        </div>
      )}
      {!interactive && owned && isActive && (
        <span className="flex items-center justify-center gap-1.5 rounded-md bg-card-elevated py-2 text-xs font-medium text-gold">
          <Check className="h-3.5 w-3.5" /> Titre actif
        </span>
      )}
    </div>
  );
}
