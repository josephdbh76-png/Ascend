// Marketplace sellers are paid once a month, on a fixed day. Stripe Connect
// bills 0.25% + 0.10€ per payout on top of 2€ per seller per month with a
// payout, so one monthly payout instead of one per sale keeps small sales
// from costing more than they earn — and a seller balance held until the
// payout day still covers a refund. Client-safe: the Marché shows the date.

export const SELLER_PAYOUT_DAY = 5;

export interface PayoutDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

function parisToday(now: Date): PayoutDate {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" })
    .format(now)
    .split("-")
    .map(Number);
  return { year, month, day };
}

/** The next payout day, today included (Stripe pays the account in its own Paris time zone). */
export function nextSellerPayoutDate(now = new Date()): PayoutDate {
  const today = parisToday(now);
  if (today.day <= SELLER_PAYOUT_DAY) return { ...today, day: SELLER_PAYOUT_DAY };
  return today.month === 12
    ? { year: today.year + 1, month: 1, day: SELLER_PAYOUT_DAY }
    : { year: today.year, month: today.month + 1, day: SELLER_PAYOUT_DAY };
}

/** The payout day after `date`. */
export function followingSellerPayoutDate(date: PayoutDate): PayoutDate {
  return date.month === 12
    ? { year: date.year + 1, month: 1, day: SELLER_PAYOUT_DAY }
    : { year: date.year, month: date.month + 1, day: SELLER_PAYOUT_DAY };
}

/** "5 novembre", or "5 janvier 2027" when the year changes. */
export function formatPayoutDate(date: PayoutDate, now = new Date()): string {
  const sameYear = date.year === parisToday(now).year;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(Date.UTC(date.year, date.month - 1, date.day, 12));
}

/** True when a Stripe payout schedule already is "monthly, on SELLER_PAYOUT_DAY". */
export function isSellerPayoutSchedule(
  schedule: { interval: string; monthly_anchor?: number; monthly_payout_days?: number[] } | null | undefined,
): boolean {
  if (schedule?.interval !== "monthly") return false;
  if (schedule.monthly_payout_days?.length) {
    return schedule.monthly_payout_days.length === 1 && schedule.monthly_payout_days[0] === SELLER_PAYOUT_DAY;
  }
  return schedule.monthly_anchor === SELLER_PAYOUT_DAY;
}

/** To the cent: what a seller gets must never be rounded. */
export function exactEuros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}
