"use client";

import { useState, useTransition } from "react";
import { uploadThen } from "@/lib/uploadClient";
import Link from "next/link";
import { Archive, ExternalLink, Eye, Lock, MousePointerClick, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { TrainingCover } from "@/components/trainings/TrainingCover";
import {
  EMPTY_TRAINING,
  TrainingFormFields,
  formToInput,
  trainingToForm,
  type TrainingFormState,
} from "@/components/trainings/TrainingFormFields";
import { MAX_TRAININGS_PER_MEMBER, trainingPath } from "@/lib/trainings";
import { cn } from "@/lib/utils";
import {
  deleteTrainingAction,
  saveTrainingAction,
  setTrainingArchivedAction,
  uploadTrainingCoverAction,
} from "./actions";
import type { Training } from "@/services/training.service";
import type { TrainingStatus } from "@/types/database.types";

const STATUS: Record<TrainingStatus, { label: string; className: string }> = {
  published: { label: "En ligne", className: "border-success/40 bg-success/10 text-success" },
  pending: { label: "En relecture", className: "border-gold/40 bg-gold/10 text-gold" },
  rejected: { label: "À corriger", className: "border-error/40 bg-error/10 text-error" },
  archived: { label: "Archivée", className: "border-border-strong text-text-muted" },
};

export function TrainingsManager({ initial, canCreate }: { initial: Training[]; canCreate: boolean }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<TrainingFormState>(EMPTY_TRAINING);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const activeCount = items.filter((t) => t.status !== "archived").length;

  function openNew() {
    setForm(EMPTY_TRAINING);
    setEditing("new");
  }

  function openEdit(t: Training) {
    setForm(trainingToForm(t));
    setEditing(t.id);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const id = editing && editing !== "new" ? editing : undefined;
    startTransition(async () => {
      const result = await saveTrainingAction(formToInput(form), id);
      if (!result.success) return toast.show(result.error, "error");
      const saved = result.data;
      setItems((prev) => {
        const base = id ? prev.find((t) => t.id === id) : undefined;
        const next: Training = {
          ...(base ?? ({} as Training)),
          id: saved.id,
          ownerId: base?.ownerId ?? null,
          title: form.title.trim(),
          summary: form.summary.trim(),
          description: form.description.trim(),
          theme: form.theme,
          format: form.format,
          durationLabel: form.durationLabel.trim() || null,
          priceCents: Math.round(Number(form.price.replace(/\s/g, "").replace(",", ".")) * 100),
          memberPriceCents: form.memberPrice ? Math.round(Number(form.memberPrice.replace(/\s/g, "").replace(",", ".")) * 100) : null,
          promoCode: form.promoCode || null,
          hasPromoCode: Boolean(form.promoCode),
          offerUnlocked: true,
          audience: form.eliteOnly ? "elite" : "members",
          externalUrl: form.externalUrl.trim(),
          coverImageUrl: form.coverImageUrl,
          status: saved.status,
          rejectionReason: saved.status === "pending" ? null : (base?.rejectionReason ?? null),
          isPinned: base?.isPinned ?? false,
          publishedAt: base?.publishedAt ?? null,
          createdAt: base?.createdAt ?? new Date().toISOString(),
          creator: base?.creator ?? { userId: null, name: "", username: null, avatarUrl: null, verified: false },
          weekViews: base?.weekViews ?? 0,
          weekClicks: base?.weekClicks ?? 0,
        };
        return id ? prev.map((t) => (t.id === id ? next : t)) : [next, ...prev];
      });
      setEditing(null);
      toast.show(
        saved.status === "pending"
          ? "Formation envoyée en relecture. Tu seras prévenu dès qu'elle est en ligne."
          : "Formation mise à jour.",
        "success",
      );
    });
  }

  function toggleArchive(t: Training) {
    startTransition(async () => {
      const result = await setTrainingArchivedAction(t.id, t.status !== "archived");
      if (!result.success) return toast.show(result.error, "error");
      setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: result.data.status } : x)));
      toast.show(result.data.status === "archived" ? "Formation archivée." : "Formation remise en ligne.", "success");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteTrainingAction(id);
      if (!result.success) return toast.show(result.error, "error");
      setItems((prev) => prev.filter((t) => t.id !== id));
      setConfirmDelete(null);
      toast.show("Formation supprimée.", "success");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Tu formes d&apos;autres entrepreneurs ? Présente ta formation : elle s&apos;affiche en vitrine sur ton profil et
        dans le catalogue, après une relecture rapide par l&apos;équipe.
      </p>

      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((t) => (
            <li key={t.id} className="flex flex-col gap-3 rounded-md border border-border bg-bg-primary/40 p-3 sm:flex-row sm:items-center">
              <TrainingCover src={t.coverImageUrl} className="aspect-[16/9] w-full shrink-0 rounded-sm sm:w-28" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-text-primary">{t.title}</p>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STATUS[t.status].className)}>
                    {STATUS[t.status].label}
                  </span>
                </div>
                {t.status === "rejected" && t.rejectionReason && (
                  <p className="mt-1 text-xs text-error">Motif : {t.rejectionReason}</p>
                )}
                {t.status === "pending" && <p className="mt-1 text-xs text-text-muted">Relecture en cours, généralement sous 24 h.</p>}
                {t.status === "published" && (
                  <p className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {t.weekViews} vue{t.weekViews > 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="h-3.5 w-3.5" /> {t.weekClicks} clic{t.weekClicks > 1 ? "s" : ""}
                    </span>
                    <span>sur 7 jours</span>
                  </p>
                )}
              </div>
              {confirmDelete === t.id ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="danger" onClick={() => remove(t.id)} disabled={pending}>
                    Supprimer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)} disabled={pending}>
                    Garder
                  </Button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={trainingPath(t.id)}
                    aria-label="Voir la page de la formation"
                    className="rounded-sm p-1.5 text-text-muted transition-colors hover:text-text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    aria-label={`Modifier ${t.title}`}
                    className="rounded-sm p-1.5 text-text-muted transition-colors hover:text-text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {(t.status === "published" || t.status === "archived") && (
                    <button
                      type="button"
                      onClick={() => toggleArchive(t)}
                      disabled={pending}
                      aria-label={t.status === "archived" ? "Remettre en ligne" : "Archiver"}
                      className="rounded-sm p-1.5 text-text-muted transition-colors hover:text-text-primary"
                    >
                      {t.status === "archived" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(t.id)}
                    aria-label={`Supprimer ${t.title}`}
                    className="rounded-sm p-1.5 text-text-muted transition-colors hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!canCreate && (
        <div className="flex flex-col items-start gap-3 rounded-md border border-gold/30 bg-gold/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-text-secondary">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>
              Proposer une formation est réservé aux membres Elite : elle apparaît alors sur ton profil, dans le catalogue et
              dans le Réseau.{items.length > 0 && " Tes formations déjà en ligne restent modifiables."}
            </span>
          </p>
          <Button href="#abonnement" size="sm" className="shrink-0">
            Passer Elite
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={openNew}
          disabled={!canCreate || activeCount >= MAX_TRAININGS_PER_MEMBER}
        >
          <Plus className="h-3.5 w-3.5" /> Proposer une formation
        </Button>
        {items.length > 0 && (
          <span className="text-xs tabular-nums text-text-muted">
            {activeCount}/{MAX_TRAININGS_PER_MEMBER}
          </span>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Proposer une formation" : "Modifier la formation"}
        className="max-w-lg"
      >
        <form onSubmit={save} className="flex flex-col gap-5">
          <TrainingFormFields value={form} onChange={setForm} upload={(file) => uploadThen("training-cover", file, uploadTrainingCoverAction)} />
          <p className="rounded-md border border-border bg-bg-primary/40 px-3 py-2.5 text-xs text-text-muted">
            L&apos;équipe relit chaque formation avant sa mise en ligne. Modifier le titre, le texte, le lien ou
            l&apos;image la renvoie en relecture ; les prix et le code se changent librement.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Envoi..." : editing === "new" ? "Envoyer en relecture" : "Enregistrer"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={pending}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
