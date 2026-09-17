"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { adminSyncAnnualPricesAction } from "./actions";
import type { AnnualPriceSyncResult } from "@/services/subscription.service";

export function AnnualPriceSyncPanel() {
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<AnnualPriceSyncResult[] | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const toast = useToast();

  function sync() {
    startTransition(async () => {
      const result = await adminSyncAnnualPricesAction();
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
        <RefreshCw className="h-3.5 w-3.5" /> Synchroniser les prix annuels avec Stripe
      </Button>

      {results && (
        <div className="flex flex-col gap-2 rounded-md border border-border-strong bg-card-elevated p-3">
          <p className="text-xs text-text-secondary">
            Ajoute ces variables d&apos;environnement dans Vercel (type Config, scope Production), puis
            redéploie.
          </p>
          {results.map((r) => (
            <div key={r.envVar} className="flex items-center justify-between gap-3 rounded bg-card px-3 py-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-text-primary">{r.envVar}</p>
                <p className="truncate font-mono text-xs text-text-muted">{r.priceId}</p>
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
