"use client";

import { useState, useTransition } from "react";
import { ShoppingBag, Tag, TrendingUp, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn, formatCurrency, timeAgo } from "@/lib/utils";
import { TITLE_ICONS, TITLE_RARITY_STYLES, TITLE_RARITY_LABELS } from "@/lib/titleDisplay";
import { createListingAction, cancelListingAction } from "./actions";
import type { SellerAccountStatus, TradeableOwnedTitle, MarketplaceListing } from "@/services/marketplace.service";

function TitleBadge({ icon, rarity }: { icon: string; rarity: keyof typeof TITLE_RARITY_STYLES }) {
  const Icon = TITLE_ICONS[icon] ?? TITLE_ICONS.gem;
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", TITLE_RARITY_STYLES[rarity])}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function MarketplaceTab({
  sellerStatus,
  tradeableTitles,
  myListings,
  activeListings,
  recentSales,
}: {
  sellerStatus: SellerAccountStatus;
  tradeableTitles: TradeableOwnedTitle[];
  myListings: MarketplaceListing[];
  activeListings: MarketplaceListing[];
  recentSales: MarketplaceListing[];
}) {
  const [items, setItems] = useState(tradeableTitles);
  const [listings, setListings] = useState(myListings);
  const [modalTitle, setModalTitle] = useState<TradeableOwnedTitle | null>(null);
  const [price, setPrice] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const activeMyListings = listings.filter((l) => l.status === "active");
  const soldMyListings = listings.filter((l) => l.status === "sold");

  function submitListing(e: React.FormEvent) {
    e.preventDefault();
    if (!modalTitle) return;
    const priceCents = Math.round(Number(price) * 100);
    startTransition(async () => {
      const result = await createListingAction(modalTitle.userTitleId, priceCents);
      if (!result.success) return toast.show(result.error, "error");
      setItems((prev) => prev.filter((t) => t.userTitleId !== modalTitle.userTitleId));
      setListings((prev) => [
        {
          id: `optimistic-${modalTitle.userTitleId}`,
          titleId: modalTitle.titleId,
          titleName: modalTitle.name,
          titleIcon: modalTitle.icon,
          titleRarity: modalTitle.rarity,
          sellerId: "",
          sellerUsername: "",
          priceCents,
          status: "active",
          createdAt: new Date().toISOString(),
          soldAt: null,
        },
        ...prev,
      ]);
      toast.show("Annonce publiée.", "success");
      setModalTitle(null);
      setPrice("");
    });
  }

  function cancel(listingId: string) {
    startTransition(async () => {
      const result = await cancelListingAction(listingId);
      if (!result.success) return toast.show(result.error, "error");
      setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, status: "cancelled" } : l)));
      toast.show("Annonce annulée.", "success");
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {!sellerStatus.payoutsEnabled && (
        <div className="flex flex-col items-start gap-3 rounded-md border border-gold/30 bg-gold/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">
            {sellerStatus.connected
              ? "Configuration de ton compte de paiement en attente — termine-la pour pouvoir vendre."
              : "Configure un compte de paiement (Stripe) pour pouvoir vendre tes titres et recevoir de l'argent."}
          </p>
          <Button href="/api/marketplace/connect" size="sm" className="shrink-0">
            {sellerStatus.connected ? "Terminer la configuration" : "Configurer mon compte vendeur"}
          </Button>
        </div>
      )}

      {recentSales.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            <TrendingUp className="h-3.5 w-3.5 text-gold" /> Ventes récentes
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentSales.map((s) => (
              <div
                key={s.id}
                className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-text-secondary"
              >
                <TitleBadge icon={s.titleIcon} rarity={s.titleRarity} />
                <span>
                  <span className="font-medium text-text-primary">{s.titleName}</span> vendu{" "}
                  {formatCurrency(s.priceCents)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Mes titres à vendre</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <div key={t.userTitleId} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <TitleBadge icon={t.icon} rarity={t.rarity} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-muted">{TITLE_RARITY_LABELS[t.rarity]}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setModalTitle(t)} disabled={!sellerStatus.payoutsEnabled}>
                  <Tag className="h-3.5 w-3.5" /> Vendre
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {(activeMyListings.length > 0 || soldMyListings.length > 0) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Mes annonces</h2>
          <div className="flex flex-col gap-2">
            {[...activeMyListings, ...soldMyListings].map((l) => (
              <div
                key={l.id}
                className="flex flex-col items-start gap-2 rounded-md border border-border-strong bg-card-elevated p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <TitleBadge icon={l.titleIcon} rarity={l.titleRarity} />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{l.titleName}</p>
                    <p className="text-xs text-text-muted">
                      {formatCurrency(l.priceCents)} —{" "}
                      {l.status === "sold" ? "Vendu" : l.status === "cancelled" ? "Annulée" : "En vente"}
                    </p>
                  </div>
                </div>
                {l.status === "active" && (
                  <Button variant="ghost" size="sm" onClick={() => cancel(l.id)} disabled={pending}>
                    <X className="h-3.5 w-3.5" /> Annuler
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Marché</h2>
        {activeListings.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Aucune annonce active pour l'instant." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeListings.map((l) => (
              <div key={l.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <TitleBadge icon={l.titleIcon} rarity={l.titleRarity} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{l.titleName}</p>
                    <p className="text-xs text-text-muted">
                      par @{l.sellerUsername} · {TITLE_RARITY_LABELS[l.titleRarity]}
                    </p>
                  </div>
                </div>
                <p className="flex items-center gap-1 text-[11px] text-text-muted">
                  <Clock className="h-3 w-3" /> Mis en vente {timeAgo(l.createdAt)}
                </p>
                <Button href={`/api/marketplace/checkout?listing=${l.id}`} size="sm">
                  Acheter — {formatCurrency(l.priceCents)}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal open={modalTitle !== null} onClose={() => setModalTitle(null)} title={`Vendre « ${modalTitle?.name ?? ""} »`}>
        <form onSubmit={submitListing} className="flex flex-col gap-4">
          <Field label="Prix de vente (€)" hint="La commission ASCEND (5 à 10% selon le prix) est prélevée automatiquement.">
            <Input type="number" min={1} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required autoFocus />
          </Field>
          <Button type="submit" disabled={pending || !price || Number(price) <= 0} className="self-start">
            Publier l&apos;annonce
          </Button>
        </form>
      </Modal>
    </div>
  );
}
