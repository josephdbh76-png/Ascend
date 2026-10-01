import Link from "next/link";
import { BadgeCheck, Eye, Lock, Pin } from "lucide-react";
import { TrainingCover } from "./TrainingCover";
import { formatPrice, themeLabel, trainingDiscountPercent, trainingPath, TRAINING_FORMATS } from "@/lib/trainings";
import type { Training } from "@/services/training.service";

export function TrainingCard({ training: t }: { training: Training }) {
  const discount = trainingDiscountPercent(t.priceCents, t.memberPriceCents);
  return (
    <Link
      href={trainingPath(t.id)}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)]"
    >
      <div className="relative">
        <TrainingCover src={t.coverImageUrl} className="aspect-[16/9] w-full" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {t.isPinned && (
            <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold backdrop-blur-sm">
              <Pin className="h-3 w-3" /> Sélection ASCEND
            </span>
          )}
          {discount != null && (
            <span className="flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-[#0a0a0a]">
              {!t.offerUnlocked && <Lock className="h-3 w-3" />}-{discount} %{t.audience === "elite" ? " Elite" : " Pro et Elite"}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
          {themeLabel(t.theme)} · {TRAINING_FORMATS[t.format]}
        </p>
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-text-primary group-hover:text-gold">{t.title}</h3>
        <p className="line-clamp-2 text-sm text-text-secondary">{t.summary}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-elevated text-[10px] font-semibold text-gold">
              {t.creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.creator.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                t.creator.name.slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="flex min-w-0 items-center gap-1 text-xs text-text-secondary">
              <span className="truncate">{t.creator.name}</span>
              {t.creator.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Revenus vérifiés" />}
            </span>
          </div>
          <div className="shrink-0 text-right">
            {t.memberPriceCents != null && t.offerUnlocked ? (
              <>
                <p className="text-xs text-text-muted line-through">{formatPrice(t.priceCents)}</p>
                <p className="text-sm font-semibold text-gold">{formatPrice(t.memberPriceCents)}</p>
              </>
            ) : t.memberPriceCents != null ? (
              <>
                <p className="text-sm font-semibold text-text-primary">{formatPrice(t.priceCents)}</p>
                <p className="flex items-center justify-end gap-1 text-[11px] font-medium text-gold">
                  <Lock className="h-3 w-3" /> {formatPrice(t.memberPriceCents)} avec {t.audience === "elite" ? "Elite" : "Pro"}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-text-primary">{t.priceCents === 0 ? "Gratuit" : formatPrice(t.priceCents)}</p>
            )}
          </div>
        </div>
        {t.weekViews >= 10 && (
          <p className="flex items-center gap-1 text-[11px] text-text-muted">
            <Eye className="h-3 w-3" /> {t.weekViews} vues cette semaine
          </p>
        )}
      </div>
    </Link>
  );
}
