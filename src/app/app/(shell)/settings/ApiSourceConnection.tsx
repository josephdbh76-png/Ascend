"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Unlink, Link2, ListChecks, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { useToast } from "@/components/ui/Toast";
import type { ConnectorMeta } from "@/lib/connectors";
import type { VerificationStatus } from "@/types/database.types";
import { connectApiSourceAction, syncApiSourceAction, disconnectApiSourceAction } from "./actions";

export interface ApiSourceState {
  connected: boolean;
  status: VerificationStatus;
  accountLabel: string | null;
  errorMessage: string | null;
}

export function ApiSourceConnection({
  meta,
  state,
  initiallyOpen = false,
}: {
  meta: ConnectorMeta;
  state: ApiSourceState;
  initiallyOpen?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(initiallyOpen && !state.connected);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const complete = meta.fields.every((f) => values[f.key]?.trim());

  function afterSync(data: { isFirstVerification: boolean; monthsSynced: number }, connectedNow: boolean) {
    if (data.isFirstVerification) return router.push("/app/verification");
    if (meta.reviewsTransactions && data.monthsSynced === 0) {
      toast.show(`${meta.name} connecté. Vérifie les virements comptés comme revenu.`, "success");
      return router.push(`/app/settings/transactions?source=${meta.id}`);
    }
    toast.show(
      connectedNow
        ? `${meta.name} connecté : ${data.monthsSynced} mois de revenus synchronisés.`
        : `${data.monthsSynced} mois de revenus synchronisés.`,
      "success",
    );
    router.refresh();
  }

  function connect(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await connectApiSourceAction(meta.id, values);
      if (!result.success) return toast.show(result.error, "error");
      setValues({});
      setShowForm(false);
      afterSync(result.data, true);
    });
  }

  function sync() {
    startTransition(async () => {
      const result = await syncApiSourceAction(meta.id);
      if (!result.success) return toast.show(result.error, "error");
      afterSync(result.data, false);
    });
  }

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectApiSourceAction(meta.id);
      if (!result.success) return toast.show(result.error, "error");
      toast.show(`${meta.name} déconnecté.`, "success");
      router.refresh();
    });
  }

  return (
    <div id={`source-${meta.id}`} className="flex flex-col gap-3 rounded-md border border-border-strong bg-card-elevated p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {meta.name}
            {state.connected && state.accountLabel && (
              <span className="ml-2 text-xs font-normal text-text-muted">{state.accountLabel}</span>
            )}
          </p>
          {state.connected ? (
            <div className="mt-1">
              <VerificationBadge status={state.status} />
              {state.errorMessage && state.status !== "verified" && (
                <p className="mt-1 text-xs text-text-muted">{state.errorMessage}</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-xs text-text-muted">{meta.tagline}</p>
          )}
        </div>
        {state.connected ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {meta.reviewsTransactions && (
              <Button href={`/app/settings/transactions?source=${meta.id}`} variant="secondary" size="sm">
                <ListChecks className="h-3.5 w-3.5" /> Mes transactions
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={sync} disabled={pending}>
              <RefreshCw className="h-3.5 w-3.5" /> Resynchroniser
            </Button>
            <Button variant="danger" size="sm" onClick={disconnect} disabled={pending}>
              <Unlink className="h-3.5 w-3.5" /> Déconnecter
            </Button>
          </div>
        ) : !showForm ? (
          <Button size="sm" onClick={() => setShowForm(true)} className="shrink-0">
            <Link2 className="h-3.5 w-3.5" /> Connecter
          </Button>
        ) : null}
      </div>

      {!state.connected && showForm && (
        <form onSubmit={connect} className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="rounded border border-border bg-card p-3 text-xs leading-relaxed text-text-muted">
            <p className="font-medium text-text-secondary">Comment connecter {meta.name} :</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              {meta.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-2 flex items-start gap-1.5">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-success" />
              Lecture seule. Ta clé est chiffrée et sert uniquement à lire tes ventes.
            </p>
          </div>
          <div className={meta.fields.length > 1 ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : undefined}>
            {meta.fields.map((f) => (
              <Field key={f.key} label={f.label}>
                <Input
                  type={f.secret ? "password" : "text"}
                  autoComplete="off"
                  spellCheck={false}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  required
                />
              </Field>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending || !complete}>
              <Link2 className="h-3.5 w-3.5" /> {pending ? "Vérification..." : "Vérifier et connecter"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={pending}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
