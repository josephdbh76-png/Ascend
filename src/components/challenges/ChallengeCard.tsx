import { CheckCircle2, Gem, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ChallengeProgress } from "@/types";

export function ChallengeCard({
  challenge,
  completionRate,
}: {
  challenge: ChallengeProgress;
  /** % of (non-demo) members who have completed this challenge — social proof. */
  completionRate?: number;
}) {
  const isCompleted = challenge.status === "completed";
  const progress = Math.min(100, Math.max(0, challenge.progress));

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-card p-5 transition-colors",
        isCompleted ? "border-gold/40 bg-gold/[0.03]" : "border-border hover:border-border-strong",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{challenge.title}</h3>
          <p className="mt-1 text-sm text-text-secondary">{challenge.description}</p>
        </div>
        {challenge.points > 0 && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums",
              isCompleted ? "border-gold/40 bg-gold/10 text-gold" : "border-border-strong text-text-primary",
            )}
          >
            {isCompleted ? "+" : ""}
            {challenge.points} pts
          </span>
        )}
      </div>

      {isCompleted ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" /> Défi réussi
        </p>
      ) : (
        <div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Progression</span>
            <span className="tabular-nums">{progress.toFixed(0)} %</span>
          </div>
          <ProgressBar percent={progress} className="mt-1.5" />
        </div>
      )}

      {(challenge.rewardAchievementId || challenge.rewardTitleId || completionRate != null) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-text-muted">
          {completionRate != null && (
            <span>
              {completionRate > 0 && completionRate < 0.1
                ? "Moins de 0,1 % des membres l'ont réussi"
                : `${completionRate.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % des membres l'ont réussi`}
            </span>
          )}
          {challenge.rewardTitleId ? (
            <span className="flex items-center gap-1 text-gold">
              <Gem className="h-3.5 w-3.5" /> Titre offert
            </span>
          ) : (
            challenge.rewardAchievementId && (
              <span className="flex items-center gap-1 text-gold">
                <Gift className="h-3.5 w-3.5" /> Accomplissement à la clé
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}
