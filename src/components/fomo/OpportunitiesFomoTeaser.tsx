"use client";

import { useState } from "react";
import { UserSearch, Search, Target, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AnalysisRevealModal, type AnalysisStep } from "./AnalysisRevealModal";
import { opportunityTypeLabel } from "@/lib/opportunityDisplay";
import type { OpportunityType } from "@/types/database.types";

const GHOST_CARDS = [
  { title: "w-32", lines: ["w-full", "w-4/5"], badge: "w-16" },
  { title: "w-28", lines: ["w-full", "w-3/5"], badge: "w-20" },
  { title: "w-36", lines: ["w-5/6", "w-2/3"], badge: "w-14" },
];

function analysisSteps(count: number): AnalysisStep[] {
  return [
    { key: "profile", icon: UserSearch, label: "Analyse de ton profil et de ton activité…", duration: 1200 },
    {
      key: "scan",
      icon: Search,
      label: count > 0 ? `Scan de ${count} opportunité${count > 1 ? "s" : ""} du réseau…` : "Scan du réseau d'opportunités…",
      duration: 1300,
    },
    { key: "match", icon: Target, label: "Calcul de la meilleure correspondance…", duration: 1100 },
  ];
}

export function OpportunitiesFomoTeaser({
  count,
  topMatchScore,
  topMatchType,
}: {
  count: number;
  topMatchScore: number | null;
  topMatchType: OpportunityType | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="pointer-events-none grid grid-cols-1 gap-4 blur-sm sm:grid-cols-2 lg:grid-cols-3">
        {GHOST_CARDS.map((c, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className={`h-4 ${c.badge} rounded-full bg-gold/20`} />
            </div>
            <span className={`h-4 ${c.title} rounded bg-card-elevated`} />
            {c.lines.map((w, j) => (
              <span key={j} className={`h-3 ${w} rounded bg-card-elevated`} />
            ))}
            <span className="mt-2 h-8 w-full rounded-md bg-card-elevated" />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
          <Lock className="h-5 w-5 text-gold" />
        </div>
        <div>
          <p className="text-lg font-semibold text-text-primary">
            {count > 0
              ? `${count} opportunité${count > 1 ? "s" : ""} t'attende${count > 1 ? "nt" : ""}`
              : "Des opportunités t'attendent"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            {topMatchType
              ? `Dont une offre de type « ${opportunityTypeLabel(topMatchType)} » — réservé aux membres Elite.`
              : "Cofondateur, développeur, partenaire, growth — réservé aux membres Elite."}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Sparkles className="h-4 w-4" /> Lancer l&apos;analyse de mon profil
        </Button>
      </div>

      <AnalysisRevealModal
        open={open}
        onClose={() => setOpen(false)}
        steps={analysisSteps(count)}
        resultHeadline={
          topMatchScore != null ? "Une opportunité te correspond parfaitement !" : "De nouvelles opportunités chaque semaine"
        }
        resultScore={topMatchScore}
        resultScoreLabel={topMatchScore != null ? "de compatibilité" : undefined}
        resultSubtext={
          topMatchScore != null
            ? "Passe Elite pour découvrir qui la propose et postuler dès aujourd'hui."
            : "Passe Elite pour être alerté dès qu'une opportunité correspond à ton profil."
        }
        ctaLabel={topMatchScore != null ? "Débloquer cette opportunité" : "Devenir membre Elite"}
        ctaHref="/app/settings#abonnement"
      />
    </div>
  );
}
