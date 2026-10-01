import "server-only";
import { minorUnitFactor } from "@/lib/fx";
import { assertPublicHttpsUrl } from "@/lib/safeUrl";
import { callApi, required, toMinor, MAX_PAGES, type ConnectorImpl, type Fields, type RawMovement } from "./shared";
import { monthsFromMovements } from "./months";

// Mollie, Paddle, Gumroad, Whop and WooCommerce: each one lists sales with
// the member's own key. What counts is what the business kept: refunds and
// chargebacks come off, test data never counts, everything ends up in euros.

// ---------------------------------------------------------------- Mollie

type MolliePayment = {
  status: string;
  mode?: string;
  createdAt: string;
  paidAt?: string | null;
  customerId?: string | null;
  amount: { value: string; currency: string };
  amountRefunded?: { value: string; currency: string };
  amountChargedBack?: { value: string; currency: string };
};

function mollieKey(fields: Fields) {
  const key = required(fields, "apiKey", "ta clé API Mollie");
  if (key.startsWith("test_")) throw new Error("Utilise ta clé Live (live_...) : les paiements de test ne comptent pas.");
  if (!key.startsWith("live_")) throw new Error("La clé Mollie commence par live_. Copie-la depuis Développeurs → Clés API.");
  return key;
}

export const mollie: ConnectorImpl = {
  async validate(fields) {
    const key = mollieKey(fields);
    await callApi("Mollie", "https://api.mollie.com/v2/payments?limit=1", { headers: { Authorization: `Bearer ${key}` } });
    const profile = await callApi("Mollie", "https://api.mollie.com/v2/profiles/me", { headers: { Authorization: `Bearer ${key}` } })
      .then((r) => r.json() as Promise<{ name?: string }>)
      .catch(() => null);
    return { accountLabel: profile?.name ?? null };
  },
  async fetchMonths(fields, since) {
    const key = mollieKey(fields);
    const movements: RawMovement[] = [];
    let url: string | null = "https://api.mollie.com/v2/payments?limit=250";
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const body = (await (await callApi("Mollie", url, { headers: { Authorization: `Bearer ${key}` } })).json()) as {
        _embedded?: { payments?: MolliePayment[] };
        _links?: { next?: { href: string } | null };
      };
      const payments = body._embedded?.payments ?? [];
      let reachedOlder = false;
      for (const p of payments) {
        if (new Date(p.createdAt) < since) {
          reachedOlder = true;
          continue;
        }
        if (p.status !== "paid" || p.mode === "test") continue;
        const factor = minorUnitFactor(p.amount.currency);
        const kept =
          toMinor(p.amount.value, factor) - toMinor(p.amountRefunded?.value, factor) - toMinor(p.amountChargedBack?.value, factor);
        if (kept <= 0) continue;
        movements.push({ amountMinor: kept, currency: p.amount.currency, at: p.paidAt ?? p.createdAt, sale: true, customerId: p.customerId ?? null });
      }
      // Newest first: once a page reaches older payments, the rest is older too.
      url = reachedOlder ? null : (body._links?.next?.href ?? null);
    }
    return monthsFromMovements(movements, since);
  },
};

// ---------------------------------------------------------------- Paddle

type PaddleList<T> = { data: T[]; meta?: { pagination?: { next?: string | null; has_more?: boolean } } };
type PaddleTransaction = {
  status: string;
  currency_code: string;
  customer_id?: string | null;
  created_at: string;
  billed_at?: string | null;
  details?: { totals?: { grand_total?: string; total?: string } };
};
type PaddleAdjustment = { action: string; status: string; currency_code: string; created_at: string; totals?: { total?: string } };

function paddleKey(fields: Fields) {
  const key = required(fields, "apiKey", "ta clé API Paddle");
  if (key.includes("_sdbx_")) throw new Error("C'est une clé Sandbox : utilise une clé Live, les ventes de test ne comptent pas.");
  return key;
}

async function paddleAll<T>(key: string, firstUrl: string): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = firstUrl;
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const body = (await (await callApi("Paddle", url, { headers: { Authorization: `Bearer ${key}` } })).json()) as PaddleList<T>;
    items.push(...(body.data ?? []));
    url = body.meta?.pagination?.has_more ? (body.meta.pagination.next ?? null) : null;
  }
  return items;
}

