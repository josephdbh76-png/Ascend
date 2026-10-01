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
import {
  adminApproveRevenueDeclarationAction,
  adminApproveRevenueDeclarationsAction,
  adminRejectRevenueDeclarationAction,
} from "./actions";
import type { PendingRevenueReview } from "@/services/revenue.service";

const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const monthLabel = (period: string) => {
  const m = MONTH.format(new Date(`${period}T00:00:00Z`));
  return m.charAt(0).toUpperCase() + m.slice(1);
};

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

  function approveAll(ids: string[]) {
    startTransition(async () => {
      const result = await adminApproveRevenueDeclarationsAction(ids);
      if (!result.success) return toast.show(result.error, "error");
      toast.show(`${result.data.count} mois approuvés.`, "success");
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

  // One card per proof: an export can back several months of the same member.
  const groups = new Map<string, PendingRevenueReview[]>();
  for (const r of reviews) {
    const key = `${r.userId}:${r.proofPath}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div className="flex flex-col gap-3">
      {[...groups.values()].map((group) => {
        const first = group[0];
        const sorted = [...group].sort((a, b) => (a.period < b.period ? 1 : -1));
        const total = group.reduce((sum, r) => sum + r.amountCents, 0);
        return (
          <Card key={`${first.userId}:${first.proofPath}`} className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {first.firstName} {first.lastName} <span className="text-text-muted">@{first.username}</span>
                </p>
                <p className="text-xs text-text-muted">
                  {group.length > 1 ? `${group.length} mois avec le même justificatif · ${formatCurrency(total)} au total` : ""}
                  {group.length > 1 ? " · " : ""}Envoyé {timeAgo(first.submittedAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {first.proofUrl ? (
                  <a
                    href={first.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-2 rounded-md border border-border-strong bg-card-elevated px-3 text-xs font-medium text-text-primary hover:bg-card-active"
                  >
                    <FileText className="h-3.5 w-3.5" /> Voir le justificatif
                  </a>
                ) : (
                  <span className="text-xs text-text-muted">Aucune preuve</span>
                )}
                {group.length > 1 && (
                  <Button size="sm" onClick={() => approveAll(group.map((r) => r.declarationId))} disabled={pending}>
                    <Check className="h-3.5 w-3.5" /> Valider les {group.length} mois
                  </Button>
                )}
              </div>
            </div>
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {sorted.map((r) => (
                <li key={r.declarationId} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">{monthLabel(r.period)}</span> · {formatCurrency(r.amountCents)}
                    {r.label && ` · ${r.label}`}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => approve(r.declarationId)} disabled={pending}>
                      <Check className="h-3.5 w-3.5" /> Approuver
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setRejectTarget(r)} disabled={pending}>
                      <X className="h-3.5 w-3.5" /> Refuser
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

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
