"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Info, Stethoscope, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { DiagnosticCheck, CheckStatus } from "@/services/stripeDiagnostic.service";
import { runStripeDiagnosticAction } from "./actions";

const ICON: Record<CheckStatus, { icon: typeof Info; className: string }> = {
  ok: { icon: CheckCircle2, className: "text-success" },
  warn: { icon: AlertTriangle, className: "text-gold" },
  error: { icon: XCircle, className: "text-error" },
  info: { icon: Info, className: "text-text-muted" },
};

export function StripeDiagnosticPanel() {
  const [checks, setChecks] = useState<DiagnosticCheck[] | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function run() {
    startTransition(async () => {
      const result = await runStripeDiagnosticAction();
      if (!result.success) return toast.show(result.error, "error");
      setChecks(result.data);
    });
  }

  const groups = checks ? [...new Set(checks.map((c) => c.group))] : [];
  const errors = checks?.filter((c) => c.status === "error").length ?? 0;
  const warnings = checks?.filter((c) => c.status === "warn").length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-secondary">
          Vérifie ton compte, les prix, le webhook, le portail client et les comptes vendeurs. Lecture seule : rien n&apos;est modifié chez
          Stripe.
        </p>
        <Button size="sm" onClick={run} disabled={pending} className="shrink-0">
          <Stethoscope className="h-3.5 w-3.5" /> {pending ? "Vérification..." : "Lancer le diagnostic"}
        </Button>
      </div>
      {checks && (
        <>
          <p className={cn("text-sm font-medium", errors ? "text-error" : warnings ? "text-gold" : "text-success")}>
            {errors ? `${errors} problème(s) à corriger` : warnings ? "Aucun blocage" : "Tout est en ordre"}
            {warnings ? ` · ${warnings} amélioration(s) conseillée(s)` : ""}
          </p>
          {groups.map((g) => (
            <section key={g} className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{g}</h3>
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {checks
                  .filter((c) => c.group === g)
                  .map((c, i) => {
                    const { icon: Icon, className } = ICON[c.status];
                    return (
                      <li key={`${g}-${i}`} className="flex items-start gap-2.5 px-3 py-2 text-sm">
                        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", className)} />
                        <span className="min-w-0">
                          <span className="font-medium text-text-primary">{c.label}</span>
                          <span className="block break-words text-xs text-text-secondary">{c.detail}</span>
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
