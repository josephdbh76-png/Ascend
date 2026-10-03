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
    features: ["Profil", "Vérification", "Classement", "Accomplissements", "Défis", "Titres", "Formations au prix public"],
  },
  {
    tier: "pro",
    name: "PRO",
    monthlyCents: 1900,
    annualCents: 19000, // 2 mois offerts
    features: [
      "Tout Gratuit",
      "Prix membres et codes sur les formations",
      "Opportunités : consulter et postuler (5 par mois)",
      "Analyses avancées",
      "Profil personnalisable (thèmes)",
      "10 messages par mois",
    ],
  },
  {
    tier: "elite",
    name: "ELITE",
    monthlyCents: 3900,
    annualCents: 35100, // 3 mois offerts
    features: [
      "Tout Pro",
      "Proposer tes formations, en vitrine sur ton profil",
      "Publier des opportunités, candidatures illimitées",
      "Messages illimités",
      "Réseau de fondateurs, recherche par ville",
      "Offres de formation réservées Elite",
      "Support dédié",
    ],
    highlighted: true,
  },
];

/** Added to Elite's features while the WhatsApp community is open (Admin → Communauté). */
export const ELITE_COMMUNITY_FEATURE = "Communauté WhatsApp Elite et événements";

export const ELITE_TRIAL_DAYS = 14;

export function annualSavingsPercent(monthlyCents: number, annualCents: number): number {
  return Math.round((1 - annualCents / (monthlyCents * 12)) * 100);
}

export function annualMonthlyEquivalentCents(annualCents: number): number {
  return Math.round(annualCents / 12);
}
