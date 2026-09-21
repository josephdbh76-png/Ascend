"use client";

import { useMemo, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn, formatCurrency } from "@/lib/utils";
import { setTransactionRevenueTagAction } from "../actions";
import type { BankTransactionRow } from "@/services/bank.service";

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

export function TransactionsList({ initial }: { initial: BankTransactionRow[] }) {
  const [transactions, setTransactions] = useState(initial);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const toast = useToast();

  const groups = useMemo(() => {
    const byMonth = new Map<string, BankTransactionRow[]>();
    for (const t of transactions) {
      const key = monthKey(t.bookingDate);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(t);
    }
    return Array.from(byMonth.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [transactions]);

  function toggle(transaction: BankTransactionRow) {
    const nextValue = !transaction.isRevenue;
    setTransactions((prev) => prev.map((t) => (t.id === transaction.id ? { ...t, isRevenue: nextValue } : t)));
    setPendingIds((prev) => new Set(prev).add(transaction.id));

    startTransition(async () => {
      const result = await setTransactionRevenueTagAction(transaction.id, nextValue);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(transaction.id);
        return next;
      });
      if (!result.success) {
        setTransactions((prev) => prev.map((t) => (t.id === transaction.id ? { ...t, isRevenue: !nextValue } : t)));
        toast.show(result.error, "error");
      }
    });
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Aucune transaction pour l'instant."
        description="La synchronisation initiale peut prendre quelques instants — reviens sur cette page dans un moment, ou resynchronise depuis les réglages."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map(([key, monthTransactions]) => {
        const taggedTotal = monthTransactions.filter((t) => t.isRevenue).reduce((sum, t) => sum + t.amountCents, 0);
        const label = MONTH_LABEL.format(new Date(`${key}-01T00:00:00Z`));
        return (
          <div key={key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold capitalize text-text-primary">{label}</h2>
              <span className="text-sm font-medium tabular-nums text-gold">{formatCurrency(taggedTotal)}</span>
            </div>
            <Card className="divide-y divide-border" elevated>
              {monthTransactions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t)}
                  disabled={pendingIds.has(t.id)}
                  className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-card-active disabled:opacity-60"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      t.isRevenue ? "border-gold bg-gold text-[#0a0a0a]" : "border-border-strong text-transparent",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">{t.counterparty ?? t.description ?? "Virement"}</p>
                    {t.description && t.counterparty && (
                      <p className="truncate text-xs text-text-muted">{t.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">
                    {new Date(t.bookingDate).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-text-primary">
                    {formatCurrency(t.amountCents, t.currency)}
                  </span>
                </button>
              ))}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
