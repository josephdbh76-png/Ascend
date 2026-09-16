"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, XCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { submitManualRevenueAction } from "./actions";
import type { RevenueReviewStatus } from "@/types/database.types";

const STATUS_CONFIG: Record<RevenueReviewStatus, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "en cours de vérification", icon: Clock, className: "text-gold" },
  approved: { label: "vérifiés", icon: CheckCircle2, className: "text-success" },
  rejected: { label: "refusés", icon: XCircle, className: "text-error" },
};

export function ManualRevenueCard({
  currentDeclaredAmountCents,
  currentReviewStatus,
  rejectionReason,
}: {
  /** This month's already-declared amount, if any — null if nothing declared yet this month. */
  currentDeclaredAmountCents: number | null;
  currentReviewStatus: RevenueReviewStatus | null;
  rejectionReason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
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
    formData.set("proof", file);

    startTransition(async () => {
      const result = await submitManualRevenueAction(formData);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Revenu déclaré — en attente de vérification par un administrateur.", "success");
      setOpen(false);
      setAmount("");
      setFileName(null);
      router.refresh();
    });
  }

  const status = currentDeclaredAmountCents != null ? STATUS_CONFIG[currentReviewStatus ?? "pending"] : null;

  return (
    <div id="revenus" className="scroll-mt-6 rounded-md border border-border-strong bg-card-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Déclaration manuelle</p>
          {status ? (
            <p className={`mt-1 flex items-center gap-1.5 text-sm ${status.className}`}>
              <status.icon className="h-3.5 w-3.5" />
              {formatCurrency(currentDeclaredAmountCents!)} déclarés, {status.label}
            </p>
          ) : (
            <p className="mt-1 text-sm text-text-muted">Aucune déclaration ce mois-ci</p>
          )}
          {currentReviewStatus === "rejected" && rejectionReason && (
            <p className="mt-1 text-xs text-error">Raison : {rejectionReason}</p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Pour les entrepreneurs sans Stripe. Une preuve est obligatoire ; un administrateur vérifie chaque
            déclaration avant qu&apos;elle ne compte comme un revenu vérifié.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="shrink-0">
          Déclarer
        </Button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Déclarer mes revenus du mois">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Revenu mensuel (€)" htmlFor="amount">
            <Input
              id="amount"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="2500"
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
            Enregistrer
          </Button>
        </form>
      </Modal>
    </div>
  );
}
