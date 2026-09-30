import { formatCurrency } from "@/lib/utils";

/**
 * One vocabulary of conditions shared by challenges (type + target columns),
 * titles (requirement jsonb) and achievements (criteria jsonb), so the admin
 * can create any of them with a condition the progress engine understands.
 */
export type ConditionType =
  | "revenue_threshold"
  | "growth_threshold"
  | "customer_threshold"
  | "transaction_threshold"
  | "follower_threshold"
  | "rank_threshold"
  | "consistency"
  | "verification"
  | "profile_complete"
  | "founding_member"
  | "season_reward"
  | "manual";

export interface ConditionDef {
  type: ConditionType;
  label: string;
  /** Unit of the value typed in the admin form (revenue is typed in euros, stored in cents). */
  unit: string | null;
  /** Can be evaluated automatically from a member's data. */
  automatic: boolean;
  forChallenges: boolean;
}

export const CONDITIONS: ConditionDef[] = [
  { type: "revenue_threshold", label: "Revenus mensuels vérifiés d'au moins", unit: "€", automatic: true, forChallenges: true },
  { type: "growth_threshold", label: "Croissance mensuelle d'au moins", unit: "%", automatic: true, forChallenges: true },
  { type: "customer_threshold", label: "Clients sur un mois d'au moins", unit: "clients", automatic: true, forChallenges: true },
  { type: "transaction_threshold", label: "Ventes sur un mois d'au moins", unit: "ventes", automatic: true, forChallenges: true },
  { type: "follower_threshold", label: "Abonnés d'au moins", unit: "abonnés", automatic: true, forChallenges: true },
  { type: "rank_threshold", label: "Classement mondial dans le top", unit: "places", automatic: true, forChallenges: true },
  { type: "consistency", label: "Revenus vérifiés depuis au moins", unit: "jours", automatic: true, forChallenges: true },
  { type: "verification", label: "Revenus vérifiés", unit: null, automatic: true, forChallenges: true },
  { type: "profile_complete", label: "Profil complet (photo, bio, compétences, activité)", unit: null, automatic: true, forChallenges: true },
  { type: "founding_member", label: "Membre fondateur (500 premiers)", unit: null, automatic: true, forChallenges: false },
  { type: "season_reward", label: "Récompense de saison", unit: null, automatic: false, forChallenges: false },
  { type: "manual", label: "Attribué à la main par un admin", unit: null, automatic: false, forChallenges: false },
];

export function conditionDef(type: string): ConditionDef | undefined {
  return CONDITIONS.find((c) => c.type === type);
}

/** Value typed by an admin → stored value (revenue: euros → cents). */
export function toStoredTarget(type: ConditionType, value: number): number {
  return type === "revenue_threshold" ? Math.round(value * 100) : value;
}

/** Stored value → value shown in an admin form. */
export function fromStoredTarget(type: ConditionType, stored: number): number {
  return type === "revenue_threshold" ? stored / 100 : stored;
}

export interface NormalizedCondition {
  type: ConditionType;
  target: number;
}

/** Titles and achievements store their condition as jsonb, with a few historical shapes. */
export function normalizeRequirement(req: Record<string, unknown> | null | undefined): NormalizedCondition | null {
  const type = req?.type as ConditionType | undefined;
  if (!type || !conditionDef(type)) return null;
  const n = (key: string) => (typeof req?.[key] === "number" ? (req[key] as number) : null);
  const target = n("value") ?? n("cents") ?? n("percent") ?? n("count") ?? n("rank") ?? n("days") ?? 1;
  return { type, target };
}

/** Builds the jsonb stored on a title or achievement. */
export function requirementJson(type: ConditionType, target: number | null): Record<string, unknown> {
  return target == null ? { type } : { type, value: target };
}

export function describeCondition(type: string, target: number): string | null {
  switch (type) {
    case "revenue_threshold":
      return `${formatCurrency(target)} de revenus mensuels vérifiés`;
    case "growth_threshold":
      return `+${target} % de croissance sur un mois`;
    case "customer_threshold":
      return `${target} clients sur un mois`;
    case "transaction_threshold":
      return `${target} ventes sur un mois`;
    case "follower_threshold":
      return `${target} abonné${target > 1 ? "s" : ""}`;
    case "rank_threshold":
      return `Top ${target} du classement mondial`;
    case "consistency":
      return `${target} jours de revenus vérifiés`;
    case "verification":
      return "Vérifier ses revenus";
    case "profile_complete":
      return "Compléter son profil";
    case "founding_member":
      return "Faire partie des 500 premiers membres";
    case "season_reward":
      return "Récompense de saison";
    case "manual":
      return "Attribué par l'équipe ASCEND";
    default:
      return null;
  }
}
