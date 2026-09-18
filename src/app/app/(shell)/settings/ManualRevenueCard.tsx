"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, XCircle, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { submitRevenueDeclarationAction } from "./actions";
import type { RevenueDeclaration } from "@/services/revenue.service";
import type { RevenueReviewStatus } from "@/types/database.types";

const STATUS_CONFIG: Record<RevenueReviewStatus, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "En attente", icon: Clock, className: "text-gold" },
  approved: { label: "Vérifié", icon: CheckCircle2, className: "text-success" },
  rejected: { label: "Refusé", icon: XCircle, className: "text-error" },
};

export function ManualRevenueCard({ declarations }: { declarations: RevenueDeclaration[] }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.show("Une preuve est obligatoire pour déclarer un revenu.", "error");

    const formData = new FormData();
    formData.set("amount", amount);
    formData.set("label", label);
    formData.set("proof", file);

    startTransition(async () => {
      const result = await submitRevenueDeclarationAction(formData);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Déclaration envoyée — en attente de vérification par un administrateur.", "success");
      setOpen(false);
      setAmount("");
      setLabel("");
      setFileName(null);
      router.refresh();
    });
  }

  const verifiedTotal = declarations
    .filter((d) => d.reviewStatus === "approved")
    .reduce((sum, d) => sum + d.amountCents, 0);
  const pendingTotal = declarations
    .filter((d) => d.reviewStatus === "pending")
    .reduce((sum, d) => sum + d.amountCents, 0);

  return (
    <div id="revenus" className="scroll-mt-6 rounded-md border border-border-strong bg-card-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Déclaration manuelle</p>
          <p className="mt-1 text-xs text-text-muted">
            Pour les entrepreneurs sans Stripe. Une déclaration par contrat ou par client — chacune est
            vérifiée séparément. Une preuve est obligatoire.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="shrink-0">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>

      {declarations.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
          {declarations.map((d) => {
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
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-xs text-text-muted">
            <span>Ce mois-ci</span>
            <span>
              {formatCurrency(verifiedTotal)} vérifiés
              {pendingTotal > 0 && ` · ${formatCurrency(pendingTotal)} en attente`}
            </span>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Déclarer un revenu">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Description" hint="Optionnel — ex : « Contrat Acme Corp »">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Contrat, client, mission..." />
          </Field>
          <Field label="Montant (€)" htmlFor="amount">
            <Input
              id="amount"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1200"
            />
          </Field>
          <Field label="Preuve" hint="Obligatoire — PDF, PNG, JPEG ou WebP, 5 Mo maximum.">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border-strong bg-card px-3.5 py-2.5 text-sm text-text-muted hover:border-gold/50 hover:text-text-secondary">
              <Upload className="h-4 w-4" />
              {fileName ?? "Choisir un fichier"}
              <input
                ref={fileRef}
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </Field>
          <Button type="submit" disabled={pending || !fileName} className="self-start">
            Envoyer cette déclaration
          </Button>
        </form>
      </Modal>
    </div>
  );
}
