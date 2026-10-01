import "server-only";
import { euroConverter } from "@/lib/fx";
import { addToMonth, type MonthTotal } from "@/services/revenue.service";
import type { RawMovement } from "./shared";

/** Converts every movement to euros (rate of its own day) and totals it per month. */
export async function monthsFromMovements(movements: RawMovement[], since: Date): Promise<Map<string, MonthTotal>> {
  const toEur = await euroConverter(
    movements.map((m) => m.currency),
    since,
  );
  const months = new Map<string, MonthTotal>();
  for (const m of movements) {
    addToMonth(months, m.at, toEur(m.amountMinor, m.currency, m.at), { countsAsSale: m.sale, customerId: m.customerId });
  }
  return months;
}
