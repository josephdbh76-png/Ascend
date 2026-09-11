import { CheckCircle2, Share2 } from "lucide-react";
import { formatCurrencyRange, formatPercent } from "@/lib/utils";

export function ProfileShowcase() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="mx-auto max-w-sm rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card-elevated text-lg font-semibold text-gold">
                  AM
                </div>
                <div>
                  <p className="font-semibold text-text-primary">Alex Martin</p>
                  <p className="text-xs text-text-muted">@alexmartin · France</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Revenue Verified
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">Revenue</p>
                  <p className="font-medium tabular-nums text-text-primary">
                    {formatCurrencyRange(2000000, 3000000)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">Growth</p>
                  <p className="font-medium tabular-nums text-success">{formatPercent(34.2)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">Global</p>
                  <p className="font-medium tabular-nums text-gold">#47</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">France</p>
                  <p className="font-medium tabular-nums text-text-primary">#8</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-2 text-xs text-text-secondary">
                <Share2 className="h-3.5 w-3.5" /> ascend.app/profile/alexmartin
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
              A public profile you&apos;ll actually want to share
            </h2>
            <p className="mt-4 text-sm text-text-secondary">
              Choose exactly how much revenue detail to reveal — exact figure, a range, or fully
              private. Your rank, achievements and verification always stay visible.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
