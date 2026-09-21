"use client";

import { useState, useTransition } from "react";
import { Plus, Copy, Check, ChevronDown, ChevronUp, Power, Banknote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import {
  createInfluencerAction,
  setInfluencerStatusAction,
  listInfluencerCommissionsAction,
  markCommissionPaidAction,
} from "./actions";
import type { InfluencerRow, InfluencerCommissionRow } from "@/services/influencer.service";

export function InfluencerProgramPanel({ influencers: initial }: { influencers: InfluencerRow[] }) {
  const [influencers, setInfluencers] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<InfluencerCommissionRow[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function create(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createInfluencerAction(name, email, code);
      if (!result.success) return toast.show(result.error, "error");
      setInfluencers((prev) => [result.data, ...prev]);
      toast.show(`Code "${result.data.code}" créé.`, "success");
      setModalOpen(false);
      setName("");
      setEmail("");
      setCode("");
    });
  }

  function toggleStatus(influencer: InfluencerRow) {
    const nextStatus = influencer.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      const result = await setInfluencerStatusAction(influencer.id, nextStatus);
      if (!result.success) return toast.show(result.error, "error");
      setInfluencers((prev) => prev.map((i) => (i.id === influencer.id ? { ...i, status: nextStatus } : i)));
      toast.show(nextStatus === "active" ? "Code réactivé." : "Code désactivé.", "success");
    });
  }

  function toggleExpand(influencerId: string) {
    if (expandedId === influencerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(influencerId);
    setLoadingCommissions(true);
    startTransition(async () => {
      const result = await listInfluencerCommissionsAction(influencerId);
      setLoadingCommissions(false);
      if (!result.success) return toast.show(result.error, "error");
      setCommissions(result.data);
    });
  }

  function markPaid(commissionId: string, influencerId: string) {
    startTransition(async () => {
      const result = await markCommissionPaidAction(commissionId);
      if (!result.success) return toast.show(result.error, "error");
      setCommissions((prev) =>
        prev.map((c) => (c.id === commissionId ? { ...c, status: "paid", paidAt: new Date().toISOString() } : c)),
      );
      setInfluencers((prev) =>
        prev.map((i) => {
          if (i.id !== influencerId) return i;
          const commission = commissions.find((c) => c.id === commissionId);
          const amount = commission?.amountCents ?? 0;
          return { ...i, pendingCents: i.pendingCents - amount, paidCents: i.paidCents + amount };
        }),
      );
      toast.show("Commission marquée comme payée.", "success");
    });
  }

  function copyCode(influencerId: string, code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(influencerId);
      setTimeout(() => setCopiedId((id) => (id === influencerId ? null : id)), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          Chaque code donne -10% à vie à l&apos;abonné, et te rappelle de verser une commission
          {influencers[0] ? ` (${Math.round(influencers[0].commissionRate * 100)}% par défaut)` : ""} sur son premier
          paiement.
        </p>
        <Button size="sm" onClick={() => setModalOpen(true)} className="shrink-0">
          <Plus className="h-3.5 w-3.5" /> Nouveau code
        </Button>
      </div>

      {influencers.length === 0 ? (
        <p className="text-xs text-text-muted">Aucun influenceur pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {influencers.map((i) => (
            <div key={i.id} className="rounded-md border border-border-strong bg-card-elevated p-4">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">{i.name}</p>
                    {i.status === "inactive" && (
                      <span className="rounded bg-card px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                        Désactivé
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-text-muted">{i.email}</p>
                  <button
                    type="button"
                    onClick={() => copyCode(i.id, i.code)}
                    className="mt-1 inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-xs text-text-secondary hover:border-gold/50"
                  >
                    {i.code}
                    {copiedId === i.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right text-xs">
                    <p className="text-text-muted">
                      En attente : <span className="font-medium text-text-secondary">{formatCurrency(i.pendingCents)}</span>
                    </p>
                    <p className="text-text-muted">
                      Payé : <span className="font-medium text-text-secondary">{formatCurrency(i.paidCents)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(i.id)}>
                      {expandedId === i.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => toggleStatus(i)} disabled={pending}>
                      <Power className="h-3.5 w-3.5" /> {i.status === "active" ? "Désactiver" : "Réactiver"}
                    </Button>
                  </div>
                </div>
              </div>

              {expandedId === i.id && (
                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  {loadingCommissions ? (
                    <p className="text-xs text-text-muted">Chargement...</p>
                  ) : commissions.length === 0 ? (
                    <p className="text-xs text-text-muted">Aucune commission pour ce code pour le moment.</p>
                  ) : (
                    commissions.map((c) => (
                      <div key={c.id} className="flex flex-col items-start gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-text-secondary">
                          {formatCurrency(c.amountCents, c.currency)} — {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                        {c.status === "paid" ? (
                          <span className="text-success">Payée</span>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => markPaid(c.id, i.id)} disabled={pending}>
                            <Banknote className="h-3.5 w-3.5" /> Marquer payée
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau code influenceur">
        <form onSubmit={create} className="flex flex-col gap-4">
          <Field label="Nom">
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Code" hint="Ce que l'audience de l'influenceur tape à la caisse, ex. MARIE10.">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="MARIE10"
              className="font-mono uppercase"
              required
            />
          </Field>
          <Button type="submit" disabled={pending || !name.trim() || !email.trim() || !code.trim()} className="self-start">
            Créer le code
          </Button>
        </form>
      </Modal>
    </div>
  );
}
