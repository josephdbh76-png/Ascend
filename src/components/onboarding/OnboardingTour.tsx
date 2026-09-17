"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, Trophy, Flag, Users, Compass, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GoldParticles } from "@/components/motion/GoldParticles";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { markTutorialSeenAction } from "@/app/app/(shell)/actions";

interface Step {
  key: string;
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
}

export function OnboardingTour({
  firstName,
  memberCount,
  isVerified,
}: {
  firstName: string | null;
  /** Real, current non-demo member count — never a made-up figure. */
  memberCount: number;
  isVerified: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const reduced = useReducedMotionSafe();
  const router = useRouter();

  const steps: Step[] = [
    {
      key: "welcome",
      icon: Sparkles,
      title: `Bienvenue sur ASCEND${firstName ? `, ${firstName}` : ""} !`,
      description: "On te fait visiter en 30 secondes — trois raisons d'y rester, deux qui n'attendent que toi.",
    },
    {
      key: "dashboard",
      icon: TrendingUp,
      title: "Ton tableau de bord",
      description: "Revenus vérifiés, croissance, prochain palier : tout ce que tu dois savoir sur ton activité, en un coup d'œil.",
    },
    {
      key: "classement",
      icon: Trophy,
      title: "Le classement",
      description: `Rejoins ${memberCount > 0 ? `${memberCount} autres fondateurs` : "les fondateurs"} déjà classés — mondial, par pays, par activité.`,
    },
    {
      key: "defis",
      icon: Flag,
      title: "Défis & Titres",
      description: "De ta première vente à tes 100K€ mensuels — des défis à chaque étape, et des titres à collectionner.",
    },
    {
      key: "reseau",
      icon: Users,
      eyebrow: "ELITE",
      title: "Le réseau de fondateurs",
      description: "Recherche et connecte-toi avec des fondateurs de ton secteur — réservé aux membres Elite.",
    },
    {
      key: "opportunites",
      icon: Compass,
      eyebrow: "ELITE",
      title: "Les opportunités",
      description: "Cofondateur, développeur, partenaire — un matching intelligent te propose les meilleures offres du réseau.",
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  function close() {
    setOpen(false);
    markTutorialSeenAction();
  }

  function next() {
    if (!isLast) return setStep((s) => s + 1);
    setOpen(false);
    markTutorialSeenAction();
    if (!isVerified) router.push("/app/settings#revenus");
  }

  return (
    <Modal open={open} onClose={close} className="overflow-hidden">
      <div className="relative flex min-h-[320px] flex-col">
        {isLast && <GoldParticles count={12} burst />}

        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.key}
              initial={reduced ? undefined : { opacity: 0, y: 8 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
                <current.icon className="h-6 w-6 text-gold" />
              </div>
              {current.eyebrow && <Badge variant="gold">{current.eyebrow}</Badge>}
              <h2 className="text-lg font-semibold text-text-primary">{current.title}</h2>
              <p className="max-w-sm text-sm text-text-secondary">{current.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex justify-center gap-1.5">
            {steps.map((s, i) => (
              <span key={s.key} className={`h-1 w-6 rounded-full transition-colors ${i <= step ? "bg-gold" : "bg-border"}`} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-3.5 w-3.5" /> Précédent
              </Button>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={next}>
              {isLast ? (isVerified ? "C'est parti" : "Vérifier mes revenus") : "Suivant"}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        {isLast && !isVerified && (
          <p className="mt-2 text-center text-[11px] text-text-muted">
            Tu pourras aussi le faire plus tard depuis Réglages.
          </p>
        )}
      </div>
    </Modal>
  );
}
