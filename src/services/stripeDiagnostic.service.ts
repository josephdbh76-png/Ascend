import "server-only";
import type Stripe from "stripe";
import { getStripe, isStripeTestKey } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/utils";
import { LEGAL } from "@/lib/legal";

// Read-only health check of the Stripe setup, run from the admin with the
// production keys: account, prices, webhook, customer portal, sellers.
// Nothing here writes to Stripe.

export type CheckStatus = "ok" | "warn" | "error" | "info";

export interface DiagnosticCheck {
  group: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

const EXPECTED_PRICES: { env: string; label: string; amount: number; interval: "month" | "year" }[] = [
  { env: "STRIPE_PRICE_PRO", label: "Pro mensuel", amount: 1900, interval: "month" },
  { env: "STRIPE_PRICE_PRO_ANNUAL", label: "Pro annuel", amount: 19000, interval: "year" },
  { env: "STRIPE_PRICE_ELITE", label: "Elite mensuel", amount: 3900, interval: "month" },
  { env: "STRIPE_PRICE_ELITE_ANNUAL", label: "Elite annuel", amount: 35100, interval: "year" },
];

const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "invoice.paid",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const euros = (cents: number, currency = "eur") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

export async function runStripeDiagnostic(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = [];
  const add = (group: string, label: string, status: CheckStatus, detail: string) => checks.push({ group, label, status, detail });
  const appUrl = getAppUrl();

  // ---- configuration
  const key = process.env.STRIPE_SECRET_KEY;
  add("Configuration", "Clé Stripe", key ? (isStripeTestKey(key) ? "warn" : "ok") : "error", key ? (isStripeTestKey(key) ? "Mode test : aucun vrai paiement." : "Mode réel (live).") : "STRIPE_SECRET_KEY manquante.");
  add("Configuration", "Secret du webhook", process.env.STRIPE_WEBHOOK_SECRET ? "ok" : "error", process.env.STRIPE_WEBHOOK_SECRET ? "Configuré." : "STRIPE_WEBHOOK_SECRET manquant : les paiements ne seraient jamais enregistrés.");
  add("Configuration", "Connexion Stripe des membres (OAuth)", process.env.STRIPE_CLIENT_ID ? "ok" : "warn", process.env.STRIPE_CLIENT_ID ? "STRIPE_CLIENT_ID configuré." : "STRIPE_CLIENT_ID manquant : « Connecter Stripe » ne marche pas.");
  add("Configuration", "Adresse de l'application", appUrl.startsWith("https://") ? "ok" : "error", appUrl);
  if (!key) return checks;

  const stripe = getStripe();

  // ---- the ASCEND account itself
  try {
    const account = await stripe.accounts.retrieveCurrent();
    const due = [...(account.requirements?.currently_due ?? []), ...(account.requirements?.past_due ?? [])];
    add("Ton compte Stripe", "Paiements", account.charges_enabled ? "ok" : "error", account.charges_enabled ? "Activés." : "Désactivés : Stripe refuse les paiements.");
    add("Ton compte Stripe", "Versements vers ta banque", account.payouts_enabled ? "ok" : "error", account.payouts_enabled ? "Activés." : "Désactivés : l'argent reste bloqué chez Stripe.");
    add(
      "Ton compte Stripe",
      "Informations demandées par Stripe",
      due.length === 0 ? "ok" : "error",
      due.length === 0 ? "Rien à fournir pour l'instant." : `À fournir : ${due.join(", ")}.`,
    );
    const eventually = account.requirements?.eventually_due ?? [];
    if (eventually.length > 0) add("Ton compte Stripe", "À fournir plus tard", "info", eventually.join(", "));
    if (account.requirements?.disabled_reason) add("Ton compte Stripe", "Blocage", "error", account.requirements.disabled_reason);
    const bp = account.business_profile;
    add("Ton compte Stripe", "Nom public", bp?.name ? "ok" : "warn", bp?.name ?? "Aucun : les clients voient le nom par défaut.");
    add(
      "Ton compte Stripe",
      "Site web déclaré",
      bp?.url?.includes(new URL(appUrl).hostname) ? "ok" : "warn",
      bp?.url ? `${bp.url}${bp.url.includes(new URL(appUrl).hostname) ? "" : ` (le site actuel est ${appUrl})`}` : "Aucun.",
    );
    add(
      "Ton compte Stripe",
      "E-mail du support client",
      bp?.support_email?.toLowerCase() === LEGAL.contactEmail ? "ok" : "warn",
      bp?.support_email ? `${bp.support_email}${bp.support_email.toLowerCase() === LEGAL.contactEmail ? "" : ` (contact ASCEND : ${LEGAL.contactEmail})`}` : `Aucun (contact ASCEND : ${LEGAL.contactEmail}).`,
    );
    const descriptor = account.settings?.payments?.statement_descriptor;
    add(
      "Ton compte Stripe",
      "Libellé sur les relevés bancaires",
      descriptor?.toUpperCase().includes("ASCEND") ? "ok" : "warn",
      descriptor ? `« ${descriptor} »${descriptor.toUpperCase().includes("ASCEND") ? "" : " : un client qui ne reconnaît pas le libellé conteste plus souvent le paiement."}` : "Aucun.",
    );
    const branding = account.settings?.branding;
    add("Ton compte Stripe", "Logo et couleurs (pages de paiement, reçus)", branding?.icon || branding?.logo ? "ok" : "warn", branding?.icon || branding?.logo ? `Couleur principale ${branding?.primary_color ?? "par défaut"}.` : "Aucun logo : la page de paiement n'affiche pas l'identité ASCEND.");
    const schedule = account.settings?.payouts?.schedule;
    add("Ton compte Stripe", "Rythme des versements", "info", schedule ? `${schedule.interval}${schedule.delay_days != null ? `, ${schedule.delay_days} jours de délai` : ""}` : "Inconnu.");
    add("Ton compte Stripe", "Pays et devise", "info", `${account.country ?? "?"} · ${account.default_currency?.toUpperCase() ?? "?"}`);
  } catch (err) {
    add("Ton compte Stripe", "Lecture du compte", "error", err instanceof Error ? err.message : "Erreur inconnue.");
  }

  try {
    const balance = await stripe.balance.retrieve();
    const sum = (list: Stripe.Balance.Available[]) => list.map((b) => euros(b.amount, b.currency)).join(" + ") || "0 €";
    add("Ton compte Stripe", "Solde", "info", `Disponible ${sum(balance.available)} · en attente ${sum(balance.pending)}`);
  } catch {
    /* optional */
  }

  // ---- subscription prices
  for (const p of EXPECTED_PRICES) {
    const id = process.env[p.env];
    if (!id) {
      add("Abonnements", p.label, "error", `${p.env} manquant.`);
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(id, { expand: ["product"] });
      const product = price.product as Stripe.Product;
      const problems = [
        !price.active && "prix archivé",
        product && "active" in product && !product.active && "produit archivé",
        price.unit_amount !== p.amount && `montant ${euros(price.unit_amount ?? 0)} au lieu de ${euros(p.amount)}`,
        price.currency !== "eur" && `devise ${price.currency}`,
        price.recurring?.interval !== p.interval && `période ${price.recurring?.interval ?? "aucune"}`,
      ].filter(Boolean);
      add("Abonnements", p.label, problems.length ? "error" : "ok", problems.length ? problems.join(", ") : `${euros(price.unit_amount ?? 0)} / ${p.interval === "month" ? "mois" : "an"} · « ${product?.name ?? "?"} »`);
    } catch (err) {
      add("Abonnements", p.label, "error", err instanceof Error ? err.message : "Prix introuvable.");
    }
  }

  // ---- webhook
  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
    const target = `${appUrl}/api/stripe/webhook`;
    const ours = endpoints.data.filter((e) => e.url === target);
    if (ours.length === 0) {
      add("Webhook", "Adresse", "error", `Aucun webhook vers ${target}. Adresses trouvées : ${endpoints.data.map((e) => e.url).join(", ") || "aucune"}.`);
    } else {
      for (const e of ours) {
        const missing = e.enabled_events.includes("*") ? [] : WEBHOOK_EVENTS.filter((ev) => !e.enabled_events.includes(ev));
        add("Webhook", "Adresse", e.status === "enabled" ? "ok" : "error", `${e.url} · ${e.status === "enabled" ? "actif" : "désactivé"}`);
        add("Webhook", "Événements écoutés", missing.length ? "error" : "ok", missing.length ? `Manquent : ${missing.join(", ")}.` : "Tous les événements utiles sont reçus.");
      }
      if (ours.length > 1) add("Webhook", "Doublons", "warn", `${ours.length} webhooks vers la même adresse : chaque paiement serait traité plusieurs fois.`);
    }
    const others = endpoints.data.filter((e) => e.url !== target && e.status === "enabled");
    if (others.length) add("Webhook", "Autres webhooks actifs", "info", others.map((e) => e.url).join(", "));
  } catch (err) {
    add("Webhook", "Lecture", "error", err instanceof Error ? err.message : "Erreur inconnue.");
  }

