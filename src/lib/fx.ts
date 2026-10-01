import "server-only";

// Daily ECB reference rates (free, no key) through Frankfurter. Every
// connector converts to euros before writing a month, so a store selling in
// dollars is compared fairly with one selling in euros.

const FX_API = "https://api.frankfurter.dev/v1";
const cache = new Map<string, Promise<Map<string, number>>>();

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Rates per day (YYYY-MM-DD → 1 unit of `currency` in EUR) over [from, to]. */
function loadSeries(currency: string, from: Date, to: Date): Promise<Map<string, number>> {
  const key = `${currency}:${isoDay(from)}:${isoDay(to)}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(`${FX_API}/${isoDay(from)}..${isoDay(to)}?base=${currency}&symbols=EUR`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Taux de change indisponibles (${res.status}). Réessaie dans quelques minutes.`);
      const body = (await res.json()) as { rates?: Record<string, { EUR?: number }> };
      const series = new Map<string, number>();
      for (const [day, rate] of Object.entries(body.rates ?? {})) if (rate.EUR) series.set(day, rate.EUR);
      if (series.size === 0) throw new Error(`Devise non prise en charge : ${currency}.`);
      return series;
    })();
    cache.set(key, pending);
    pending.catch(() => cache.delete(key));
  }
  return pending;
}

/**
 * Returns a converter to euro cents for amounts dated within [from, now].
 * Weekends and holidays use the last published rate before the date.
 */
export async function euroConverter(currencies: Iterable<string>, from: Date) {
  const to = new Date();
  const start = new Date(from.getTime() - 7 * 86_400_000); // room for a weekend before `from`
  const wanted = [...new Set([...currencies].map((c) => c.toUpperCase()).filter((c) => c && c !== "EUR"))];
  const series = new Map<string, { days: string[]; rates: Map<string, number> }>();
  await Promise.all(
    wanted.map(async (currency) => {
      const rates = await loadSeries(currency, start, to);
      series.set(currency, { days: [...rates.keys()].sort(), rates });
    }),
  );

  return (amountMinor: number, currency: string, at: Date | string): number => {
    const code = currency.toUpperCase();
    if (code === "EUR") return Math.round(amountMinor);
    const s = series.get(code);
    if (!s) throw new Error(`Devise non prise en charge : ${code}.`);
    const day = isoDay(new Date(at));
    let pick = s.days[0];
    for (const d of s.days) {
      if (d > day) break;
      pick = d;
    }
    // Minor units of the currency → euro cents (a yen has no cents, a dollar 100).
    return Math.round((amountMinor / minorUnitFactor(code)) * (s.rates.get(pick) ?? 0) * 100);
  };
}

/** Minor units per major unit for a currency (JPY has none, KWD three...). */
export function minorUnitFactor(currency: string): number {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency: currency.toUpperCase() }).resolvedOptions()
    .maximumFractionDigits;
  return 10 ** (digits ?? 2);
}
