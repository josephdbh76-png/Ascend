import "server-only";
import { createSign } from "crypto";

const API_BASE = "https://api.enablebanking.com";

/**
 * Enable Banking's replacement for GoCardless Bank Account Data
 * (Nordigen), which stopped accepting new signups — the closest
 * genuinely self-serve PSD2 aggregator left in Europe as of writing.
 * Auth is a short-lived JWT signed with ASCEND's own RSA key (RS256),
 * not a bearer token exchanged from a secret pair — no jsonwebtoken
 * dependency needed for a token this simple.
 */
function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function signedJwt(): string {
  const appId = process.env.ENABLE_BANKING_APP_ID;
  const privateKeyRaw = process.env.ENABLE_BANKING_PRIVATE_KEY;
  if (!appId || !privateKeyRaw) {
    throw new Error("ENABLE_BANKING_APP_ID / ENABLE_BANKING_PRIVATE_KEY ne sont pas configurées.");
  }
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "RS256", kid: appId };
  const payload = { iss: "enablebanking.com", aud: "api.enablebanking.com", iat: now, exp: now + 3600 };

  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${signedJwt()}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Enable Banking API error (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

export interface Aspsp {
  name: string;
  country: string;
  logo: string | null;
  bic: string | null;
}

export async function listAspsps(country: string): Promise<Aspsp[]> {
  const data = await request<{ aspsps: Aspsp[] }>(`/aspsps?country=${encodeURIComponent(country)}`);
  return data.aspsps;
}

export async function startAuthorization(
  aspspName: string,
  aspspCountry: string,
  redirectUrl: string,
  state: string,
  psuId: string,
): Promise<{ url: string; authorizationId: string }> {
  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const data = await request<{ url: string; authorization_id: string }>("/auth", {
    method: "POST",
    body: JSON.stringify({
      aspsp: { name: aspspName, country: aspspCountry },
      access: { valid_until: validUntil, balances: false, transactions: true },
      state,
      redirect_url: redirectUrl,
      psu_type: "personal",
      psu_id: psuId,
      language: "fr",
    }),
  });
  return { url: data.url, authorizationId: data.authorization_id };
}

export interface EbAccount {
  uid: string;
}

export async function createSession(code: string): Promise<{ sessionId: string; accounts: EbAccount[] }> {
  const data = await request<{ session_id: string; accounts: EbAccount[] }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return { sessionId: data.session_id, accounts: data.accounts };
}

export interface EbTransaction {
  transaction_id?: string;
  entry_reference?: string;
  booking_date?: string;
  transaction_date?: string;
  transaction_amount: { amount: string; currency: string };
  credit_debit_indicator: "CRDT" | "DBIT";
  debtor?: { name?: string };
  creditor?: { name?: string };
  remittance_information?: string[];
}

export async function getAccountTransactions(accountUid: string): Promise<EbTransaction[]> {
  const dateFrom = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const transactions: EbTransaction[] = [];
  let continuationKey: string | null = null;

  do {
    const query = new URLSearchParams({ date_from: dateFrom });
    if (continuationKey) query.set("continuation_key", continuationKey);
    const data: { transactions: EbTransaction[]; continuation_key: string | null } = await request(
      `/accounts/${accountUid}/transactions?${query.toString()}`,
    );
    transactions.push(...data.transactions);
    continuationKey = data.continuation_key;
  } while (continuationKey);

  return transactions;
}
