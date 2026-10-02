"use client";

import { useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { TitleCard } from "@/components/titles/TitleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MarketplaceTab } from "./MarketplaceTab";
import { BETA_COPY } from "@/lib/beta";
import { Gem, ShoppingBag, UserRound, Repeat } from "lucide-react";
import type { TitleRow, EarnedTitle } from "@/types";
import { titleSaleState } from "@/lib/titleSale";
import type { SubscriptionTier } from "@/types/database.types";
import type {
  SellerAccountStatus,
  TradeableOwnedTitle,
  MarketplaceListing,
  TitleMarketStats,
} from "@/services/marketplace.service";

// Says what the shop is for — owning a scarce title and being free to resell
// it — without ever promising a gain: presenting a purchase by its possible
// financial return falls under the AMF's "biens divers" rules (CMF L551-1).
const BOUTIQUE_STEPS = [
  { icon: ShoppingBag, title: "Achète", text: "Les éditions limitées ne sont jamais rééditées : épuisées, ASCEND n'en vend plus." },
  { icon: UserRound, title: "Affiche", text: "Il apparaît à côté de ton nom, sur ton profil et dans le Réseau." },
  { icon: Repeat, title: "Revends", text: "Quand tu veux, sur le Marché, au prix que tu fixes." },
];

const TABS = [
  { value: "owned", label: "Obtenus" },
  { value: "available", label: "À débloquer" },
  { value: "exclusive", label: "Boutique" },
  { value: "market", label: "Marché" },
];

export function TitlesTabs({
  catalog,
  owned,
  completionRates,
  sellerStatus,
  tradeableTitles,
  myListings,
  activeListings,
  recentSales,
  username,
  paymentsClosed = false,
  payoutsPanel,
  memberTier,
  marketStats = {},
}: {
  /** Active sellers: their balance and payouts, rendered on the server. */
  payoutsPanel?: ReactNode;
  memberTier?: SubscriptionTier;
  marketStats?: Record<string, TitleMarketStats>;
  username: string;
  /** Beta: paid titles and the Marché are closed. */
  paymentsClosed?: boolean;
  catalog: TitleRow[];
  owned: EarnedTitle[];
  completionRates?: Record<string, number>;
  sellerStatus: SellerAccountStatus;
  tradeableTitles: TradeableOwnedTitle[];
  myListings: MarketplaceListing[];
  activeListings: MarketplaceListing[];
  recentSales: MarketplaceListing[];
}) {
  // A new member owns nothing yet: open on the collection they can act on.
  const initialTab = owned.length > 0 ? "owned" : "exclusive";
  const [tab, setTab] = useState(initialTab);
  const ownedIds = new Set(owned.map((o) => o.id));
  const ownedByid = new Map(owned.map((o) => [o.id, o]));

  const ownedTitles = catalog.filter((t) => ownedIds.has(t.id));
  const availableTitles = catalog.filter((t) => t.type === "earned" && !ownedIds.has(t.id));
  // Timed sales first (the clock is the point), gone-for-good last, then by price.
  const shelf = (t: TitleRow) => {
    const sale = titleSaleState(t);
    if (sale.kind === "ended" || (t.supply != null && (t.remaining_supply ?? 0) <= 0)) return 3;
    if (sale.kind === "open") return 0;
    if (sale.kind === "atLaunch" || sale.kind === "upcoming") return 1;
    return 2;
  };
  const exclusiveTitles = catalog
    .filter((t) => t.type === "purchasable")
    .sort((a, b) => shelf(a) - shelf(b) || (b.price_cents ?? 0) - (a.price_cents ?? 0));

  const lists: Record<string, TitleRow[]> = {
    owned: ownedTitles,
    available: availableTitles,
    exclusive: exclusiveTitles,
  };

  const current = lists[tab];

  return (
    <div className="flex flex-col gap-6">
      <Tabs items={TABS} value={tab} onChange={setTab} className="sm:w-fit" />

      {tab === "exclusive" && exclusiveTitles.length > 0 && (
        <div className="flex flex-col gap-3">
          {paymentsClosed && (
            <p className="rounded-md border border-gold/25 bg-gold/5 px-4 py-3 text-xs text-text-secondary">{BETA_COPY.titles}</p>
          )}
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {BOUTIQUE_STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10">
                  <Icon className="h-3.5 w-3.5 text-gold" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-text-primary">
                    {i + 1}. {title}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tab === "market" ? (
        <MarketplaceTab
          paymentsClosed={paymentsClosed}
          payoutsPanel={payoutsPanel}
          marketStats={marketStats}
          sellerStatus={sellerStatus}
          tradeableTitles={tradeableTitles}
          myListings={myListings}
          activeListings={activeListings}
          recentSales={recentSales}
        />
      ) : current.length === 0 ? (
        <EmptyState
          icon={Gem}
          title={tab === "owned" ? "Aucun titre obtenu pour l'instant." : "Rien ici pour le moment."}
          description={tab === "owned" ? "Progresse sur ASCEND pour débloquer tes premiers titres." : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((t) => (
            <TitleCard
              key={t.id}
              id={t.id}
              name={t.name}
              description={t.description}
              icon={t.icon}
              rarity={t.rarity}
              requirement={t.requirement}
              priceCents={t.price_cents}
              supply={t.supply}
              remainingSupply={t.remaining_supply}
              tradeable={t.tradeable}
              owned={ownedIds.has(t.id)}
              isActive={ownedByid.get(t.id)?.isActive}
              completionRate={completionRates?.[t.id]}
              shareUsername={ownedIds.has(t.id) ? username : undefined}
              paymentsClosed={paymentsClosed}
              editionNumber={ownedByid.get(t.id)?.editionNumber}
              saleWindow={t}
              requiredTier={t.required_tier}
              memberTier={memberTier}
              market={marketStats[t.id]}
              onShowMarket={() => {
                setTab("market");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
