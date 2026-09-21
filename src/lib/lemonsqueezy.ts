import "server-only";

const API_BASE = "https://api.lemonsqueezy.com/v1";

export interface LsOrder {
  id: string;
  attributes: {
    store_id: number;
    total: number; // integer cents
    currency: string;
    status: "pending" | "failed" | "paid" | "refunded" | "partial_refund" | "fraudulent";
    user_name: string;
    user_email: string;
    created_at: string;
    refunded: boolean;
  };
}

/** A single API key (created in the member's own Settings → API) authenticates every request — no OAuth token exchange, unlike Stripe/Shopify/PayPal. */
export async function verifyLemonSqueezyKey(apiKey: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
  return res.ok;
}

export async function fetchAllOrders(apiKey: string, sinceDate: Date): Promise<LsOrder[]> {
  const headers = {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${apiKey}`,
  };

  const orders: LsOrder[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const res = await fetch(`${API_BASE}/orders?page[number]=${page}&page[size]=${pageSize}`, { headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Erreur Lemon Squeezy (${res.status}): ${body.slice(0, 200)}`);
    }
    const data: { data: LsOrder[]; meta: { page: { lastPage: number } } } = await res.json();

    let hitOlderThanWindow = false;
    for (const order of data.data) {
      if (new Date(order.attributes.created_at) < sinceDate) {
        hitOlderThanWindow = true;
        continue;
      }
      orders.push(order);
    }

    // Orders are returned newest-first, so once a page is entirely older
    // than the sync window there's nothing left worth another request.
    if (hitOlderThanWindow || page >= data.meta.page.lastPage) break;
    page++;
  }

  return orders;
}
