import { Award, Lock } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { AchievementRarity } from "@/types/database.types";

const RARITY_STYLES: Record<AchievementRarity, string> = {
  common: "border-border-strong text-text-secondary",
  rare: "border-info/40 text-info",
  epic: "border-exclusive/40 text-exclusive",
  legendary: "border-gold/50 text-gold",
};

const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: "commun",
  rare: "rare",
  epic: "épique",
  legendary: "légendaire",
};

export function AchievementCard({
  name,
  description,
  rarity,
  earnedAt,
}: {
  name: string;
  description: string;
  rarity: AchievementRarity;
  earnedAt: string | null;
}) {
  const earned = !!earnedAt;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-5 transition-colors",
        earned ? RARITY_STYLES[rarity] : "border-border opacity-60",
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            earned ? "bg-gold/10" : "bg-card-elevated",
          )}
        >
          {earned ? <Award className="h-5 w-5 text-gold" /> : <Lock className="h-4 w-4 text-text-muted" />}
        </div>
        <span className={cn("text-[10px] font-semibold uppercase tracking-wide", earned ? RARITY_STYLES[rarity].split(" ")[1] : "text-text-muted")}>
          {RARITY_LABELS[rarity]}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{name}</h3>
        <p className="mt-1 text-xs text-text-secondary">{description}</p>
      </div>
      {earned && earnedAt && <p className="text-[11px] text-text-muted">Débloqué {timeAgo(earnedAt)}</p>}
    </div>
  );
}
