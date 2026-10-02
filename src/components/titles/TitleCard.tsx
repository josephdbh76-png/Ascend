"use client";

import { useTransition } from "react";
import { Gem, Lock, Check, ShieldCheck, Repeat, Timer, Store } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { SaleCountdown } from "@/components/titles/SaleCountdown";
import { formatEdition, formatSaleDay, titleSaleState, type TitleSaleWindow } from "@/lib/titleSale";
import type { TitleMarketStats } from "@/services/marketplace.service";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { setActiveTitleAction } from "@/app/app/(shell)/titles/actions";
import { ShareCardButton } from "@/components/achievements/ShareCardButton";
import { TITLE_ICONS as ICONS, TITLE_RARITY_STYLES as RARITY_STYLES, TITLE_RARITY_LABELS as RARITY_LABELS } from "@/lib/titleDisplay";
import { normalizeRequirement, describeCondition } from "@/lib/conditions";
import type { SubscriptionTier, TitleRarity } from "@/types/database.types";

const NO_WINDOW: TitleSaleWindow = { sale_starts_at: null, sale_ends_at: null, launch_sale_days: null };

function hasTier(member: SubscriptionTier | undefined, required: "pro" | "elite"): boolean {
  return required === "elite" ? member === "elite" : member === "pro" || member === "elite";
}

function requirementLabel(requirement: Record<string, unknown>): string | null {
  const condition = normalizeRequirement(requirement);
  if (!condition) return null;
  if (condition.type === "season_reward") return "Récompense de fin de saison";
  if (condition.type === "manual") return "Remis par l'équipe ASCEND";
  const text = describeCondition(condition.type, condition.target);
  return text ? `Condition : ${text.charAt(0).toLowerCase()}${text.slice(1)}` : null;
}

