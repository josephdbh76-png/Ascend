// Sliding commission scale: 10% at 50€ or below, down to 5% at 1000€ or
// above, linearly interpolated in between, never under 2.50€. On a
// destination charge ASCEND pays the card fee (about 0.25€ + 1.5%) and Stripe
// Connect bills 2€ per seller for each month they get a payout, plus 0.25% +
// 0.10€ per payout: below a 10€ price and a 2.50€ cut, a seller's single sale
// of the month cost ASCEND more than it earned. Shared so the sell form shows
// the exact net amount the server will compute.
const COMMISSION_LOW_CENTS = 5000;
const COMMISSION_HIGH_CENTS = 100000;
const COMMISSION_LOW_RATE = 0.1;
const COMMISSION_HIGH_RATE = 0.05;
export const MIN_COMMISSION_CENTS = 250;
export const MIN_LISTING_PRICE_CENTS = 1000;

export function commissionRateForPrice(priceCents: number): number {
  if (priceCents <= COMMISSION_LOW_CENTS) return COMMISSION_LOW_RATE;
  if (priceCents >= COMMISSION_HIGH_CENTS) return COMMISSION_HIGH_RATE;
  const t = (priceCents - COMMISSION_LOW_CENTS) / (COMMISSION_HIGH_CENTS - COMMISSION_LOW_CENTS);
  return COMMISSION_LOW_RATE + t * (COMMISSION_HIGH_RATE - COMMISSION_LOW_RATE);
}

export function commissionCentsForPrice(priceCents: number): number {
  return Math.min(priceCents, Math.max(MIN_COMMISSION_CENTS, Math.round(priceCents * commissionRateForPrice(priceCents))));
}

/** True when the 2.50€ floor, not the percentage, sets the commission. */
export function isMinimumCommission(priceCents: number): boolean {
  return Math.round(priceCents * commissionRateForPrice(priceCents)) < MIN_COMMISSION_CENTS;
}
