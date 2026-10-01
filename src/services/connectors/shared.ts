import "server-only";
import type { MonthTotal } from "@/services/revenue.service";

export type Fields = Record<string, string>;

export interface ConnectorImpl {
  /** Checks the credentials and returns a label for the account. Throws a message the member can act on. */
  validate(fields: Fields): Promise<{ accountLabel: string | null }>;
  /** Revenue per month (euro cents) since `since`. */
  fetchMonths(fields: Fields, since: Date, ctx: { userId: string; revenueSourceId: string }): Promise<Map<string, MonthTotal>>;
}

/** A sale or refund before conversion, in minor units of its currency. */
export interface RawMovement {
  amountMinor: number;
  currency: string;
  at: string;
  sale: boolean;
  customerId: string | null;
}

export function required(fields: Fields, key: string, label: string): string {
  const value = fields[key]?.trim();
  if (!value) throw new Error(`Renseigne ${label}.`);
  return value;
}

/**
 * fetch with a timeout and messages in plain French for the cases members
 * actually hit (wrong key, missing permission, platform down).
 */
export async function callApi(provider: string, url: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000), redirect: init.redirect ?? "error" });
  } catch {
    throw new Error(`${provider} ne répond pas pour le moment. Réessaie dans quelques minutes.`);
  }
  if (res.status === 401) throw new Error(`${provider} refuse cette clé. Vérifie qu'elle est complète et toujours active.`);
  if (res.status === 403) throw new Error(`Cette clé ${provider} n'a pas le droit de lire les ventes. Recrée-la avec l'accès en lecture.`);
  if (res.status === 429) throw new Error(`${provider} limite les demandes pour le moment. Réessaie dans quelques minutes.`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Erreur ${provider} (${res.status}) ${body.slice(0, 160)}`.trim());
  }
  return res;
}

/** Decimal money string or number ("29.99") to minor units. */
export function toMinor(value: string | number | null | undefined, factor: number): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "0").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * factor) : 0;
}

/** Stop paginating after this many pages: a sync never runs for minutes. */
export const MAX_PAGES = 60;
