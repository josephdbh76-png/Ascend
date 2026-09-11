import { CHALLENGE_DEFINITIONS } from "@/lib/constants";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";

const DEMO_PROGRESS = [72, 45, 90, 0, 0];

export function ChallengesPreview() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Monthly challenges keep you climbing
          </h2>
          <p className="mt-4 text-sm text-text-secondary">
            Seasonal, elite-competition-style challenges reward consistency, growth and firsts —
            not vanity metrics.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHALLENGE_DEFINITIONS.map((c, i) => {
            const isComingSoon = c.type === "coming_soon";
            return (
              <div
                key={c.id}
                className={`rounded-lg border bg-card p-6 ${isComingSoon ? "opacity-60" : "border-border"}`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">{c.title}</h3>
                  <Badge variant={isComingSoon ? "neutral" : "gold"}>
                    {isComingSoon ? "Coming Soon" : "Active"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-text-secondary">{c.description}</p>
                {!isComingSoon && <ProgressBar percent={DEMO_PROGRESS[i]} className="mt-4" />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
