"use client";

import { useState, useTransition } from "react";
import { Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { AdminImageUpload } from "./AdminImageUpload";
import { createBannerAction, setBannerActiveAction, deleteBannerAction } from "./actions";
import type { DashboardBannerRow } from "@/services/banner.service";

const EMPTY_FORM = {
  imageUrl: null as string | null,
  title: "",
  subtitle: "",
  linkUrl: "",
};

export function BannersPanel({ banners: initial }: { banners: DashboardBannerRow[] }) {
  const [banners, setBanners] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.imageUrl) return;
    startTransition(async () => {
      const result = await createBannerAction({
        imageUrl: form.imageUrl!,
        title: form.title,
        subtitle: form.subtitle || null,
        linkUrl: form.linkUrl || null,
      });
      if (!result.success) return toast.show(result.error, "error");
      setBanners((prev) => [result.data, ...prev]);
      toast.show("Bannière créée.", "success");
      setModalOpen(false);
      setForm(EMPTY_FORM);
    });
  }

  function toggleActive(banner: DashboardBannerRow) {
    startTransition(async () => {
      const result = await setBannerActiveAction(banner.id, !banner.isActive);
      if (!result.success) return toast.show(result.error, "error");
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b)));
    });
  }

  function remove(bannerId: string) {
    startTransition(async () => {
      const result = await deleteBannerAction(bannerId);
      if (!result.success) return toast.show(result.error, "error");
      setBanners((prev) => prev.filter((b) => b.id !== bannerId));
      toast.show("Bannière supprimée.", "success");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          Affichées en haut du tableau de bord de tous les membres. Sans bannière active, rien ne change sur
          le tableau de bord.
        </p>
        <Button size="sm" onClick={() => setModalOpen(true)} className="shrink-0">
          <Plus className="h-3.5 w-3.5" /> Nouvelle bannière
        </Button>
      </div>

      {banners.length === 0 ? (
        <p className="text-xs text-text-muted">Aucune bannière pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {banners.map((b) => (
            <div
              key={b.id}
              className="flex flex-col items-start gap-3 rounded-md border border-border-strong bg-card-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">{b.title}</p>
                    {!b.isActive && (
                      <span className="rounded bg-card px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                        Désactivée
                      </span>
                    )}
                  </div>
                  {b.subtitle && <p className="truncate text-xs text-text-muted">{b.subtitle}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => toggleActive(b)} disabled={pending}>
                  <Power className="h-3.5 w-3.5" /> {b.isActive ? "Désactiver" : "Réactiver"}
                </Button>
                <Button variant="danger" size="sm" onClick={() => remove(b.id)} disabled={pending}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle bannière">
        <form onSubmit={create} className="flex flex-col gap-4">
          <AdminImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
          <Field label="Titre" hint="Le texte accrocheur affiché sur la bannière.">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
          </Field>
          <Field label="Sous-titre (optionnel)">
            <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </Field>
          <Field label="Lien (optionnel)" hint="Où le membre atterrit s'il clique sur la bannière.">
            <Input
              type="url"
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              placeholder="/app/network ou https://..."
            />
          </Field>
          <Button type="submit" disabled={pending || !form.imageUrl || !form.title.trim()} className="self-start">
            Créer la bannière
          </Button>
        </form>
      </Modal>
    </div>
  );
}
