"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Unlink, Link2, Crown, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { ManualRevenueCard } from "./ManualRevenueCard";
import { connectShopifyAction } from "./actions";
import type { VerificationStatus } from "@/types/database.types";
import type { RevenueDeclaration } from "@/services/revenue.service";

export function ConnectedAccounts({
  connected,
  status,
  isCofounder,
  declarations,
  shopifyConnected,
  shopifyStatus,
  shopifyDomain,
}: {
  connected: boolean;
  status: VerificationStatus;
  isCofounder?: boolean;
  declarations: RevenueDeclaration[];
  shopifyConnected: boolean;
  shopifyStatus: VerificationStatus;
  shopifyDomain: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function sync() {
    startTransition(async () => {
      const res = await fetch("/api/stripe/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) return toast.show(body.error ?? "La synchronisation a échoué.", "error");
      if (body.isFirstVerification) return router.push("/app/verification");
      toast.show(`${body.monthsSynced} mois de revenus synchronisés.`, "success");
      router.refresh();
    });
  }

  function connectPlatform() {
    startTransition(async () => {
      const res = await fetch("/api/stripe/connect-platform", { method: "POST" });
      const body = await res.json();
      if (!res.ok) return toast.show(body.error ?? "La synchronisation a échoué.", "error");
      if (body.isFirstVerification) return router.push("/app/verification");
      toast.show(`${body.monthsSynced} mois de revenus synchronisés.`, "success");
      router.refresh();
    });
  }

  function disconnect() {
    startTransition(async () => {
      const res = await fetch("/api/stripe/disconnect", { method: "POST" });
      if (!res.ok) return toast.show("Impossible de déconnecter Stripe.", "error");
      toast.show("Stripe déconnecté.", "success");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-md border border-border-strong bg-card-elevated p-4">
        <div>
          <p className="text-sm font-medium text-text-primary">Stripe</p>
          <div className="mt-1">
            <VerificationBadge status={status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Button variant="secondary" size="sm" onClick={sync} disabled={pending}>
                <RefreshCw className="h-3.5 w-3.5" /> Resynchroniser
              </Button>
              <Button variant="danger" size="sm" onClick={disconnect} disabled={pending}>
                <Unlink className="h-3.5 w-3.5" /> Déconnecter
              </Button>
            </>
          ) : isCofounder ? (
            <Button size="sm" onClick={connectPlatform} disabled={pending}>
              <Crown className="h-3.5 w-3.5" /> Synchroniser mes revenus ASCEND
            </Button>
          ) : (
            <Button href="/api/stripe/connect" size="sm">
              <Link2 className="h-3.5 w-3.5" /> Connecter
            </Button>
          )}
        </div>
      </div>

      <ShopifyConnection connected={shopifyConnected} status={shopifyStatus} domain={shopifyDomain} />

      <ManualRevenueCard declarations={declarations} />

      {(["PayPal", "Paddle"] as const).map((name) => (
        <div key={name} className="flex items-center justify-between rounded-md border border-border bg-card p-4 opacity-60">
          <p className="text-sm font-medium text-text-secondary">{name}</p>
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Bientôt disponible</span>
        </div>
      ))}
    </div>
  );
}

function ShopifyConnection({
  connected,
  status,
  domain,
}: {
  connected: boolean;
  status: VerificationStatus;
  domain: string | null;
}) {
  const [shop, setShop] = useState("");
  const [token, setToken] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function sync() {
    startTransition(async () => {
      const res = await fetch("/api/shopify/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) return toast.show(body.error ?? "La synchronisation a échoué.", "error");
      if (body.isFirstVerification) return router.push("/app/verification");
      toast.show(`${body.monthsSynced} mois de revenus synchronisés.`, "success");
      router.refresh();
    });
  }

  function disconnect() {
    startTransition(async () => {
      const res = await fetch("/api/shopify/disconnect", { method: "POST" });
      if (!res.ok) return toast.show("Impossible de déconnecter Shopify.", "error");
      toast.show("Shopify déconnecté.", "success");
      router.refresh();
    });
  }

  function connect(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await connectShopifyAction(shop, token);
      if (!result.success) return toast.show(result.error, "error");
      if (result.data.isFirstVerification) return router.push("/app/verification");
      toast.show(`Shopify connecté — ${result.data.monthsSynced} mois de revenus synchronisés.`, "success");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border-strong bg-card-elevated p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">Shopify</p>
          {connected ? (
            <div className="mt-1">
              <VerificationBadge status={status} />
            </div>
          ) : (
            <p className="mt-1 text-xs text-text-muted">{domain ?? "Non connecté"}</p>
          )}
        </div>
        {connected ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" onClick={sync} disabled={pending}>
              <RefreshCw className="h-3.5 w-3.5" /> Resynchroniser
            </Button>
            <Button variant="danger" size="sm" onClick={disconnect} disabled={pending}>
              <Unlink className="h-3.5 w-3.5" /> Déconnecter
            </Button>
          </div>
        ) : !showForm ? (
          <Button size="sm" onClick={() => setShowForm(true)} className="shrink-0">
            <ShoppingBag className="h-3.5 w-3.5" /> Connecter
          </Button>
        ) : null}
      </div>

      {!connected && showForm && (
        <form onSubmit={connect} className="flex flex-col gap-3 border-t border-border pt-3">
          <p className="text-xs leading-relaxed text-text-muted">
            Depuis ta boutique Shopify : Réglages → Apps et canaux de vente → Développer des apps → Créer une
            app. Donne-lui la permission de lecture <span className="font-mono text-text-secondary">read_orders</span>,
            installe-la, puis copie le jeton d&apos;accès API Admin généré ci-dessous.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Domaine de la boutique">
              <Input
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                placeholder="ma-boutique.myshopify.com"
                required
              />
            </Field>
            <Field label="Jeton d'accès API Admin">
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="shpat_..."
                required
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending || !shop.trim() || !token.trim()}>
              <Link2 className="h-3.5 w-3.5" /> Vérifier et connecter
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={pending}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
