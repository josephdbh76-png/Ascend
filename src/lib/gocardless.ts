import "server-only";

const API_BASE = "https://bankaccountdata.gocardless.com/api/v2";

/**
 * GoCardless Bank Account Data (PSD2 account-information aggregator,
 * formerly Nordigen) — one platform-wide developer account mints
 * short-lived access tokens used to open a per-member bank connection
 * ("requisition"), unlike Shopify where each member needs their own app
 * credentials. Minted fresh on each call rather than cached: this runs
 * at low frequency (connecting a bank, periodic syncs), so the
 * simplicity is worth more than saving one extra request.
 */
export async function getGoCardlessAccessToken(): Promise<string> {
  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;
  if (!secretId || !secretKey) {
    throw new Error("GOCARDLESS_SECRET_ID / GOCARDLESS_SECRET_KEY ne sont pas configurées.");
  }

  const res = await fetch(`${API_BASE}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });
  if (!res.ok) throw new Error("Impossible de s'authentifier auprès de l'agrégateur bancaire.");
  const data: { access: string } = await res.json();
  return data.access;
}

export interface Institution {
  id: string;
  name: string;
  bic: string | null;
  logo: string | null;
}

export async function listInstitutions(accessToken: string, country: string): Promise<Institution[]> {
  const res = await fetch(`${API_BASE}/institutions/?country=${encodeURIComponent(country)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Impossible de récupérer la liste des banques.");
  return res.json();
}

export async function createRequisition(
  accessToken: string,
  institutionId: string,
  redirectUrl: string,
  reference: string,
): Promise<{ id: string; link: string }> {
  const res = await fetch(`${API_BASE}/requisitions/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      redirect: redirectUrl,
      institution_id: institutionId,
      reference,
      user_language: "FR",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Impossible de créer la connexion bancaire (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

export interface Requisition {
  id: string;
  status: string;
  accounts: string[];
  institution_id: string;
}

export async function getRequisition(accessToken: string, requisitionId: string): Promise<Requisition> {
  const res = await fetch(`${API_BASE}/requisitions/${requisitionId}/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Connexion bancaire introuvable.");
  return res.json();
}

export interface GcTransaction {
  transactionId?: string;
  internalTransactionId?: string;
  bookingDate: string;
  transactionAmount: { amount: string; currency: string };
  remittanceInformationUnstructured?: string;
  debtorName?: string;
  creditorName?: string;
}

export async function getAccountTransactions(accessToken: string, accountId: string): Promise<GcTransaction[]> {
  const res = await fetch(`${API_BASE}/accounts/${accountId}/transactions/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Impossible de récupérer les transactions bancaires.");
  const data: { transactions?: { booked?: GcTransaction[] } } = await res.json();
  return data.transactions?.booked ?? [];
}