  // ---- customer portal (change plan, cancel, card, invoices)
  try {
    const configs = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
    const c = configs.data[0];
    if (!c) {
      add("Portail client", "Configuration", "error", "Aucune : « Gérer mon abonnement » ne s'ouvre pas.");
    } else {
      const f = c.features;
      add("Portail client", "Changer d'offre (Pro ↔ Elite)", f.subscription_update.enabled ? "ok" : "warn", f.subscription_update.enabled ? `Autorisé, ${f.subscription_update.products?.length ?? 0} produit(s).` : "Désactivé : un Pro ne peut pas passer Elite tout seul.");
      add("Portail client", "Codes promo au changement d'offre", "info", "Stripe n'accepte un code que si l'option est activée dans les réglages du portail.");
      add("Portail client", "Résiliation", f.subscription_cancel.enabled ? "ok" : "warn", f.subscription_cancel.enabled ? `Autorisée (${f.subscription_cancel.mode === "at_period_end" ? "à la fin de la période" : "immédiate"}).` : "Désactivée : obligatoire en France de permettre la résiliation en ligne.");
      add("Portail client", "Changer de carte", f.payment_method_update.enabled ? "ok" : "warn", f.payment_method_update.enabled ? "Autorisé." : "Désactivé.");
      add("Portail client", "Factures", f.invoice_history.enabled ? "ok" : "warn", f.invoice_history.enabled ? "Visibles." : "Masquées.");
      add(
        "Portail client",
        "CGU et confidentialité",
        c.business_profile.terms_of_service_url && c.business_profile.privacy_policy_url ? "ok" : "warn",
        c.business_profile.terms_of_service_url && c.business_profile.privacy_policy_url
          ? `${c.business_profile.terms_of_service_url} · ${c.business_profile.privacy_policy_url}`
          : `À renseigner : ${appUrl}/legal/terms et ${appUrl}/legal/privacy.`,
      );
    }
  } catch (err) {
    add("Portail client", "Lecture", "error", err instanceof Error ? err.message : "Erreur inconnue.");
  }

