"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { adminUpdateElitePricingAction } from "./actions";
import type { ElitePriceUpdateResult } from "@/services/subscription.service";

export function ElitePricingPanel() {
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<ElitePriceUpdateResult[] | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const toast = useToast();

  function sync() {
    startTransition(async () => {
      const result = await adminUpdateElitePricingAction();
      if (!result.success) return toast.show(result.error, "error");
      setResults(result.data);
    });
  }

  function copy(envVar: string, priceId: string) {
    navigator.clipboard.writeText(priceId).then(() => {
      setCopiedVar(envVar);
      setTimeout(() => setCopiedVar(null), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" size="sm" onClick={sync} disabled={pending} className="shrink-0 self-start">
        <RefreshCw className="h-3.5 w-3.5" /> Créer les nouveaux prix Elite (39€/mois)
      </Button>

      {results && (
        <div className="flex flex-col gap-2 rounded-md border border-border-strong bg-card-elevated p-3">
          <p className="text-xs text-text-secondary">
            Mets à jour ces variables d&apos;environnement dans Vercel (type Config, scope Production), puis
            redéploie. Les abonnés déjà Elite gardent leur prix actuel jusqu&apos;à leur prochain renouvellement.
          </p>
          {results.map((r) => (
            <div key={r.envVar} className="flex items-center justify-between gap-3 rounded bg-card px-3 py-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-text-primary">{r.envVar}</p>
                <p className="truncate text-xs text-text-muted">
                  {formatCurrency(r.amountCents)} / {r.interval === "month" ? "mois" : "an"} —{" "}
                  <span className="font-mono">{r.priceId}</span>
                </p>
              </div>
              <button
                onClick={() => copy(r.envVar, r.priceId)}
                className="flex shrink-0 items-center gap-1 rounded-md border border-border-strong px-2 py-1 text-xs text-text-secondary hover:bg-card-active"
              >
                {copiedVar === r.envVar ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copiedVar === r.envVar ? "Copié" : "Copier"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
