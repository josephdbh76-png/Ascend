import { Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DealRow } from "@/services/deal.service";

export function DealsSection({ deals }: { deals: DealRow[] }) {
  if (deals.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-text-muted">
        <Tag className="h-4 w-4 text-gold" /> Bons plans Elite
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((d) => {
          const discountPercent = Math.round((1 - d.dealPriceCents / d.originalPriceCents) * 100);
          return (
            <a
              key={d.id}
              href={d.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-2 rounded-lg border border-gold/30 bg-gold/5 p-4 transition-colors hover:bg-gold/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[11px] font-semibold text-gold">
                  -{discountPercent}%
                </span>
                <span className="text-xs text-text-muted">{d.influencerName}</span>
              </div>
              <p className="text-sm font-medium text-text-primary">{d.title}</p>
              <p className="line-clamp-2 text-xs text-text-secondary">{d.description}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gold">{formatCurrency(d.dealPriceCents)}</span>
                <span className="text-xs text-text-muted line-through">{formatCurrency(d.originalPriceCents)}</span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
