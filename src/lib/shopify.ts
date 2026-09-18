import "server-only";

export const SHOPIFY_API_VERSION = "2024-10";

/**
 * Every Shopify shop's Admin API is reached through a fixed, predictable
 * hostname — `{name}.myshopify.com`. Validating this strictly before it's
 * ever used to build a URL is what stops a crafted shop domain from
 * pointing an API request at an attacker-controlled host.
 */
export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}

/**
 * Shopify's Dev Dashboard apps (the only install path available without a
 * Shopify Plus organization or a full App Store review — see
 * shopify.service.ts) don't hand out a long-lived Admin API token anymore.
 * Instead, the app's client_id + client_secret are exchanged for a
 * short-lived one (24h) whenever it's needed, via the OAuth "client
 * credentials grant". This only succeeds when the app and the shop belong
 * to the same Shopify organization — i.e. each ASCEND member creates their
 * own such app for their own store, exactly like they'd create their own
 * Stripe account.
 */
export async function getShopifyAccessToken(
  shop: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export interface ShopifyOrder {
  id: number;
  created_at: string;
  current_total_price: string;
  financial_status: string;
  cancelled_at: string | null;
  customer: { id: number } | null;
}

/** Parses the `Link: <url>; rel="next"` header Shopify uses for cursor-based pagination. */
export function nextPageUrlFromLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.split(",").find((part) => part.includes('rel="next"'));
  if (!match) return null;
  const urlMatch = match.match(/<([^>]+)>/);
  return urlMatch?.[1] ?? null;
}

export async function fetchShopifyOrdersPage(
  url: string,
  accessToken: string,
): Promise<{ orders: ShopifyOrder[]; nextUrl: string | null }> {
  const res = await fetch(url, { headers: { "X-Shopify-Access-Token": accessToken } });
  if (!res.ok) throw new Error(`Shopify orders request failed (${res.status}).`);
  const data = (await res.json()) as { orders: ShopifyOrder[] };
  return { orders: data.orders ?? [], nextUrl: nextPageUrlFromLinkHeader(res.headers.get("Link")) };
}
