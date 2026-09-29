// Sliding commission scale: 10% at 50€ or below, down to 5% at 1000€ or
// above, linearly interpolated in between. Shared so the sell form shows the
// exact net amount the server will compute.
const COMMISSION_LOW_CENTS = 5000;
const COMMISSION_HIGH_CENTS = 100000;
const COMMISSION_LOW_RATE = 0.1;
const COMMISSION_HIGH_RATE = 0.05;

export function commissionRateForPrice(priceCents: number): number {
  if (priceCents <= COMMISSION_LOW_CENTS) return COMMISSION_LOW_RATE;
  if (priceCents >= COMMISSION_HIGH_CENTS) return COMMISSION_HIGH_RATE;
  const t = (priceCents - COMMISSION_LOW_CENTS) / (COMMISSION_HIGH_CENTS - COMMISSION_LOW_CENTS);
  return COMMISSION_LOW_RATE + t * (COMMISSION_HIGH_RATE - COMMISSION_LOW_RATE);
}

export function commissionCentsForPrice(priceCents: number): number {
  return Math.round(priceCents * commissionRateForPrice(priceCents));
}
