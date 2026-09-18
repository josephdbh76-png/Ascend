import { CheckCircle2, Clock, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import type { ChallengeProgress } from "@/types";

function daysRemaining(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function ChallengeCard({
  challenge,
  completionRate,
}: {
  challenge: ChallengeProgress;
  /** % of (non-demo) members who have completed this challenge — social proof. */
  completionRate?: number;
}) {
  const isComingSoon = challenge.type === "coming_soon";
  const isCompleted = challenge.status === "completed";
  const remaining = daysRemaining(challenge.endsAt);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border bg-card p-6",
        isCompleted ? "border-gold/40" : "border-border",
        isComingSoon && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{challenge.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{challenge.description}</p>
        </div>
        {isCompleted ? (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" /> Terminé
          </Badge>
        ) : isComingSoon ? (
          <Badge variant="neutral">Bientôt disponible</Badge>
        ) : (
          <Badge variant="gold">En cours</Badge>
        )}
      </div>

      {!isComingSoon && (
        <div>
          <div className="flex items-center justify-between font-mono text-[11px] text-text-muted">
            <span className="uppercase tracking-wide">Progression</span>
            <span className="tabular-nums">{Math.min(100, challenge.progress).toFixed(0)} %</span>
          </div>
          <ProgressBar percent={challenge.progress} className="mt-1.5" />
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {isComingSoon ? "À venir" : remaining > 0 ? `${remaining} jours restants` : "Terminé"}
        </span>
        {challenge.rewardAchievementId && (
          <span className="flex items-center gap-1.5">
            <Gift className="h-3.5 w-3.5 text-gold" /> Accomplissement à la clé
          </span>
        )}
      </div>
      {completionRate != null && (
        <p className="font-mono text-[10px] text-text-muted">
          {completionRate < 0.1 && completionRate > 0
            ? "< 0,1 % des entrepreneurs ont réussi ce défi"
            : `${completionRate.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % des entrepreneurs ont réussi ce défi`}
        </p>
      )}
    </div>
  );
}
