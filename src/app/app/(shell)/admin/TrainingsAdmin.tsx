"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Archive, Check, ExternalLink, Eye, MousePointerClick, Pencil, Pin, PinOff, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
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
import { formatPrice, themeLabel, trainingPath } from "@/lib/trainings";
import { cn } from "@/lib/utils";
import {
  adminDeleteTrainingAction,
  adminSaveTrainingAction,
  adminSetTrainingStatusAction,
  reviewTrainingAction,
  setTrainingPinnedAction,
  uploadAdminImageAction,
} from "./actions";
import type { Training } from "@/services/training.service";
import type { TrainingStatus } from "@/types/database.types";

const STATUS: Record<TrainingStatus, { label: string; className: string }> = {
  published: { label: "En ligne", className: "border-success/40 bg-success/10 text-success" },
  pending: { label: "À relire", className: "border-gold/40 bg-gold/10 text-gold" },
  rejected: { label: "Refusée", className: "border-error/40 bg-error/10 text-error" },
  archived: { label: "Archivée", className: "border-border-strong text-text-muted" },
};

const QUICK_REASONS = [
  "Le lien ne mène pas à la formation.",
  "La description est trop vague : précise le contenu et le public visé.",
  "Promesses de gains non justifiées.",
  "Sujet hors du périmètre d'ASCEND (entrepreneuriat).",
];

