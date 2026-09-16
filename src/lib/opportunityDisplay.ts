import type {
  OpportunityType,
  CompensationType,
  OpportunityLocationType,
  OpportunityStage,
  ApplicationStatus,
} from "@/types/database.types";

export const OPPORTUNITY_TYPES: { value: OpportunityType; label: string }[] = [
  { value: "cofounder", label: "Cofondateur" },
  { value: "developer", label: "Développeur" },
  { value: "partner", label: "Partenaire" },
  { value: "growth", label: "Growth / Marketing" },
  { value: "freelance", label: "Freelance" },
  { value: "investor", label: "Investisseur" },
  { value: "other", label: "Autre" },
];

export const COMPENSATION_TYPES: { value: CompensationType; label: string }[] = [
  { value: "equity", label: "Equity" },
  { value: "paid", label: "Rémunéré" },
  { value: "both", label: "Rémunéré + equity" },
  { value: "unpaid", label: "Bénévole" },
];

export const LOCATION_TYPES: { value: OpportunityLocationType; label: string }[] = [
  { value: "remote", label: "À distance" },
  { value: "onsite", label: "Sur site" },
  { value: "hybrid", label: "Hybride" },
];

export const TARGET_STAGES: { value: OpportunityStage; label: string }[] = [
  { value: "any", label: "Tous stades" },
  { value: "pre_revenue", label: "Avant les premières ventes" },
  { value: "early", label: "Early stage (< 10 000 €/mois)" },
  { value: "growth", label: "Growth (10 000 à 100 000 €/mois)" },
  { value: "scale", label: "Scale (100 000 €+/mois)" },
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "En attente",
  viewed: "Vue",
  accepted: "Acceptée",
  declined: "Refusée",
};

export const APPLICATION_STATUS_BADGE: Record<ApplicationStatus, "gold" | "success" | "error" | "neutral"> = {
  pending: "gold",
  viewed: "neutral",
  accepted: "success",
  declined: "error",
};

function labelFrom<T extends string>(list: { value: T; label: string }[], value: T): string {
  return list.find((i) => i.value === value)?.label ?? value;
}

export const opportunityTypeLabel = (v: OpportunityType) => labelFrom(OPPORTUNITY_TYPES, v);
export const compensationTypeLabel = (v: CompensationType) => labelFrom(COMPENSATION_TYPES, v);
export const locationTypeLabel = (v: OpportunityLocationType) => labelFrom(LOCATION_TYPES, v);
export const targetStageLabel = (v: OpportunityStage) => labelFrom(TARGET_STAGES, v);
