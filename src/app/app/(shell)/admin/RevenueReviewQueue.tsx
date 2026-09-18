"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { adminApproveRevenueDeclarationAction, adminRejectRevenueDeclarationAction } from "./actions";
import type { PendingRevenueReview } from "@/services/revenue.service";

export function RevenueReviewQueue({ reviews }: { reviews: PendingRevenueReview[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [rejectTarget, setRejectTarget] = useState<PendingRevenueReview | null>(null);
  const [reason, setReason] = useState("");

  function approve(declarationId: string) {
    startTransition(async () => {
      const result = await adminApproveRevenueDeclarationAction(declarationId);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Déclaration approuvée.", "success");
      router.refresh();
    });
  }

  function submitReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectTarget) return;
    startTransition(async () => {
      const result = await adminRejectRevenueDeclarationAction(rejectTarget.declarationId, reason);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Déclaration refusée.", "success");
      setRejectTarget(null);
      setReason("");
      router.refresh();
    });
  }

  if (reviews.length === 0) {
    return <EmptyState title="Aucune déclaration en attente de vérification." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((r) => (
        <Card key={r.declarationId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              {r.firstName} {r.lastName} <span className="text-text-muted">@{r.username}</span>
            </p>
            <p className="text-sm text-text-secondary">
              {formatCurrency(r.amountCents)}
              {r.label && ` — ${r.label}`} — {r.period.slice(0, 7)}
            </p>
            <p className="text-xs text-text-muted">Envoyé {timeAgo(r.submittedAt)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {r.proofUrl ? (
              <a
                href={r.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-2 border border-border-strong bg-card-elevated px-3 text-xs font-medium text-text-primary hover:bg-card-active"
              >
                <FileText className="h-3.5 w-3.5" /> Voir la preuve
              </a>
            ) : (
              <span className="text-xs text-text-muted">Aucune preuve</span>
            )}
            <Button size="sm" onClick={() => approve(r.declarationId)} disabled={pending}>
              <Check className="h-3.5 w-3.5" /> Approuver
            </Button>
            <Button variant="danger" size="sm" onClick={() => setRejectTarget(r)} disabled={pending}>
              <X className="h-3.5 w-3.5" /> Refuser
            </Button>
          </div>
        </Card>
      ))}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Refuser cette déclaration">
        <form onSubmit={submitReject} className="flex flex-col gap-4">
          <Field label="Raison du refus" hint="Visible par le membre.">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required />
          </Field>
          <Button type="submit" variant="danger" disabled={pending} className="self-start">
            Confirmer le refus
          </Button>
        </form>
      </Modal>
    </div>
  );
}
