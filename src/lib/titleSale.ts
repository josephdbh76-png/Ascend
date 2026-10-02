// When a Boutique title can be bought, and how its copies are numbered.
// Client-safe: the card shows the same state the checkout enforces.

export interface TitleSaleWindow {
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  launch_sale_days: number | null;
}

export type TitleSaleState =
  /** No time limit. */
  | { kind: "always" }
  /** On sale N days from the official launch, which hasn't happened yet. */
  | { kind: "atLaunch"; days: number }
  | { kind: "upcoming"; startsAt: string; endsAt: string | null }
  /** On sale now, until endsAt. */
  | { kind: "open"; endsAt: string }
  | { kind: "ended" };

export function titleSaleState(t: TitleSaleWindow, now = Date.now()): TitleSaleState {
  if (t.launch_sale_days && !t.sale_starts_at) return { kind: "atLaunch", days: t.launch_sale_days };
  if (t.sale_starts_at && now < Date.parse(t.sale_starts_at)) {
    return { kind: "upcoming", startsAt: t.sale_starts_at, endsAt: t.sale_ends_at };
  }
  if (t.sale_ends_at) return now < Date.parse(t.sale_ends_at) ? { kind: "open", endsAt: t.sale_ends_at } : { kind: "ended" };
  return { kind: "always" };
}

export function isTitleOnSale(t: TitleSaleWindow, now = Date.now()): boolean {
  const { kind } = titleSaleState(t, now);
  return kind === "always" || kind === "open";
}

/** "2 j 4 h", "3 h 12 min", "4 min 09 s" — precise enough to feel the clock. */
export function formatTimeLeft(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  return `${minutes} min ${String(s % 60).padStart(2, "0")} s`;
}

/** "7 octobre", "1er décembre" — the day a sale starts or ends, Paris time. */
export function formatSaleDay(iso: string): string {
  const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(iso));
  return day.replace(/^1 /, "1er ");
}

/** "n°7/30", or "n°7" when the edition size is unknown. */
export function formatEdition(editionNumber: number, supply?: number | null): string {
  return supply ? `n°${editionNumber}/${supply}` : `n°${editionNumber}`;
}
