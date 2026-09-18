import { Trophy } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export function TrophyCard({
  name,
  description,
  earnedAt,
}: {
  name: string;
  description: string;
  earnedAt: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-gold/30 bg-card p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-card-elevated">
        <Trophy className="h-6 w-6 text-gold" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary">{name}</h3>
      <p className="text-xs text-text-secondary">{description}</p>
      <p className="text-[11px] text-text-muted">Débloqué {timeAgo(earnedAt)}</p>
    </div>
  );
}
