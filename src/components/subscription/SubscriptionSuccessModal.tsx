"use client";

import { Crown, Sparkles, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { GoldParticles } from "@/components/motion/GoldParticles";
import type { SubscriptionTier } from "@/types/database.types";

const TIER_CONTENT: Record<"pro" | "elite", { label: string; unlocks: string[]; ctaLabel: string; ctaHref: string }> = {
  pro: {
    label: "Pro",
    unlocks: ["Analyses avancées de ta performance", "Profil personnalisable avec des thèmes"],
    ctaLabel: "Personnaliser mon profil",
    ctaHref: "/app/settings#personnalisation",
  },
  elite: {
    label: "Elite",
    unlocks: ["Réseau de fondateurs — recherche et connecte-toi", "Fil d'opportunités avec matching intelligent"],
    ctaLabel: "Découvrir le Réseau",
    ctaHref: "/app/network",
  },
};

export function SubscriptionSuccessModal({
  open,
  onClose,
  tier,
  isTrial,
}: {
  open: boolean;
  onClose: () => void;
  tier: SubscriptionTier;
  isTrial: boolean;
}) {
  if (tier !== "pro" && tier !== "elite") return null;
  const content = TIER_CONTENT[tier];

  return (
    <Modal open={open} onClose={onClose} className="overflow-hidden">
      <div className="relative flex flex-col items-center gap-4 py-2 text-center">
        <GoldParticles count={16} burst />
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
          <Crown className="h-7 w-7 text-gold" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Bienvenue dans {content.label} !</h2>
          {isTrial && (
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-gold">
              <Sparkles className="h-3.5 w-3.5" /> Ton essai gratuit de 14 jours a commencé.
            </p>
          )}
        </div>
        <ul className="flex flex-col gap-2 self-stretch text-left">
          {content.unlocks.map((u) => (
            <li key={u} className="flex items-start gap-2 rounded-md bg-card-elevated p-3 text-sm text-text-secondary">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {u}
            </li>
          ))}
        </ul>
        <Button href={content.ctaHref} className="mt-2 w-full">
          {content.ctaLabel}
        </Button>
      </div>
    </Modal>
  );
}
