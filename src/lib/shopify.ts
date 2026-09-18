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
 * A member generates this token themselves, from their own store's admin
 * (Settings → Apps and sales channels → Develop apps) — there is no
 * platform-level OAuth app involved (see the shopify.service.ts comment
 * for why). This does one lightweight authenticated call before ASCEND
 * ever stores the token, so a mistyped or under-scoped token fails with a
 * clear message immediately instead of silently at the next sync.
 */
export async function verifyShopifyToken(shop: string, accessToken: string): Promise<boolean> {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  return res.ok;
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
