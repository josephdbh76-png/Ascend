"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { TRAINING_FORMATS, TRAINING_THEMES, trainingDiscountPercent } from "@/lib/trainings";
import type { ActionResult } from "@/app/(auth)/actions";
import type { Training } from "@/services/training.service";
import type { TrainingFormat } from "@/types/database.types";

export interface TrainingFormState {
  title: string;
  summary: string;
  description: string;
  theme: string;
  format: TrainingFormat;
  durationLabel: string;
  price: string;
  memberPrice: string;
  promoCode: string;
  eliteOnly: boolean;
  externalUrl: string;
  coverImageUrl: string | null;
}

export const EMPTY_TRAINING: TrainingFormState = {
  title: "",
  summary: "",
  description: "",
  theme: "acquisition",
  format: "online",
  durationLabel: "",
  price: "",
  memberPrice: "",
  promoCode: "",
  eliteOnly: false,
  externalUrl: "",
  coverImageUrl: null,
};

function centsToInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toString().replace(".", ",");
}

export function trainingToForm(t: Training): TrainingFormState {
  return {
    title: t.title,
    summary: t.summary,
    description: t.description,
    theme: t.theme,
    format: t.format,
    durationLabel: t.durationLabel ?? "",
    price: centsToInput(t.priceCents),
    memberPrice: centsToInput(t.memberPriceCents),
    promoCode: t.promoCode ?? "",
    eliteOnly: t.audience === "elite",
    externalUrl: t.externalUrl,
    coverImageUrl: t.coverImageUrl,
  };
}

/** What the server actions expect (TrainingInput). */
export function formToInput(f: TrainingFormState) {
  return {
    title: f.title,
    summary: f.summary,
    description: f.description,
    theme: f.theme,
    format: f.format,
    durationLabel: f.durationLabel || undefined,
    price: f.price,
    memberPrice: f.memberPrice || undefined,
    promoCode: f.promoCode || undefined,
    eliteOnly: f.eliteOnly,
    externalUrl: f.externalUrl,
    coverImageUrl: f.coverImageUrl,
  };
}

function toCents(value: string): number | null {
  const clean = value.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

export function TrainingFormFields({
  value: f,
  onChange,
  upload,
  showAudience = true,
}: {
  value: TrainingFormState;
  onChange: (next: TrainingFormState) => void;
  upload: (formData: FormData) => Promise<ActionResult<{ url: string }>>;
  showAudience?: boolean;
}) {
  const set = (patch: Partial<TrainingFormState>) => onChange({ ...f, ...patch });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const price = toCents(f.price);
  const member = f.memberPrice ? toCents(f.memberPrice) : null;
  const discount = price != null && member != null ? trainingDiscountPercent(price, member) : null;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    setUploading(true);
    upload(formData).then((result) => {
      setUploading(false);
      if (!result.success) return toast.show(result.error, "error");
      set({ coverImageUrl: result.data.url });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Image de couverture" hint="Optionnel. Format 16:9 conseillé (1600×900), JPG, PNG ou WebP, 5 Mo max.">
        {f.coverImageUrl ? (
          <div className="relative overflow-hidden rounded-md border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.coverImageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
            <button
              type="button"
              onClick={() => set({ coverImageUrl: null })}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Retirer l'image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border-strong text-xs text-text-muted transition-colors hover:border-gold/50 hover:text-text-secondary"
          >
            <ImagePlus className="h-5 w-5" />
            {uploading ? "Envoi..." : "Choisir une image"}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />
      </Field>

      <Field label="Titre" htmlFor="training-title">
        <Input
          id="training-title"
          value={f.title}
          maxLength={120}
          required
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Ex. Lancer sa boutique Shopify en 30 jours"
        />
      </Field>
      <Field label="En une phrase" htmlFor="training-summary" hint={`Affichée sur les cartes · ${f.summary.length}/200`}>
        <Input
          id="training-summary"
          value={f.summary}
          maxLength={200}
          required
          onChange={(e) => set({ summary: e.target.value })}
          placeholder="Ce que l'élève saura faire à la fin."
        />
      </Field>
      <Field label="Programme et détails" htmlFor="training-description" hint={`${f.description.length}/2000`}>
        <Textarea
          id="training-description"
          rows={6}
          value={f.description}
          maxLength={2000}
          required
          onChange={(e) => set({ description: e.target.value })}
          placeholder={"Pour qui, ce qu'il y a dedans, les résultats obtenus par tes élèves...\nUne ligne par module fonctionne très bien."}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Thème" htmlFor="training-theme">
          <Select id="training-theme" value={f.theme} onChange={(e) => set({ theme: e.target.value })}>
            {TRAINING_THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Format" htmlFor="training-format">
          <Select id="training-format" value={f.format} onChange={(e) => set({ format: e.target.value as TrainingFormat })}>
            {Object.entries(TRAINING_FORMATS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Durée" htmlFor="training-duration" hint="Optionnel. Ex. 6 semaines, 12 h de vidéo.">
        <Input id="training-duration" value={f.durationLabel} maxLength={40} onChange={(e) => set({ durationLabel: e.target.value })} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Prix public (€)" htmlFor="training-price">
          <Input
            id="training-price"
            inputMode="decimal"
            value={f.price}
            required
            onChange={(e) => set({ price: e.target.value })}
            placeholder="249"
          />
        </Field>
        <Field
          label="Prix membres Pro et Elite (€)"
          htmlFor="training-member-price"
          hint={discount != null ? `Soit -${discount} % pour les abonnés.` : "Optionnel, inférieur au prix public. Les membres gratuits voient le prix public."}
        >
          <Input
            id="training-member-price"
            inputMode="decimal"
            value={f.memberPrice}
            onChange={(e) => set({ memberPrice: e.target.value })}
            placeholder="149"
          />
        </Field>
      </div>
      <Field label="Code promo" htmlFor="training-code" hint="Optionnel. Visible uniquement par les abonnés concernés.">
        <Input
          id="training-code"
          value={f.promoCode}
          maxLength={40}
          onChange={(e) => set({ promoCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
          placeholder="ASCEND40"
          className="font-mono uppercase"
        />
      </Field>
      {showAudience && (
        <label className="flex items-start gap-3 rounded-md border border-border bg-bg-primary/40 p-3 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={f.eliteOnly}
            onChange={(e) => set({ eliteOnly: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-[#d6a84f]"
          />
          <span>
            <span className="font-medium text-text-primary">Réserver l&apos;offre aux membres Elite</span>
            <span className="mt-0.5 block text-xs text-text-muted">
              Sinon elle est ouverte aux Pro et aux Elite. Les autres voient le prix public et ce qu&apos;ils économiseraient.
            </span>
          </span>
        </label>
      )}
      <Field label="Lien de la formation" htmlFor="training-url" hint="La page où l'on achète ou réserve (https://...).">
        <Input
          id="training-url"
          type="url"
          inputMode="url"
          value={f.externalUrl}
          required
          maxLength={500}
          onChange={(e) => set({ externalUrl: e.target.value })}
          placeholder="https://"
        />
      </Field>
    </div>
  );
}
