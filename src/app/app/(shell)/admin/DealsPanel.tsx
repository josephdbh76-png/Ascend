"use client";

import { useState, useTransition } from "react";
import { Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { createDealAction, setDealActiveAction, deleteDealAction } from "./actions";
import type { DealRow } from "@/services/deal.service";

const EMPTY_FORM = {
  title: "",
  description: "",
  influencerName: "",
  originalPrice: "",
  dealPrice: "",
  externalUrl: "",
};

export function DealsPanel({ deals: initial }: { deals: DealRow[] }) {
  const [deals, setDeals] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function create(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createDealAction({
        title: form.title,
        description: form.description,
        influencerName: form.influencerName,
        originalPriceCents: Math.round(Number(form.originalPrice) * 100),
        dealPriceCents: Math.round(Number(form.dealPrice) * 100),
        externalUrl: form.externalUrl,
      });
      if (!result.success) return toast.show(result.error, "error");
      setDeals((prev) => [result.data, ...prev]);
      toast.show("Bon plan créé.", "success");
      setModalOpen(false);
      setForm(EMPTY_FORM);
    });
  }

  function toggleActive(deal: DealRow) {
    startTransition(async () => {
      const result = await setDealActiveAction(deal.id, !deal.isActive);
      if (!result.success) return toast.show(result.error, "error");
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, isActive: !d.isActive } : d)));
    });
  }

  function remove(dealId: string) {
    startTransition(async () => {
      const result = await deleteDealAction(dealId);
      if (!result.success) return toast.show(result.error, "error");
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
      toast.show("Bon plan supprimé.", "success");
    });
  }

  const canSubmit =
    form.title.trim() && form.description.trim() && form.influencerName.trim() && form.externalUrl.trim() &&
    Number(form.originalPrice) > 0 && Number(form.dealPrice) > 0 && Number(form.dealPrice) < Number(form.originalPrice);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          Visibles uniquement par les membres Elite dans l&apos;onglet Réseau. ASCEND ne traite jamais le
          paiement — chaque bon plan renvoie vers le paiement de l&apos;influenceur.
        </p>
        <Button size="sm" onClick={() => setModalOpen(true)} className="shrink-0">
          <Plus className="h-3.5 w-3.5" /> Nouveau bon plan
        </Button>
      </div>

      {deals.length === 0 ? (
        <p className="text-xs text-text-muted">Aucun bon plan pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {deals.map((d) => (
            <div
              key={d.id}
              className="flex flex-col items-start gap-3 rounded-md border border-border-strong bg-card-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-text-primary">{d.title}</p>
                  {!d.isActive && (
                    <span className="rounded bg-card px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                      Désactivé
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-text-muted">
                  {d.influencerName} — {formatCurrency(d.dealPriceCents)} au lieu de {formatCurrency(d.originalPriceCents)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => toggleActive(d)} disabled={pending}>
                  <Power className="h-3.5 w-3.5" /> {d.isActive ? "Désactiver" : "Réactiver"}
                </Button>
                <Button variant="danger" size="sm" onClick={() => remove(d.id)} disabled={pending}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau bon plan">
        <form onSubmit={create} className="flex flex-col gap-4">
          <Field label="Titre">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              required
            />
          </Field>
          <Field label="Nom de l'influenceur">
            <Input value={form.influencerName} onChange={(e) => setForm({ ...form, influencerName: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix normal (€)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.originalPrice}
                onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                required
              />
            </Field>
            <Field label="Prix bon plan (€)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.dealPrice}
                onChange={(e) => setForm({ ...form, dealPrice: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Lien de paiement" hint="La page de l'influenceur où le membre finalise l'achat.">
            <Input
              type="url"
              value={form.externalUrl}
              onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
              placeholder="https://..."
              required
            />
          </Field>
          <Button type="submit" disabled={pending || !canSubmit} className="self-start">
            Créer le bon plan
          </Button>
        </form>
      </Modal>
    </div>
  );
}
