"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { BUSINESS_CATEGORIES } from "@/lib/constants";

export interface BusinessFormValues {
  name: string;
  category: string;
  customCategory: string;
  description: string;
  website: string;
}

export const EMPTY_BUSINESS: BusinessFormValues = {
  name: "",
  category: "saas",
  customCategory: "",
  description: "",
  website: "",
};

// Suggestions shown in the "own wording" field, so members see what it is for.
const WORDING_EXAMPLES: Record<string, string> = {
  saas: "logiciel de facturation pour artisans",
  ecommerce: "boutique de cafés de spécialité",
  fashion: "marque de streetwear éco-responsable",
  agency: "agence d'acquisition payante",
  ai: "assistant IA pour cabinets comptables",
  app: "application de suivi sportif",
  marketplace: "place de marché de matériel photo",
  creator: "chaîne YouTube finance perso",
  education: "coaching de prise de parole",
  consulting: "conseil en stratégie RH",
  freelance: "missions de développement React",
  beauty: "institut et soins sur mesure",
  food: "food truck burger artisanal",
  realestate: "location courte durée à Lyon",
  local: "atelier de maroquinerie",
  other: "ce qui décrit le mieux ton projet",
};

export function BusinessFields({
  values,
  onChange,
  idPrefix,
}: {
  values: BusinessFormValues;
  onChange: (next: BusinessFormValues) => void;
  idPrefix: string;
}) {
  const set = (patch: Partial<BusinessFormValues>) => onChange({ ...values, ...patch });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nom de l'activité" htmlFor={`${idPrefix}-name`}>
          <Input
            id={`${idPrefix}-name`}
            value={values.name}
            maxLength={80}
            required
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Ex. Maison Lumière"
          />
        </Field>
        <Field label="Catégorie" htmlFor={`${idPrefix}-category`}>
          <Select id={`${idPrefix}-category`} value={values.category} onChange={(e) => set({ category: e.target.value })}>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Ton activité en quelques mots"
        htmlFor={`${idPrefix}-wording`}
        hint="Optionnel. S'affiche à la place de la catégorie sur ton profil."
      >
        <Input
          id={`${idPrefix}-wording`}
          value={values.customCategory}
          maxLength={60}
          onChange={(e) => set({ customCategory: e.target.value })}
          placeholder={`Ex. ${WORDING_EXAMPLES[values.category] ?? WORDING_EXAMPLES.other}`}
        />
      </Field>
      <Field
        label="Description"
        htmlFor={`${idPrefix}-description`}
        hint={`Optionnel · ${values.description.length}/280`}
      >
        <Textarea
          id={`${idPrefix}-description`}
          rows={3}
          value={values.description}
          maxLength={280}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Ce que tu proposes, à qui, et ce qui te distingue."
        />
      </Field>
      <Field label="Site web" htmlFor={`${idPrefix}-website`} hint="Optionnel">
        <Input
          id={`${idPrefix}-website`}
          value={values.website}
          inputMode="url"
          autoComplete="url"
          maxLength={180}
          onChange={(e) => set({ website: e.target.value })}
          placeholder="monsite.fr"
        />
      </Field>
    </>
  );
}
