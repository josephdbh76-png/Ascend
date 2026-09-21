import "server-only";

const API_BASE = "https://api-m.paypal.com";
const MAX_WINDOW_DAYS = 31; // PayPal's Transaction Search API hard limit per request.

/**
 * Client-credentials OAuth2 grant, same shape as Shopify's — each member
 * creates their own PayPal REST app (in their own PayPal developer
 * account) with Transaction Search enabled, exactly like their own
 * Stripe/Shopify account rather than ASCEND being an approved PayPal
 * platform partner (a much heavier review process).
 */
export async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const data: { access_token: string } = await res.json();
  return data.access_token;
}

export interface PayPalTransaction {
  transaction_info: {
    transaction_id: string;
    transaction_status: "S" | "P" | "D" | "V";
    transaction_amount: { value: string; currency_code: string };
    transaction_initiation_date: string;
  };
  payer_info?: { email_address?: string; payer_name?: { full_name?: string } };
}

async function fetchWindow(accessToken: string, startDate: Date, endDate: Date): Promise<PayPalTransaction[]> {
  const transactions: PayPalTransaction[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      fields: "transaction_info,payer_info",
      page_size: "500",
      page: String(page),
    });
    const res = await fetch(`${API_BASE}/v1/reporting/transactions?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Erreur PayPal (${res.status}): ${body.slice(0, 200)}`);
    }
    const data: { transaction_details: PayPalTransaction[]; total_pages: number } = await res.json();
    transactions.push(...(data.transaction_details ?? []));
    if (page >= data.total_pages) break;
    page++;
  }

  return transactions;
}

/** Splits the requested range into ≤31-day windows and fetches each — PayPal rejects a single request spanning more than that. */
export async function fetchTransactionsSince(accessToken: string, sinceDate: Date): Promise<PayPalTransaction[]> {
  const all: PayPalTransaction[] = [];
  let windowStart = new Date(sinceDate);
  const now = new Date();

  while (windowStart < now) {
    const windowEnd = new Date(Math.min(windowStart.getTime() + MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000, now.getTime()));
    all.push(...(await fetchWindow(accessToken, windowStart, windowEnd)));
    windowStart = windowEnd;
  }

  return all;
}
