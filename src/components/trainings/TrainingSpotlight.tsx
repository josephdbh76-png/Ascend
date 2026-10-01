import Link from "next/link";
import { ArrowRight, GraduationCap, Settings2 } from "lucide-react";
import { TrainingCover } from "./TrainingCover";
import { formatPrice, themeLabel, trainingDiscountPercent, trainingPath } from "@/lib/trainings";
import type { Training } from "@/services/training.service";

/** "Formation disponible" banner on a creator's profile. */
export function TrainingSpotlight({ trainings, isOwner }: { trainings: Training[]; isOwner: boolean }) {
  if (trainings.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-label="Formations proposées">
      {trainings.map((t) => {
        const discount = trainingDiscountPercent(t.priceCents, t.memberPriceCents);
        return (
          <div
            key={t.id}
            className="relative flex flex-col overflow-hidden rounded-lg border border-gold/35 bg-card sm:flex-row"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 bg-[radial-gradient(closest-side,rgba(214,168,79,0.16),transparent)]"
            />
            <TrainingCover src={t.coverImageUrl} className="aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-56" />
            <div className="relative flex flex-1 flex-col gap-2 p-5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
                <GraduationCap className="h-3.5 w-3.5" /> Formation disponible · {themeLabel(t.theme)}
              </p>
              <h2 className="text-lg font-semibold leading-snug text-text-primary">{t.title}</h2>
              <p className="text-sm text-text-secondary">{t.summary}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  {t.memberPriceCents != null ? (
                    <>
                      <span className="font-semibold text-gold">{formatPrice(t.memberPriceCents)}</span>{" "}
                      <span className="text-text-muted line-through">{formatPrice(t.priceCents)}</span>{" "}
                      <span className="text-xs text-text-secondary">
                        avec {t.audience === "elite" ? "Elite" : "Pro ou Elite"}
                        {discount != null && ` (-${discount} %)`}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-text-primary">{t.priceCents === 0 ? "Gratuite" : formatPrice(t.priceCents)}</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <Link
                      href="/app/settings#formations"
                      className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
                    >
                      <Settings2 className="h-3.5 w-3.5" /> Gérer
                    </Link>
                  )}
                  <Link
                    href={trainingPath(t.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3.5 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-gold-light"
                  >
                    Découvrir <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
