import { ArrowRight, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(245,196,81,0.08),transparent)]" />
      <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="gold">Private Beta</Badge>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            Build. Prove. <span className="text-gold">Rise.</span>
          </h1>
          <p className="mt-5 text-lg font-medium text-text-primary sm:text-xl">
            The performance network for ambitious entrepreneurs.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
            Connect your business. Verify your performance. Climb the leaderboard. Build your reputation.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/signup" size="lg">
              Join the Beta <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="#leaderboard" variant="secondary" size="lg">
              Explore the Leaderboard
            </Button>
          </div>
          <p className="mt-4 text-xs text-text-muted">Free during beta · No credit card required</p>
        </div>

        <div className="mx-auto mt-16 max-w-4xl animate-fade-up">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-xl border border-border-strong bg-card-elevated p-4 shadow-2xl sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Founder Dashboard · Illustrative preview
        </span>
        <span className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Monthly Revenue", value: formatCurrency(2482000), accent: true },
          { label: "Growth", value: formatPercent(34.2), success: true },
          { label: "Global Rank", value: "#47" },
          { label: "France", value: "#8" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-3.5 sm:p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">{stat.label}</p>
            <p
              className={`mt-1.5 text-lg font-semibold tabular-nums sm:text-xl ${
                stat.accent ? "text-gold" : stat.success ? "text-success" : "text-text-primary"
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-28 items-end gap-1.5 rounded-lg border border-border bg-card p-4 sm:h-36">
        {[38, 44, 40, 52, 61, 58, 70, 66, 78, 84, 90, 100].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-gold-dark/60 to-gold"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          <TrendingUp className="h-4 w-4 text-gold" /> New achievement unlocked
        </span>
        <span className="text-sm font-medium text-gold">€25K Month</span>
      </div>
    </div>
  );
}
