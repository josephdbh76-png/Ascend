"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { Crown, Link2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function VerificationCTA({ foundingMemberNumber }: { foundingMemberNumber: number | null }) {
  const reduced = useReducedMotionSafe();

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-start gap-4 rounded-lg border border-gold/30 bg-gradient-to-br from-gold/[0.07] to-transparent p-6 shadow-[0_0_0_1px_rgba(245,196,81,0.05)] transition-shadow duration-200 hover:shadow-[0_12px_36px_rgba(245,196,81,0.12)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h2 className="text-base font-semibold text-text-primary">Vérifie tes revenus pour entrer au classement</h2>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Connecte ta source de revenus : ton rang, ta croissance et tes premiers accomplissements
          apparaissent en quelques secondes.
        </p>
        {foundingMemberNumber != null && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gold">
            <Crown className="h-3.5 w-3.5" />
            Tu es le membre fondateur n°{foundingMemberNumber}. Ton titre se débloque dès ta première
            vérification.
          </p>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-text-muted">
          <ShieldCheck className="h-3.5 w-3.5" /> ASCEND lit tes ventes, sans jamais pouvoir effectuer de
          paiement ni de virement.
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <Button href="/api/stripe/connect" className="shrink-0">
          <Link2 className="h-4 w-4" /> Connecter Stripe
        </Button>
        <Link href="/app/settings#comptes-connectes" className="text-xs text-text-muted hover:text-text-primary">
          PayPal, Shopify, banque ou déclaration manuelle
        </Link>
      </div>
    </motion.div>
  );
}