function supplyLabel(supply: number, remaining: number): string {
  if (remaining <= 0) return "Épuisé";
  if (supply === 1) return "Exemplaire unique";
  if (remaining / supply <= 0.2) return `Plus que ${remaining} exemplaire${remaining > 1 ? "s" : ""}`;
  return `${remaining} / ${supply} disponibles`;
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
  tradeable = false,
  owned,
  isActive,
  interactive = true,
  completionRate,
  shareUsername,
  paymentsClosed = false,
  editionNumber,
  saleWindow = NO_WINDOW,
  requiredTier = null,
  memberTier,
  market,
  onShowMarket,
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
  tradeable?: boolean;
  owned: boolean;
  isActive?: boolean;
  /** Set to false on someone else's profile — display only, no CTA. */
  interactive?: boolean;
  /** % of (non-demo) members who own this title — social proof. */
  completionRate?: number;
  /** Owner's username: shows the share button on an owned title. */
  shareUsername?: string;
  /** Beta: paid titles are not on sale. */
  paymentsClosed?: boolean;
  /** The owner's copy number, for limited titles. */
  editionNumber?: number | null;
  saleWindow?: TitleSaleWindow;
  /** Boutique only: plan needed to buy it. */
  requiredTier?: "pro" | "elite" | null;
  /** The viewer's plan, to say whether they can buy a members-only title. */
  memberTier?: SubscriptionTier;
  /** What this title trades at on the Marché. */
  market?: TitleMarketStats;
  /** Switches to the Marché tab, where a sold-out title can still be found. */
  onShowMarket?: () => void;
}) {
  const Icon = ICONS[icon] ?? Gem;
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  // Purchasable is a mechanic (price_cents is only ever set on purchasable
  // titles); rarity is purely cosmetic and independent of it.
  const isPurchasable = priceCents != null;
  const remaining = remainingSupply ?? 0;
  const soldOut = isPurchasable && supply != null && remaining <= 0 && !owned;
  const sold = supply != null ? Math.max(0, supply - remaining) : 0;
  const isScarce = supply != null && (supply === 1 || remaining / supply <= 0.2);
  const sale = titleSaleState(saleWindow);
  const saleEnded = isPurchasable && sale.kind === "ended";
  const notStarted = sale.kind === "atLaunch" || sale.kind === "upcoming";
  // Gone from the Boutique for good: the Marché is the only way left.
  const onlyOnMarket = (soldOut || saleEnded) && !owned;
  const tierLabel = requiredTier === "elite" ? "Elite" : "Pro";
  const lacksTier = requiredTier != null && !hasTier(memberTier, requiredTier);
  // Shop items look like what they are (collectibles), not like locked content.
  const showcase = owned || isPurchasable;

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
        "relative flex flex-col gap-3 overflow-hidden rounded-lg border bg-card p-5 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)]",
        showcase ? RARITY_STYLES[rarity] : "border-border opacity-80 hover:border-border-strong hover:opacity-100",
        soldOut && "opacity-60",
      )}
    >
      {isPurchasable && !owned && (rarity === "exclusive" || rarity === "legendary") && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 bg-[radial-gradient(closest-side,rgba(214,168,79,0.18),transparent)]"
        />
      )}

      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            showcase ? "bg-gold/10" : "bg-card-elevated",
          )}
        >
          {showcase ? <Icon className="h-5 w-5 text-gold" /> : <Lock className="h-4 w-4 text-text-muted" />}
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wide",
            showcase ? RARITY_STYLES[rarity].split(" ")[1] : "text-text-muted",
          )}
        >
          {RARITY_LABELS[rarity]}
        </span>
      </div>

      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-tight text-text-primary">{name}</h3>
          {owned && shareUsername && (
            <ShareCardButton target={{ kind: "title", username: shareUsername, id }} itemName={name} label="Partager" />
          )}
        </div>
        {owned && editionNumber != null && (
          <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-gold">Exemplaire {formatEdition(editionNumber, supply)}</p>
        )}
        <p className="mt-1 text-xs text-text-secondary">{description}</p>
        {requirement && requirementLabel(requirement) && (
          <p className="mt-2 text-[11px] text-text-muted">{requirementLabel(requirement)}</p>
        )}
        {completionRate != null && !isPurchasable && (
          <p className="mt-2 text-[11px] text-text-muted">
            {completionRate < 0.1 && completionRate > 0
              ? "< 0,1 % des entrepreneurs l'ont obtenu"
              : `${completionRate.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % des entrepreneurs l'ont obtenu`}
          </p>
        )}
      </div>

      {isPurchasable && (
        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-semibold tabular-nums text-text-primary">{formatCurrency(priceCents!)}</span>
            <span className={cn("text-xs font-medium", isScarce && !soldOut && !saleEnded ? "text-error" : "text-text-muted")}>
              {saleEnded ? "Vente terminée" : supply != null ? supplyLabel(supply, remaining) : "Édition ouverte"}
            </span>
          </div>
          {supply != null && supply > 1 && !saleEnded && (
            <div className="h-1 overflow-hidden rounded-full bg-border" aria-hidden>
              <div className="h-1 rounded-full bg-gold" style={{ width: `${Math.round((sold / supply) * 100)}%` }} />
            </div>
          )}
          {sold > 0 && supply != null && supply > 1 && (
            <p className="text-[11px] text-text-muted">
              {saleEnded
                ? `${sold} exemplaire${sold > 1 ? "s" : ""} en circulation, jamais réédité${sold > 1 ? "s" : ""}`
                : `${sold} déjà vendu${sold > 1 ? "s" : ""}`}
            </p>
          )}
          {!owned && sale.kind === "atLaunch" && (
            <p className="flex items-center gap-1 text-xs font-medium text-gold">
              <Timer className="h-3.5 w-3.5 shrink-0" /> En vente {sale.days} jours seulement, dès le lancement
            </p>
          )}
          {!owned && sale.kind === "upcoming" && (
            <p className="flex items-center gap-1 text-xs font-medium text-gold">
              <Timer className="h-3.5 w-3.5 shrink-0" /> En vente à partir du {formatSaleDay(sale.startsAt)}
            </p>
          )}
          {!owned && !soldOut && sale.kind === "open" &&
            (paymentsClosed ? (
              <p className="flex items-center gap-1 text-xs font-medium text-gold">
                <Timer className="h-3.5 w-3.5 shrink-0" /> En vente jusqu&apos;au {formatSaleDay(sale.endsAt)} seulement
              </p>
            ) : (
              <SaleCountdown endsAt={sale.endsAt} />
            ))}
          {!owned && requiredTier && (
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-gold">
              <Lock className="h-3 w-3" /> Réservé aux membres {tierLabel} en boutique
            </p>
          )}
          {/* An open edition is always in stock: reselling it means nothing. */}
          {tradeable && supply != null && (
            <p className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <Repeat className="h-3 w-3 text-gold" />
              {owned ? "Tu peux le revendre sur le Marché, au prix que tu fixes." : "Revendable sur le Marché, au prix que tu fixes."}
            </p>
          )}
          {onlyOnMarket && tradeable && (
            <p className="flex items-start gap-1.5 text-[11px] text-text-secondary">
              <Store className="mt-px h-3 w-3 shrink-0 text-gold" />
              {market?.listedCount
                ? `Sur le Marché : ${market.listedCount} en vente dès ${formatCurrency(market.floorCents!)}${market.lastSaleCents != null ? ` · dernière vente ${formatCurrency(market.lastSaleCents)}` : ""}.`
                : market?.lastSaleCents != null
                  ? `Aucun exemplaire en vente sur le Marché pour l'instant · dernière vente ${formatCurrency(market.lastSaleCents)}.`
                  : "Aucun exemplaire en vente sur le Marché pour l'instant."}
            </p>
          )}
        </div>
      )}

      {interactive && (
        <div className={cn(!isPurchasable && "mt-auto")}>
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
          ) : isPurchasable && onlyOnMarket ? (
            onShowMarket && tradeable ? (
              <Button size="sm" variant="secondary" className="w-full" onClick={onShowMarket}>
                <Store className="h-3.5 w-3.5" /> Voir le Marché
              </Button>
            ) : (
              <Button size="sm" variant="secondary" className="w-full" disabled>
                {saleEnded ? "Vente terminée" : "Épuisé"}
              </Button>
            )
          ) : isPurchasable && paymentsClosed ? (
            <>
              <Button size="sm" variant="secondary" className="w-full" disabled>
                En vente au lancement
              </Button>
              <p className="mt-2 text-center text-[10px] text-text-muted">Aucun paiement pendant la bêta.</p>
            </>
          ) : isPurchasable && notStarted ? (
            <Button size="sm" variant="secondary" className="w-full" disabled>
              Bientôt en vente
            </Button>
          ) : isPurchasable && lacksTier ? (
            <Button href="/app/settings#abonnement" size="sm" variant="secondary" className="w-full">
              Passer {tierLabel} pour l&apos;obtenir
            </Button>
          ) : isPurchasable ? (
            <>
              <Button href={`/api/stripe/titles/checkout?title=${id}`} size="sm" className="w-full">
                Obtenir ce titre
              </Button>
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-text-muted">
                <ShieldCheck className="h-3 w-3" /> Paiement sécurisé par Stripe
              </p>
            </>
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
