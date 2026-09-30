import type { TrainingFormat } from "@/types/database.types";

export const TRAINING_THEMES = [
  { value: "acquisition", label: "Acquisition et marketing" },
  { value: "sales", label: "Vente et closing" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "saas", label: "SaaS et produit" },
  { value: "ai", label: "IA et automatisation" },
  { value: "content", label: "Création de contenu" },
  { value: "finance", label: "Finance et investissement" },
  { value: "fundraising", label: "Levée de fonds" },
  { value: "tech", label: "Développement et no-code" },
  { value: "design", label: "Design et marque" },
  { value: "management", label: "Management et recrutement" },
  { value: "legal", label: "Juridique et administratif" },
  { value: "mindset", label: "Productivité et mindset" },
  { value: "other", label: "Autre" },
] as const;

export type TrainingTheme = (typeof TRAINING_THEMES)[number]["value"];

export const TRAINING_FORMATS: Record<TrainingFormat, string> = {
  online: "En ligne, à ton rythme",
  live: "En direct",
  coaching: "Coaching individuel",
  in_person: "En présentiel",
};

export const MAX_TRAININGS_PER_MEMBER = 5;

export function themeLabel(value: string): string {
  return TRAINING_THEMES.find((t) => t.value === value)?.label ?? "Autre";
}

export function isTrainingTheme(value: string): value is TrainingTheme {
  return TRAINING_THEMES.some((t) => t.value === value);
}

export function trainingDiscountPercent(priceCents: number, memberPriceCents: number | null): number | null {
  if (memberPriceCents == null || priceCents <= 0 || memberPriceCents >= priceCents) return null;
  return Math.round((1 - memberPriceCents / priceCents) * 100);
}

/** Public URL of a training, short id kept in the path so titles can change. */
export function trainingPath(id: string): string {
  return `/formations/${id}`;
}

/** "149 €", "149,90 €": cents only when there are some. */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
