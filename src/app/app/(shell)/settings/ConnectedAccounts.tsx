"use client";

import { useEffect, useState, useTransition } from "react";
import { RefreshCw, Unlink, Link2, Crown, ShoppingBag, Landmark, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { ManualRevenueCard } from "./ManualRevenueCard";
import { connectShopifyAction, listBankInstitutionsAction, connectBankAction, syncBankAction, disconnectBankAction } from "./actions";
import type { VerificationStatus } from "@/types/database.types";
import type { RevenueDeclaration } from "@/services/revenue.service";

const BANK_COUNTRIES = [
  { value: "FR", label: "France" },
  { value: "DE", label: "Allemagne" },
  { value: "ES", label: "Espagne" },
  { value: "IT", label: "Italie" },
  { value: "NL", label: "Pays-Bas" },
  { value: "BE", label: "Belgique" },
  { value: "GB", label: "Royaume-Uni" },
];

export function ConnectedAccounts({
  connected,
  status,
  isCofounder,
  declarations,
  shopifyConnected,
  shopifyStatus,
  shopifyDomain,
  bankConnected,
  bankStatus,
  bankInstitutionName,
  bankRevenueSourceId,
}: {
  connected: boolean;
  status: VerificationStatus;
  isCofounder?: boolean;
  declarations: RevenueDeclaration[];
  shopifyConnected: boolean;
  shopifyStatus: VerificationStatus;
  shopifyDomain: string | null;
  bankConnected: boolean;
  bankStatus: VerificationStatus;
  bankInstitutionName: string | null;
  bankRevenueSourceId: string | null;
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

      <BankConnection
        connected={bankConnected}
        status={bankStatus}
        institutionName={bankInstitutionName}
        revenueSourceId={bankRevenueSourceId}
      />

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
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
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
      const result = await connectShopifyAction(shop, clientId, clientSecret);
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
          <div className="rounded border border-border bg-card p-3 text-xs leading-relaxed text-text-muted">
            <p className="font-medium text-text-secondary">Comment connecter ta boutique :</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>
                Sur{" "}
                <a
                  href="https://dev.shopify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  dev.shopify.com
                </a>
                , crée une app (nom libre, ex. « ASCEND »).
              </li>
              <li>
                Onglet <span className="text-text-secondary">Versions</span> : dans le champ « Portées », tape{" "}
                <span className="font-mono text-text-secondary">read_orders</span>, puis crée/publie la version.
              </li>
              <li>
                Clique sur le nom de l&apos;app en haut du menu pour revenir à son accueil, puis{" "}
                <span className="text-text-secondary">Installer l&apos;app</span> → sélectionne ta boutique →
                Installer.
              </li>
              <li>
                Onglet <span className="text-text-secondary">Paramètres de l&apos;appli</span> → section
                Identifiants : copie l&apos;ID client et le Secret ci-dessous.
              </li>
            </ol>
          </div>
          <Field label="Domaine de la boutique">
            <Input
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="ma-boutique.myshopify.com"
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="ID client">
              <Input value={clientId} onChange={(e) => setClientId(e.target.value)} required />
            </Field>
            <Field label="Secret">
              <Input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="shpss_..."
                required
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending || !shop.trim() || !clientId.trim() || !clientSecret.trim()}>
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

function BankConnection({
  connected,
  status,
  institutionName,
  revenueSourceId,
}: {
  connected: boolean;
  status: VerificationStatus;
  institutionName: string | null;
  revenueSourceId: string | null;
}) {
  const [country, setCountry] = useState("FR");
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([]);
  const [institutionId, setInstitutionId] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!showPicker) return;
    let cancelled = false;
    async function load() {
      setLoadingInstitutions(true);
      const result = await listBankInstitutionsAction(country);
      if (cancelled) return;
      if (result.success) {
        setInstitutions(result.data.map((i) => ({ id: i.id, name: i.name })));
        setInstitutionId(result.data[0]?.id ?? "");
      } else {
        toast.show(result.error, "error");
      }
      setLoadingInstitutions(false);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPicker, country]);

  function connect() {
    const institution = institutions.find((i) => i.id === institutionId);
    if (!institution) return;
    startTransition(async () => {
      const result = await connectBankAction(institution.id, institution.name);
      if (!result.success) return toast.show(result.error, "error");
      window.location.href = result.data.link;
    });
  }

  function sync() {
    if (!revenueSourceId) return;
    startTransition(async () => {
      const result = await syncBankAction(revenueSourceId);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Transactions synchronisées.", "success");
      router.refresh();
    });
  }

  function disconnect() {
    if (!revenueSourceId) return;
    startTransition(async () => {
      const result = await disconnectBankAction(revenueSourceId);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Compte bancaire déconnecté.", "success");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border-strong bg-card-elevated p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">Compte bancaire</p>
          {connected ? (
            <div className="mt-1">
              <VerificationBadge status={status} />
            </div>
          ) : (
            <p className="mt-1 text-xs text-text-muted">{institutionName ?? "Non connecté"}</p>
          )}
        </div>
        {connected ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button href="/app/settings/transactions" variant="secondary" size="sm">
              <ListChecks className="h-3.5 w-3.5" /> Mes transactions
            </Button>
            <Button variant="secondary" size="sm" onClick={sync} disabled={pending}>
              <RefreshCw className="h-3.5 w-3.5" /> Resynchroniser
            </Button>
            <Button variant="danger" size="sm" onClick={disconnect} disabled={pending}>
              <Unlink className="h-3.5 w-3.5" /> Déconnecter
            </Button>
          </div>
        ) : !showPicker ? (
          <Button size="sm" onClick={() => setShowPicker(true)} className="shrink-0">
            <Landmark className="h-3.5 w-3.5" /> Connecter
          </Button>
        ) : null}
      </div>

      {!connected && showPicker && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <p className="text-xs text-text-muted">
            Tu seras redirigé·e vers ta banque pour approuver l&apos;accès (lecture seule) — ASCEND ne voit
            jamais tes identifiants bancaires. Ensuite, tu choisis toi-même quelles transactions comptent
            comme du revenu.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Pays">
              <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                {BANK_COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Banque">
              <Select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} disabled={loadingInstitutions}>
                {loadingInstitutions && <option>Chargement...</option>}
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={connect} disabled={pending || !institutionId}>
              <Link2 className="h-3.5 w-3.5" /> Continuer vers ma banque
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowPicker(false)} disabled={pending}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
