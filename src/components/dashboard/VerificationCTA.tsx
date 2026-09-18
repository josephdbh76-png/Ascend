"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { Link2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FrameCorners } from "@/components/ui/FrameCorners";

export function VerificationCTA({
  remainingFoundingSlots,
  foundingSupply,
}: {
  remainingFoundingSlots: number | null;
  foundingSupply: number | null;
}) {
  const reduced = useReducedMotionSafe();
  const scarce =
    remainingFoundingSlots != null && foundingSupply != null && remainingFoundingSlots > 0
      ? remainingFoundingSlots
      : null;

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-start gap-4 border border-gold/30 bg-gold/[0.04] p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <FrameCorners />
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h2 className="font-display text-lg font-medium text-text-primary">Commence maintenant à Ascend.</h2>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
          Connecte Stripe pour vérifier tes revenus, débloquer ton rang dans le classement et rejoindre
          les fondateurs déjà en compétition.
        </p>
        {scarce != null && (
          <p className="mt-2 font-mono text-xs font-medium text-gold">
            Plus que {scarce} place{scarce > 1 ? "s" : ""} sur {foundingSupply} pour devenir Membre
            Fondateur.
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <Button href="/api/stripe/connect" className="shrink-0">
          <Link2 className="h-4 w-4" /> Connecter Stripe
        </Button>
        <Link href="/app/settings#revenus" className="text-xs text-text-muted hover:text-text-primary">
          Pas Stripe ? Déclare tes revenus manuellement
        </Link>
      </div>
    </motion.div>
  );
}
