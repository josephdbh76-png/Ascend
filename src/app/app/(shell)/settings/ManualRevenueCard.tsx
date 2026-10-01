"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, XCircle, Upload, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { submitRevenueDeclarationAction } from "./actions";
import { uploadThen } from "@/lib/uploadClient";
import type { RevenueDeclaration } from "@/services/revenue.service";
import type { RevenueReviewStatus } from "@/types/database.types";

const STATUS_CONFIG: Record<RevenueReviewStatus, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "En attente", icon: Clock, className: "text-gold" },
  approved: { label: "Vérifié", icon: CheckCircle2, className: "text-success" },
  rejected: { label: "Refusé", icon: XCircle, className: "text-error" },
};

const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const monthLabel = (period: string) => {
  const m = MONTH.format(new Date(`${period}T00:00:00Z`));
  return m.charAt(0).toUpperCase() + m.slice(1);
};

/** The current month and the 11 before it, newest first. */
function declarableMonths(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 10),
  );
}

type Row = { key: string; period: string; amount: string };
const newRow = (period: string): Row => ({ key: crypto.randomUUID(), period, amount: "" });
const parseAmount = (v: string) => Number.parseFloat(v.replace(/\s/g, "").replace(",", "."));

export function ManualRevenueCard({ declarations }: { declarations: RevenueDeclaration[] }) {
  const months = declarableMonths();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => [newRow(months[1])]);
  const [label, setLabel] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const used = new Set(rows.map((r) => r.period));
  const total = rows.reduce((sum, r) => sum + (parseAmount(r.amount) > 0 ? parseAmount(r.amount) : 0), 0);
  const complete = rows.length > 0 && rows.every((r) => parseAmount(r.amount) > 0) && !!fileName;

  function addRow() {
    const next = months.find((m) => !used.has(m));
    if (next) setRows((prev) => [...prev, newRow(next)]);
  }

  function reset() {
    setOpen(false);
    setRows([newRow(months[1])]);
    setLabel("");
    setFileName(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.show("Une preuve est obligatoire pour déclarer un revenu.", "error");
    startTransition(async () => {
      const result = await uploadThen("revenue-proof", file, (proofPath) =>
        submitRevenueDeclarationAction({ entries: rows.map((r) => ({ period: r.period, amount: r.amount })), label, proofPath }),
      );
      if (!result.success) return toast.show(result.error, "error");
      toast.show(
        result.data.count > 1
          ? `${result.data.count} mois envoyés. Un administrateur les vérifie sous peu.`
          : "Déclaration envoyée. Un administrateur la vérifie sous peu.",
        "success",
      );
      reset();
      router.refresh();
    });
  }

  // History, grouped by month (newest first).
  const byMonth = new Map<string, RevenueDeclaration[]>();
  for (const d of declarations) byMonth.set(d.period, [...(byMonth.get(d.period) ?? []), d]);

  return (
    <div id="revenus" className="scroll-mt-6 rounded-md border border-border-strong bg-card-elevated p-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">Déclaration manuelle</p>
          <p className="mt-1 text-xs text-text-muted">
            Sans rien connecter : tu déclares tes revenus mois par mois, avec un justificatif, et l&apos;équipe les vérifie. Tu peux
            déclarer jusqu&apos;à 12 mois en arrière pour avoir ton historique.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="shrink-0">
          <Plus className="h-3.5 w-3.5" /> Déclarer
        </Button>
      </div>

      {byMonth.size > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3">
          {[...byMonth.entries()].map(([period, items]) => {
            const verified = items.filter((d) => d.reviewStatus === "approved").reduce((sum, d) => sum + d.amountCents, 0);
            const waiting = items.filter((d) => d.reviewStatus === "pending").reduce((sum, d) => sum + d.amountCents, 0);
            return (
              <div key={period} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium text-text-secondary">{monthLabel(period)}</span>
                  <span className="text-text-muted">
                    {formatCurrency(verified)} vérifiés{waiting > 0 && ` · ${formatCurrency(waiting)} en attente`}
                  </span>
                </div>
                {items.map((d) => {
                  const status = STATUS_CONFIG[d.reviewStatus];
                  return (
                    <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <span className="text-text-primary">{d.label || "Revenu déclaré"}</span>
                        {d.reviewStatus === "rejected" && d.rejectionReason && (
                          <p className="text-xs text-error">Raison : {d.rejectionReason}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="tabular-nums text-text-secondary">{formatCurrency(d.amountCents)}</span>
                        <span className={`flex items-center gap-1 text-xs ${status.className}`}>
                          <status.icon className="h-3.5 w-3.5" /> {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => (pending ? undefined : reset())} title="Déclarer des revenus">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-primary">Mois et montants</span>
            {rows.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    aria-label={`Mois ${i + 1}`}
                    value={r.period}
                    onChange={(e) => setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, period: e.target.value } : x)))}
                  >
                    {months.map((m) => (
                      <option key={m} value={m} disabled={m !== r.period && used.has(m)}>
                        {monthLabel(m)}
                        {m === months[0] ? " (en cours)" : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-32 shrink-0">
                  <Input
                    aria-label={`Montant de ${monthLabel(r.period)} en euros`}
                    inputMode="decimal"
                    value={r.amount}
                    onChange={(e) => setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, amount: e.target.value } : x)))}
                    placeholder="Montant €"
                    required
                  />
                </div>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                    className="rounded-md p-2 text-text-muted hover:text-error"
                    aria-label={`Retirer ${monthLabel(r.period)}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {rows.length < months.length && (
              <Button type="button" variant="secondary" size="sm" onClick={addRow} className="self-start">
                <Plus className="h-3.5 w-3.5" /> Ajouter un mois
              </Button>
            )}
          </div>
          <Field label="Description" hint="Optionnel, par exemple « Ventes Whop » ou « Contrat Acme »">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ventes, client, mission..." />
          </Field>
          <Field
            label="Justificatif"
            hint="Obligatoire. Un seul fichier peut couvrir tous ces mois : l'export de tes paiements (Whop, Stripe...), une capture de ton tableau de bord avec les montants par mois, ou tes relevés. PDF, image ou CSV, 10 Mo maximum."
          >
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border-strong bg-card px-3.5 py-2.5 text-sm text-text-muted hover:border-gold/50 hover:text-text-secondary">
              <Upload className="h-4 w-4" />
              {fileName ?? "Choisir un fichier"}
              <input
                ref={fileRef}
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.webp,.csv"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </Field>
          <p className="rounded-md border border-border bg-card p-3 text-xs text-text-secondary">
            {rows.length} mois · {formatCurrency(Math.round(total * 100))} au total. Chaque mois est vérifié par l&apos;équipe avant de compter.
          </p>
          <Button type="submit" disabled={pending || !complete} className="self-start">
            {pending ? "Envoi..." : "Envoyer pour vérification"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
