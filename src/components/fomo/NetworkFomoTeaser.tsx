"use client";

import { useState } from "react";
import { UserSearch, Search, Users, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AnalysisRevealModal, type AnalysisStep } from "./AnalysisRevealModal";
import { BUSINESS_CATEGORIES } from "@/lib/constants";

function categoryLabel(value: string) {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const GHOST_ROWS = ["w-40", "w-36", "w-44", "w-32", "w-40", "w-36"];

function analysisSteps(totalActive: number): AnalysisStep[] {
  return [
    { key: "profile", icon: UserSearch, label: "Analyse de ton profil et de ton secteur…", duration: 1200 },
    {
      key: "scan",
      icon: Search,
      label: totalActive > 0 ? `Scan de ${totalActive} fondateurs actifs…` : "Scan du réseau ASCEND…",
      duration: 1300,
    },
    { key: "match", icon: Users, label: "Recherche des profils les plus pertinents…", duration: 1100 },
  ];
}

export function NetworkFomoTeaser({
  totalActive,
  sameCategoryCount,
  category,
}: {
  totalActive: number;
  sameCategoryCount: number;
  category: string | null;
}) {
  const [open, setOpen] = useState(false);
  const hasCategoryMatch = category != null && sameCategoryCount > 0;

  return (
    <div className="relative">
      <div className="pointer-events-none grid grid-cols-1 gap-3 blur-sm sm:grid-cols-2">
        {GHOST_ROWS.map((w, i) => (
          <div key={i} className="flex items-center gap-3 border border-border bg-card p-4">
            <span className="h-10 w-10 shrink-0 border border-border-strong bg-card-elevated" />
            <div className="flex flex-1 flex-col gap-2">
              <span className={`h-3.5 ${w} bg-card-elevated`} />
              <span className="h-3 w-24 bg-card-elevated" />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center border border-gold/30 bg-gold/10">
          <Lock className="h-5 w-5 text-gold" />
        </div>
        <div>
          <p className="font-display text-xl font-medium text-text-primary">
            {totalActive > 0 ? `${totalActive} fondateurs sur ASCEND` : "Le réseau des fondateurs ASCEND"}
          </p>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-text-secondary">
            {hasCategoryMatch
              ? `Dont ${sameCategoryCount} en ${categoryLabel(category!)} — recherche, suis et échange avec eux.`
              : "Recherche par nom, ville ou activité, et connecte-toi avec eux — réservé aux membres Elite."}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Sparkles className="h-4 w-4" /> Lancer l&apos;analyse de mon réseau
        </Button>
      </div>

      <AnalysisRevealModal
        open={open}
        onClose={() => setOpen(false)}
        steps={analysisSteps(totalActive)}
        resultIcon={Users}
        resultHeadline={
          hasCategoryMatch
            ? `${sameCategoryCount} fondateurs ${categoryLabel(category!)} près de toi !`
            : "Des fondateurs t'attendent sur ASCEND"
        }
        resultScore={hasCategoryMatch ? sameCategoryCount : null}
        resultScoreFormat={(n) => `${Math.round(n)}`}
        resultSubtext="Passe Elite pour parcourir le réseau, suivre des fondateurs et échanger en message privé."
        ctaLabel="Débloquer le Réseau"
        ctaHref="/app/settings#abonnement"
      />
    </div>
  );
}
