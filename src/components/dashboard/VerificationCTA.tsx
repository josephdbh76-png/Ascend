"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Link2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function VerificationCTA({
  remainingFoundingSlots,
  foundingSupply,
}: {
  remainingFoundingSlots: number | null;
  foundingSupply: number | null;
}) {
  const reduced = useReducedMotion();
  const scarce =
    remainingFoundingSlots != null && foundingSupply != null && remainingFoundingSlots > 0
      ? remainingFoundingSlots
      : null;

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-start gap-4 rounded-lg border border-gold/30 bg-gradient-to-br from-gold/[0.07] to-transparent p-6 shadow-[0_0_0_1px_rgba(245,196,81,0.05)] transition-shadow duration-200 hover:shadow-[0_12px_36px_rgba(245,196,81,0.12)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h2 className="text-base font-semibold text-text-primary">Commence maintenant à Ascend.</h2>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Connecte Stripe pour vérifier tes revenus, débloquer ton rang dans le classement et rejoindre
          les fondateurs déjà en compétition.
        </p>
        {scarce != null && (
          <p className="mt-2 text-xs font-medium text-gold">
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