export function TrainingsAdmin({ initial }: { initial: Training[] }) {
  const [items, setItems] = useState(initial);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<TrainingFormState>(EMPTY_TRAINING);
  const [ownerUsername, setOwnerUsername] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const queue = items.filter((t) => t.status === "pending");
  const catalog = items.filter((t) => t.status !== "pending");

  function patch(id: string, change: Partial<Training>) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...change } : t)));
  }

  function review(t: Training, approve: boolean) {
    startTransition(async () => {
      const result = await reviewTrainingAction(t.id, approve, approve ? undefined : reason);
      if (!result.success) return toast.show(result.error, "error");
      patch(t.id, approve ? { status: "published", rejectionReason: null } : { status: "rejected", rejectionReason: reason.trim() });
      setRejecting(null);
      setReason("");
      toast.show(approve ? "Formation mise en ligne, le membre est prévenu." : "Refus envoyé au membre.", "success");
    });
  }

  function togglePin(t: Training) {
    startTransition(async () => {
      const result = await setTrainingPinnedAction(t.id, !t.isPinned);
      if (!result.success) return toast.show(result.error, "error");
      patch(t.id, { isPinned: !t.isPinned });
    });
  }

  function toggleArchive(t: Training) {
    const status = t.status === "archived" ? "published" : "archived";
    startTransition(async () => {
      const result = await adminSetTrainingStatusAction(t.id, status);
      if (!result.success) return toast.show(result.error, "error");
      patch(t.id, { status });
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await adminDeleteTrainingAction(id);
      if (!result.success) return toast.show(result.error, "error");
      setItems((prev) => prev.filter((t) => t.id !== id));
      setConfirmDelete(null);
    });
  }

  function openNew() {
    setForm(EMPTY_TRAINING);
    setOwnerUsername("");
    setCreatorName("");
    setEditing("new");
  }

  function openEdit(t: Training) {
    setForm(trainingToForm(t));
    setOwnerUsername(t.creator.username ?? "");
    setCreatorName(t.creator.username ? "" : t.creator.name);
    setEditing(t.id);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const id = editing && editing !== "new" ? editing : undefined;
    startTransition(async () => {
      const result = await adminSaveTrainingAction({ ...formToInput(form), ownerUsername, creatorName }, id);
      if (!result.success) return toast.show(result.error, "error");
      toast.show(id ? "Formation mise à jour." : "Formation publiée.", "success");
      setEditing(null);
      // The list is rebuilt server-side (creator, stats): reload to show it.
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">À relire ({queue.length})</h3>
        {queue.length === 0 ? (
          <p className="text-sm text-text-muted">Rien à relire pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {queue.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 rounded-md border border-gold/30 bg-gold/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <TrainingCover src={t.coverImageUrl} className="aspect-[16/9] w-full shrink-0 rounded-sm sm:w-40" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">{t.title}</p>
                    <p className="text-xs text-text-muted">
                      {t.creator.name}
                      {t.creator.username && ` · @${t.creator.username}`} · {themeLabel(t.theme)}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">{t.summary}</p>
                    <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line text-xs leading-relaxed text-text-secondary">{t.description}</p>
                    <p className="mt-2 text-xs text-text-secondary">
                      {formatPrice(t.priceCents)}
                      {t.memberPriceCents != null && ` → ${formatPrice(t.memberPriceCents)} membres${t.audience === "elite" ? " Elite" : ""}`}
                      {t.promoCode && ` · code ${t.promoCode}`}
                    </p>
                    <a href={t.externalUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1 break-all text-xs text-gold hover:underline">
                      {t.externalUrl} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                </div>
                {rejecting === t.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReason(r)}
                          className="rounded-full border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-border-strong"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <Textarea rows={2} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Ce qu'il faut corriger (envoyé au membre)" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" onClick={() => review(t, false)} disabled={pending || !reason.trim()}>
                        Envoyer le refus
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejecting(null)} disabled={pending}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => review(t, true)} disabled={pending}>
                      <Check className="h-3.5 w-3.5" /> Valider et publier
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setRejecting(t.id);
                        setReason("");
                      }}
                      disabled={pending}
                    >
                      <X className="h-3.5 w-3.5" /> Refuser
                    </Button>
                    <Link href={trainingPath(t.id)} className="inline-flex items-center gap-1 px-2 text-xs text-text-secondary hover:text-text-primary">
                      Aperçu <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Catalogue ({catalog.length})</h3>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" /> Nouvelle formation
          </Button>
        </div>
        {catalog.length === 0 ? (
          <p className="text-sm text-text-muted">Aucune formation pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {catalog.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 rounded-md border border-border-strong bg-card-elevated p-3 sm:flex-row sm:items-center">
                <TrainingCover src={t.coverImageUrl} className="aspect-[16/9] w-full shrink-0 rounded-sm sm:w-24" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">{t.title}</p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STATUS[t.status].className)}>
                      {STATUS[t.status].label}
                    </span>
                    {t.isPinned && <span className="text-[10px] font-semibold uppercase tracking-wide text-gold">Épinglée</span>}
                  </div>
                  <p className="text-xs text-text-muted">
                    {t.creator.name}
                    {t.creator.username && ` · @${t.creator.username}`} · {formatPrice(t.memberPriceCents ?? t.priceCents)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {t.weekViews}
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="h-3.5 w-3.5" /> {t.weekClicks}
                    </span>
                    <span>7 derniers jours</span>
                  </p>
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
                    {t.status === "published" && (
                      <button type="button" onClick={() => togglePin(t)} disabled={pending} aria-label={t.isPinned ? "Désépingler" : "Épingler à la une"} className="rounded-sm p-1.5 text-text-muted hover:text-gold">
                        {t.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </button>
                    )}
                    <Link href={trainingPath(t.id)} aria-label="Voir" className="rounded-sm p-1.5 text-text-muted hover:text-text-primary">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <button type="button" onClick={() => openEdit(t)} aria-label="Modifier" className="rounded-sm p-1.5 text-text-muted hover:text-text-primary">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {(t.status === "published" || t.status === "archived") && (
                      <button type="button" onClick={() => toggleArchive(t)} disabled={pending} aria-label={t.status === "archived" ? "Republier" : "Archiver"} className="rounded-sm p-1.5 text-text-muted hover:text-text-primary">
                        {t.status === "archived" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </button>
                    )}
                    <button type="button" onClick={() => setConfirmDelete(t.id)} aria-label="Supprimer" className="rounded-sm p-1.5 text-text-muted hover:text-error">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nouvelle formation" : "Modifier la formation"} className="max-w-lg">
        <form onSubmit={save} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 rounded-md border border-border bg-bg-primary/40 p-3 sm:grid-cols-2">
            <Field label="Membre qui la propose" hint="Nom d'utilisateur : la formation s'affiche sur son profil.">
              <Input value={ownerUsername} onChange={(e) => setOwnerUsername(e.target.value)} placeholder="@pseudo" />
            </Field>
            <Field label="Ou partenaire externe" hint="Si la personne n'est pas membre.">
              <Input value={creatorName} onChange={(e) => setCreatorName(e.target.value)} placeholder="Nom affiché" disabled={Boolean(ownerUsername.trim())} />
            </Field>
          </div>
          <TrainingFormFields value={form} onChange={setForm} upload={uploadAdminImageAction} />
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : editing === "new" ? "Publier" : "Enregistrer"}
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
