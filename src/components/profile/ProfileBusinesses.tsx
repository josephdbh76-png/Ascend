import { ArrowUpRight, Briefcase } from "lucide-react";
import { activityLabel, websiteHost } from "@/lib/business";
import type { PublicBusiness } from "@/types";

/** Worth a section only when there is more than the one line the header already shows. */
export function hasBusinessDetails(businesses: PublicBusiness[]) {
  return businesses.length > 1 || businesses.some((b) => b.description || b.website);
}

export function ProfileBusinesses({ businesses }: { businesses: PublicBusiness[] }) {
  return (
    <section id="activites" className="scroll-mt-20">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
        <Briefcase className="h-4 w-4" /> {businesses.length > 1 ? "Activités" : "Activité"}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {businesses.map((b, i) => (
          <article
            key={`${b.name}-${i}`}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5 transition-colors hover:border-border-strong"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-text-primary">{b.name}</h3>
                <p className="text-xs font-medium text-gold">{activityLabel(b.category, b.customCategory)}</p>
              </div>
              {i === 0 && businesses.length > 1 && (
                <span className="shrink-0 rounded-full border border-border-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  Principale
                </span>
              )}
            </div>
            {b.description && <p className="text-sm leading-relaxed text-text-secondary">{b.description}</p>}
            {b.website && (
              <a
                href={b.website}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="mt-auto inline-flex items-center gap-1 self-start pt-1 text-xs font-medium text-text-secondary transition-colors hover:text-gold"
              >
                {websiteHost(b.website)} <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