export const paddle: ConnectorImpl = {
  async validate(fields) {
    await callApi("Paddle", "https://api.paddle.com/transactions?per_page=1", {
      headers: { Authorization: `Bearer ${paddleKey(fields)}` },
    });
    return { accountLabel: null };
  },
  async fetchMonths(fields, since) {
    const key = paddleKey(fields);
    const fromIso = since.toISOString();
    const transactions = await paddleAll<PaddleTransaction>(
      key,
      `https://api.paddle.com/transactions?status=completed,paid&created_at[GTE]=${encodeURIComponent(fromIso)}&per_page=30&order_by=created_at[ASC]`,
    );
    const movements: RawMovement[] = transactions.map((t) => ({
      // Paddle amounts are already in minor units, as strings.
      amountMinor: Number(t.details?.totals?.grand_total ?? t.details?.totals?.total ?? 0),
      currency: t.currency_code,
      at: t.billed_at ?? t.created_at,
      sale: true,
      customerId: t.customer_id ?? null,
    }));
    // Approved refunds come off in the month they were made. A key without
    // the adjustment permission still syncs, without them.
    const refunds = await paddleAll<PaddleAdjustment>(
      key,
      `https://api.paddle.com/adjustments?action=refund&status=approved&per_page=50`,
    ).catch(() => []);
    for (const r of refunds) {
      if (r.action !== "refund" || r.status !== "approved" || new Date(r.created_at) < since) continue;
      movements.push({ amountMinor: -Math.abs(Number(r.totals?.total ?? 0)), currency: r.currency_code, at: r.created_at, sale: false, customerId: null });
    }
    return monthsFromMovements(movements, since);
  },
};

// ---------------------------------------------------------------- Gumroad

type GumroadSale = {
  created_at: string;
  price: number;
  currency_symbol?: string;
  amount_refundable_in_currency?: string;
  refunded?: boolean;
  partially_refunded?: boolean;
  chargedback?: boolean;
  disputed?: boolean;
  purchaser_id?: string | null;
  email?: string | null;
  test?: boolean;
};

// Gumroad gives a symbol rather than a code.
const SYMBOLS: Record<string, string> = { "€": "EUR", $: "USD", "US$": "USD", "£": "GBP", "CA$": "CAD", A$: "AUD", "¥": "JPY", CHF: "CHF", "₹": "INR" };

export const gumroad: ConnectorImpl = {
  async validate(fields) {
    const token = required(fields, "accessToken", "ton jeton d'accès Gumroad");
    const body = (await (
      await callApi("Gumroad", `https://api.gumroad.com/v2/user?access_token=${encodeURIComponent(token)}`)
    ).json()) as { success?: boolean; user?: { name?: string } };
    if (!body.success) throw new Error("Gumroad refuse ce jeton. Génère-en un nouveau dans Settings → Advanced.");
    return { accountLabel: body.user?.name ?? null };
  },
  async fetchMonths(fields, since) {
    const token = required(fields, "accessToken", "ton jeton d'accès Gumroad");
    const movements: RawMovement[] = [];
    let pageKey: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({ access_token: token, after: since.toISOString().slice(0, 10) });
      if (pageKey) params.set("page_key", pageKey);
      const body = (await (await callApi("Gumroad", `https://api.gumroad.com/v2/sales?${params}`)).json()) as {
        sales?: GumroadSale[];
        next_page_key?: string | null;
      };
      for (const s of body.sales ?? []) {
        if (s.refunded || s.chargedback || s.test) continue;
        const currency = SYMBOLS[s.currency_symbol?.trim() ?? "$"] ?? "USD";
        const factor = minorUnitFactor(currency);
        const kept = s.partially_refunded && s.amount_refundable_in_currency
          ? toMinor(s.amount_refundable_in_currency.replace(/[^\d.,-]/g, ""), factor)
          : s.price;
        if (kept <= 0) continue;
        movements.push({ amountMinor: kept, currency, at: s.created_at, sale: true, customerId: s.purchaser_id ?? s.email ?? null });
      }
      pageKey = body.next_page_key ?? null;
      if (!pageKey) break;
    }
    return monthsFromMovements(movements, since);
  },
};

// ---------------------------------------------------------------- Whop

type WhopMoney = string | number | { amount?: string | number; currency?: string } | null | undefined;
type WhopPayment = {
  status?: string;
  currency?: string;
  total?: WhopMoney;
  refunded_amount?: WhopMoney;
  created_at?: string;
  paid_at?: string | null;
  user?: { id?: string } | null;
};

function whopAmount(value: WhopMoney): { amount: string | number | undefined; currency?: string } {
  if (value && typeof value === "object") return { amount: value.amount, currency: value.currency };
  return { amount: value ?? undefined };
}

