"use client";

import { useState } from "react";
import { Copy, Check, Gift, Users } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function ReferralCard({
  link,
  referredCount,
  rewardedCount,
  proCreditUntil,
}: {
  link: string;
  referredCount: number;
  rewardedCount: number;
  proCreditUntil: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const hasActiveCredit = proCreditUntil != null && new Date(proCreditUntil) > new Date();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.show("Impossible de copier — copie le lien manuellement.", "error");
    }
  }

  return (
    <div id="parrainage" className="scroll-mt-6 flex flex-col gap-4">
      <p className="text-xs text-text-secondary">
        Partage ton lien : dès qu&apos;une personne invitée fait vérifier ses revenus, tu reçois 1 mois de
        Pro offert.
      </p>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="w-full min-w-0 flex-1 rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm text-text-secondary"
        />
        <button
          type="button"
          onClick={copyLink}
          aria-label="Copier le lien de parrainage"
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-3 py-2.5 text-xs font-medium text-gold hover:border-gold/60 hover:bg-gold/20"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-md border border-border-strong bg-card p-3.5">
          <Users className="h-4 w-4 shrink-0 text-text-muted" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{referredCount}</p>
            <p className="text-xs text-text-muted">Invité{referredCount > 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-md border border-border-strong bg-card p-3.5">
          <Gift className="h-4 w-4 shrink-0 text-text-muted" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{rewardedCount}</p>
            <p className="text-xs text-text-muted">Mois offert{rewardedCount > 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {hasActiveCredit && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <Gift className="h-3.5 w-3.5 shrink-0" />
          Pro offert actif jusqu&apos;au {new Date(proCreditUntil!).toLocaleDateString("fr-FR")}.
        </p>
      )}
    </div>
  );
}
