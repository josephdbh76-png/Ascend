import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export const SHOPIFY_API_VERSION = "2024-10";

/**
 * Every Shopify shop's Admin API is reached through a fixed, predictable
 * hostname — `{name}.myshopify.com`. Validating this strictly before it's
 * ever used to build a URL (authorize redirect, token exchange, API calls)
 * is what stops a crafted `shop` query param from pointing any of those
 * requests at an attacker-controlled host.
 */
export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}

function shopifyClientId(): string {
  const id = process.env.SHOPIFY_CLIENT_ID;
  if (!id) throw new Error("SHOPIFY_CLIENT_ID is not configured.");
  return id;
}

function shopifyClientSecret(): string {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) throw new Error("SHOPIFY_CLIENT_SECRET is not configured.");
  return secret;
}

/**
 * `state` is the signed-in user's id, exactly like Stripe's OAuth flow —
 * the callback refuses to attach a shop to any other user's account.
 */
export function buildShopifyAuthorizeUrl(shop: string, userId: string, appUrl: string): string {
  if (!isValidShopDomain(shop)) throw new Error("Invalid Shopify shop domain.");
  const params = new URLSearchParams({
    client_id: shopifyClientId(),
    // Orders only — ASCEND never needs to read products, customers PII,
    // or write anything back to the store.
    scope: "read_orders",
    redirect_uri: `${appUrl}/api/shopify/callback`,
    state: userId,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Verifies Shopify's HMAC on the OAuth callback query string, per Shopify's
 * documented algorithm: every param except hmac/signature, sorted by key,
 * joined as `key=value` pairs with `&`, HMAC-SHA256'd with the app's client
 * secret. Without this check, a request merely *claiming* `code`/`shop`
 * values (no real Shopify redirect involved) would be trusted outright.
 */
export function verifyShopifyHmac(searchParams: URLSearchParams): boolean {
  const provided = searchParams.get("hmac");
  if (!provided) return false;

  const message = [...searchParams.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const computed = createHmac("sha256", shopifyClientSecret()).update(message).digest("hex");

  const providedBuf = Buffer.from(provided, "hex");
  const computedBuf = Buffer.from(computed, "hex");
  if (providedBuf.length !== computedBuf.length) return false;
  return timingSafeEqual(providedBuf, computedBuf);
}

export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope: string;
}

export async function exchangeShopifyCode(shop: string, code: string): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: shopifyClientId(),
      client_secret: shopifyClientSecret(),
      code,
    }),
  });
  if (!res.ok) throw new Error(`Shopify token exchange failed (${res.status}).`);
  const data = (await res.json()) as ShopifyAccessTokenResponse;
  if (!data.access_token) throw new Error("Shopify did not return an access token.");
  return data.access_token;
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