export const whop: ConnectorImpl = {
  async validate(fields) {
    await callApi("Whop", "https://api.whop.com/api/v1/payments?first=1", {
      headers: { Authorization: `Bearer ${required(fields, "apiKey", "ta clé API Whop")}` },
    });
    return { accountLabel: null };
  },
  async fetchMonths(fields, since) {
    const key = required(fields, "apiKey", "ta clé API Whop");
    const movements: RawMovement[] = [];
    let after: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({ first: "100" });
      if (after) params.set("after", after);
      const body = (await (
        await callApi("Whop", `https://api.whop.com/api/v1/payments?${params}`, { headers: { Authorization: `Bearer ${key}` } })
      ).json()) as { data?: WhopPayment[]; page_info?: { end_cursor?: string | null; has_next_page?: boolean } };
      for (const p of body.data ?? []) {
        const at = p.paid_at ?? p.created_at;
        if (p.status !== "paid" || !at || new Date(at) < since) continue;
        const total = whopAmount(p.total);
        const refunded = whopAmount(p.refunded_amount);
        const currency = (total.currency ?? p.currency ?? "usd").toUpperCase();
        const factor = minorUnitFactor(currency);
        const kept = toMinor(total.amount, factor) - toMinor(refunded.amount, factor);
        if (kept <= 0) continue;
        movements.push({ amountMinor: kept, currency, at, sale: true, customerId: p.user?.id ?? null });
      }
      after = body.page_info?.has_next_page ? (body.page_info.end_cursor ?? null) : null;
      if (!after) break;
    }
    return monthsFromMovements(movements, since);
  },
};

// ---------------------------------------------------------------- WooCommerce

type WooOrder = {
  status: string;
  currency: string;
  total: string;
  date_created_gmt?: string;
  date_paid_gmt?: string | null;
  customer_id?: number;
  billing?: { email?: string };
  refunds?: { total: string }[];
};

/** Follows at most a few redirects, re-checking each address (the store URL is typed by the member). */
async function wooFetch(url: string, auth: string): Promise<Response> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicHttpsUrl(current);
    const res = await fetch(current, {
      headers: { Authorization: auth, Accept: "application/json" },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    }).catch(() => null);
    if (!res) throw new Error("La boutique ne répond pas. Vérifie l'adresse et réessaie.");
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new Error("WooCommerce refuse ces clés. Vérifie la clé client, le secret et le droit Lecture.");
    if (res.status === 404) throw new Error("L'API WooCommerce est introuvable à cette adresse. Vérifie l'adresse de la boutique.");
    if (!res.ok) throw new Error(`Erreur WooCommerce (${res.status}).`);
    return res;
  }
  throw new Error("Trop de redirections depuis cette adresse.");
}

function wooAuth(fields: Fields) {
  const key = required(fields, "consumerKey", "la clé client WooCommerce");
  const secret = required(fields, "consumerSecret", "le secret client WooCommerce");
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

function wooBase(fields: Fields) {
  const url = new URL(required(fields, "storeUrl", "l'adresse de ta boutique"));
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

export const woocommerce: ConnectorImpl = {
  async validate(fields) {
    const base = wooBase(fields);
    await assertPublicHttpsUrl(base);
    await wooFetch(`${base}/wp-json/wc/v3/orders?per_page=1`, wooAuth(fields));
    return { accountLabel: new URL(base).hostname };
  },
  async fetchMonths(fields, since) {
    const base = wooBase(fields);
    const auth = wooAuth(fields);
    const movements: RawMovement[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams({ status: "completed,processing", after: since.toISOString(), per_page: "100", page: String(page) });
      const res = await wooFetch(`${base}/wp-json/wc/v3/orders?${params}`, auth);
      const orders = (await res.json()) as WooOrder[];
      for (const o of orders) {
        const factor = minorUnitFactor(o.currency);
        const refunded = (o.refunds ?? []).reduce((sum, r) => sum + toMinor(r.total, factor), 0); // refund totals are negative
        const kept = toMinor(o.total, factor) + refunded;
        if (kept <= 0) continue;
        const at = o.date_paid_gmt ?? o.date_created_gmt;
        if (!at) continue;
        movements.push({
          amountMinor: kept,
          currency: o.currency,
          at: `${at}Z`,
          sale: true,
          customerId: o.customer_id ? String(o.customer_id) : (o.billing?.email ?? null),
        });
      }
      const totalPages = Number(res.headers.get("x-wp-totalpages") ?? "1");
      if (page >= totalPages || orders.length === 0) break;
    }
    return monthsFromMovements(movements, since);
  },
};
