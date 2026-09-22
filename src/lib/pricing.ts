export interface PlanDefinition {
  tier: "free" | "pro" | "elite";
  name: string;
  monthlyCents: number;
  /** null for the free plan — there's nothing to discount. */
  annualCents: number | null;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    tier: "free",
    name: "GRATUIT",
    monthlyCents: 0,
    annualCents: null,
    features: ["Profil", "Vérification", "Classement", "Accomplissements", "Défis", "Titres"],
  },
  {
    tier: "pro",
    name: "PRO",
    monthlyCents: 1900,
    annualCents: 19000, // 2 mois offerts
    features: [
      "Tout Gratuit",
      "Analyses avancées",
      "Profil personnalisable (thèmes)",
      "Messages limités (10/mois)",
      "Opportunités limitées (5 candidatures/mois)",
    ],
    highlighted: true,
  },
  {
    tier: "elite",
    name: "ELITE",
    monthlyCents: 3900,
    annualCents: 35100, // 3 mois offerts
    features: [
      "Tout Pro",
      "Messages et opportunités illimités",
      "Réseau de fondateurs — recherche par ville",
      "Bons plans exclusifs (formations à prix réduit)",
      "Support dédié",
    ],
  },
];

export const ELITE_TRIAL_DAYS = 14;

export function annualSavingsPercent(monthlyCents: number, annualCents: number): number {
  return Math.round((1 - annualCents / (monthlyCents * 12)) * 100);
}

export function annualMonthlyEquivalentCents(annualCents: number): number {
  return Math.round(annualCents / 12);
}
