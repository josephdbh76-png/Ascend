"use client";

import { useState, useTransition } from "react";
import { Plus, Power, Trash2, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { AdminImageUpload } from "./AdminImageUpload";
import { createBannerAction, updateBannerAction, setBannerActiveAction, deleteBannerAction } from "./actions";
import { BANNER_AUDIENCES } from "@/lib/banners";
import type { DashboardBannerRow, BannerButton } from "@/services/banner.service";
import type { SubscriptionTier } from "@/types/database.types";

// A locally-generated id, never sent to the server — React needs a key
// that stays attached to the same conceptual row when buttons are added
// or removed, and the array index isn't stable enough for that.
interface EditableButton extends BannerButton {
  key: string;
}

function newButton(): EditableButton {
  return { key: crypto.randomUUID(), type: "link", label: "", value: "" };
}

const EMPTY_FORM = {
  imageUrl: null as string | null,
  title: "",
  subtitle: "",
  buttons: [] as EditableButton[],
  audience: [] as SubscriptionTier[],
};

function audienceLabel(audience: SubscriptionTier[]) {
  if (audience.length === 0) return "Tout le monde";
  return BANNER_AUDIENCES.filter((a) => audience.includes(a.value))
    .map((a) => a.label)
    .join(" + ");
}

export function BannersPanel({
  banners: initial,
  usableCodes,
}: {
  banners: DashboardBannerRow[];
  /** Promo codes that work in Stripe right now; null when Stripe couldn't be read. */
  usableCodes: string[] | null;
}) {
  const [banners, setBanners] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, audience: BANNER_AUDIENCES.map((a) => a.value) });
    setModalOpen(true);
  }

  function openEdit(banner: DashboardBannerRow) {
    setEditingId(banner.id);
    setForm({
      imageUrl: banner.imageUrl,
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      buttons: banner.buttons.map((b) => ({ ...b, key: crypto.randomUUID() })),
      audience: banner.audience.length === 0 ? BANNER_AUDIENCES.map((a) => a.value) : banner.audience,
    });
    setModalOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.imageUrl) return;
    if (form.audience.length === 0) return toast.show("Choisis au moins un abonnement qui verra la bannière.", "error");

    // A copy_code button only ever needs the code itself — the label is
    // never shown for that type (it's always rendered as "CODE").
    const incomplete = form.buttons.find((b) =>
      b.type === "copy_code" ? !b.value.trim() : !!b.label.trim() !== !!b.value.trim(),
    );
    if (incomplete) {
      return toast.show(
        incomplete.type === "copy_code"
          ? "Un bouton code n'a pas de valeur — remplis-le ou retire-le."
          : `Le bouton "${incomplete.label || incomplete.value || "sans nom"}" est incomplet — remplis les deux champs ou retire-le.`,
        "error",
      );
    }
    const badLink = form.buttons.find((b) => {
      const value = b.value.trim();
      return b.type === "link" && value && !((value.startsWith("/") && !value.startsWith("//")) || /^https?:\/\//i.test(value));
    });
    if (badLink) {
      return toast.show(`Le lien « ${badLink.label || badLink.value} » doit commencer par / (page ASCEND) ou par https://`, "error");
    }

    startTransition(async () => {
      const payload = {
        imageUrl: form.imageUrl!,
        title: form.title,
        subtitle: form.subtitle || null,
        buttons: form.buttons
          .filter((b) => (b.type === "copy_code" ? b.value.trim() : b.label.trim() && b.value.trim()))
          .map(({ type, label, value }) => ({ type, label: type === "copy_code" ? "" : label, value })),
        audience: form.audience,
      };
      const result = editingId ? await updateBannerAction(editingId, payload) : await createBannerAction(payload);
      if (!result.success) return toast.show(result.error, "error");
      setBanners((prev) =>
        editingId ? prev.map((b) => (b.id === editingId ? result.data : b)) : [result.data, ...prev],
      );
      toast.show(editingId ? "Bannière modifiée." : "Bannière créée.", "success");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    });
  }

  function toggleActive(banner: DashboardBannerRow) {
    startTransition(async () => {
      const result = await setBannerActiveAction(banner.id, !banner.isActive);
      if (!result.success) return toast.show(result.error, "error");
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b)));
    });
  }

  function addButton() {
    setForm((f) => ({ ...f, buttons: [...f.buttons, newButton()] }));
  }

  function updateButton(key: string, patch: Partial<BannerButton>) {
    setForm((f) => ({
      ...f,
      buttons: f.buttons.map((b) => (b.key === key ? { ...b, ...patch } : b)),
    }));
  }

  function removeButton(key: string) {
    setForm((f) => ({ ...f, buttons: f.buttons.filter((b) => b.key !== key) }));
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
          Affichées en haut du tableau de bord, aux abonnements que tu choisis. Pendant la bêta, tout le
          monde est Elite : une offre réservée au Gratuit ou au Pro n&apos;apparaît donc qu&apos;après.
        </p>
        <Button size="sm" onClick={openCreate} className="shrink-0">
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
                  <p className="truncate text-xs text-gold">Visible : {audienceLabel(b.audience)}</p>
                  {b.buttons.length > 0 && (
                    <p className="truncate text-xs text-text-muted">
                      {b.buttons.map((btn) => (btn.type === "copy_code" ? `Code ${btn.value}` : `${btn.label} (lien)`)).join(" · ")}
                    </p>
                  )}
                  {usableCodes &&
                    b.buttons
                      .filter((btn) => btn.type === "copy_code" && !usableCodes.includes(btn.value.toUpperCase()))
                      .map((btn) => (
                        <p key={btn.value} className="text-xs font-medium text-error">
                          Le code {btn.value} ne fonctionne pas dans Stripe : crée-le ou réactive-le dans « Codes promo ».
                        </p>
                      ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(b)} disabled={pending}>
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Modifier la bannière" : "Nouvelle bannière"}>
        <form
          onSubmit={save}
          onKeyDown={(e) => {
            // Several plain text inputs live in this form (title,
            // subtitle, per-button label/value) — Enter in any of them
            // would otherwise submit the whole banner immediately,
            // silently dropping whatever button row wasn't filled in yet.
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") e.preventDefault();
          }}
          className="flex flex-col gap-4"
        >
          <AdminImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
          <Field label="Titre" hint="Le texte accrocheur affiché sur la bannière.">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
          </Field>
          <Field label="Sous-titre (optionnel)">
            <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-text-primary">Afficher pour</legend>
            <div className="flex flex-wrap gap-2">
              {BANNER_AUDIENCES.map((a) => {
                const checked = form.audience.includes(a.value);
                return (
                  <label
                    key={a.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      checked ? "border-gold bg-gold/10 text-text-primary" : "border-border-strong text-text-secondary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#f5c451]"
                      checked={checked}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          audience: checked ? f.audience.filter((t) => t !== a.value) : [...f.audience, a.value],
                        }))
                      }
                    />
                    {a.label}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-text-muted">
              Ex. une réduction sur le Pro : coche seulement Gratuit. Une nouveauté Elite : coche seulement Elite.
            </p>
          </fieldset>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Boutons (optionnel)</span>
              <Button type="button" variant="secondary" size="sm" onClick={addButton} disabled={form.buttons.length >= 3}>
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>
            {form.buttons.length === 0 && (
              <p className="text-xs text-text-muted">
                Aucun bouton — seule l&apos;image sera affichée. Ajoute un bouton lien ou un code à copier.
              </p>
            )}
            {form.buttons.map((btn) => (
              <div key={btn.key} className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <Field label="Type de bouton">
                    <Select
                      value={btn.type}
                      onChange={(e) => updateButton(btn.key, { type: e.target.value as BannerButton["type"] })}
                      className="w-48"
                    >
                      <option value="link">Lien (redirige quelque part)</option>
                      <option value="copy_code">Code à copier</option>
                    </Select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeButton(btn.key)}
                    className="mt-5 shrink-0 rounded-md border border-border-strong p-2 text-text-muted hover:text-error"
                    aria-label="Retirer ce bouton"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {btn.type === "link" && (
                  <Field label="Texte affiché sur le bouton" hint="Ex. Voir l'offre">
                    <Input
                      value={btn.label}
                      onChange={(e) => updateButton(btn.key, { label: e.target.value })}
                      placeholder="Voir l'offre"
                    />
                  </Field>
                )}
                <Field
                  label={btn.type === "copy_code" ? "Code promo" : "Destination du lien"}
                  hint={btn.type === "copy_code" ? "Ce qui sera copié, ex. ASCEND15" : "Un chemin ASCEND (/app/settings) ou une URL complète (https://...)"}
                >
                  <Input
                    value={btn.value}
                    onChange={(e) =>
                      updateButton(btn.key, {
                        value: btn.type === "copy_code" ? e.target.value.toUpperCase() : e.target.value,
                      })
                    }
                    placeholder={btn.type === "copy_code" ? "ASCEND15" : "/app/settings"}
                    className={btn.type === "copy_code" ? "font-mono uppercase" : undefined}
                  />
                </Field>
              </div>
            ))}
          </div>
          <Button type="submit" disabled={pending || !form.imageUrl || !form.title.trim()} className="self-start">
            {editingId ? "Enregistrer" : "Créer la bannière"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