  // ---- connected accounts (sellers and members who connected Stripe)
  try {
    const admin = createAdminClient();
    const { data: sellers } = await admin.from("seller_accounts").select("stripe_account_id, payouts_enabled, profiles(username)");
    const known = new Map((sellers ?? []).map((s) => [s.stripe_account_id, s]));
    const accounts: Stripe.Account[] = [];
    for await (const a of stripe.accounts.list({ limit: 100 })) {
      accounts.push(a);
      if (accounts.length >= 200) break;
    }
    add("Comptes connectés", "Total", "info", `${accounts.length} compte(s) relié(s) à ASCEND.`);
    for (const a of accounts) {
      const seller = known.get(a.id);
      const dashboard = a.controller?.stripe_dashboard?.type ?? a.type ?? "?";
      const due = [...(a.requirements?.currently_due ?? []), ...(a.requirements?.past_due ?? [])];
      const who = seller ? `vendeur @${(seller.profiles as unknown as { username: string } | null)?.username ?? "?"}` : "pas un vendeur ASCEND (compte relié pour la vérification de revenus, ou ancien test)";
      const status: CheckStatus = seller ? (a.payouts_enabled ? "ok" : "warn") : "info";
      add(
        "Comptes connectés",
        `${a.business_profile?.name || a.email || a.id}`,
        status,
        `${a.id} · ${who} · accès Stripe : ${dashboard === "express" ? "Express" : dashboard === "full" || dashboard === "standard" ? "complet" : dashboard} · paiements ${a.charges_enabled ? "oui" : "non"}, versements ${a.payouts_enabled ? "oui" : "non"}${due.length ? ` · à fournir : ${due.slice(0, 4).join(", ")}${due.length > 4 ? "…" : ""}` : ""}${seller && seller.payouts_enabled !== a.payouts_enabled ? " · ASCEND n'est pas à jour (se corrige à la prochaine visite du vendeur)" : ""}`,
      );
    }
    for (const [id, s] of known) {
      if (!accounts.some((a) => a.id === id)) {
        add("Comptes connectés", `Vendeur @${(s.profiles as unknown as { username: string } | null)?.username ?? "?"}`, "error", `${id} enregistré dans ASCEND mais introuvable chez Stripe.`);
      }
    }
  } catch (err) {
    add("Comptes connectés", "Lecture", "error", err instanceof Error ? err.message : "Erreur inconnue.");
  }

  // ---- promo codes
  try {
    const codes = await stripe.promotionCodes.list({ active: true, limit: 100 });
    add("Codes promo", "Codes actifs", "info", codes.data.map((c) => c.code).join(", ") || "Aucun.");
  } catch {
    /* optional */
  }

  return checks;
}
