// Creator leagues and league wars. Client-safe: the war page shows how the
// score is made.
//
// A creator's community competes as a team. The war score is brought back
// to the size of the league, so a small, active league can beat a big one:
//   growth      50 pts  median monthly growth of the verified members,
//                       capped between −50 % and +100 %
//   verified    30 pts  share of members whose revenue is verified
//   challenges  20 pts  challenges completed during the war, per member,
//                       counted up to 2 each
// Only members who joined before the war started count, so nobody can
// switch to the winning side at the last minute.

export const WAR_MIN_VERIFIED = 5;
export const WAR_TITLE_ID = "league-war-winner";

const GROWTH_FLOOR = -50;
const GROWTH_CAP = 100;
const CHALLENGES_CAP = 2;

export const WAR_SCORE_PARTS = [
  { key: "growth", label: "Croissance médiane", points: 50, detail: "des membres vérifiés, de −50 % à +100 %" },
  { key: "verified", label: "Membres vérifiés", points: 30, detail: "part des membres aux revenus vérifiés" },
  { key: "challenges", label: "Défis réussis", points: 20, detail: "pendant la guerre, jusqu'à 2 par membre" },
] as const;

export interface WarMember {
  revenueVerified: boolean;
  growthPercent: number | null;
  challengesCompleted: number;
}

export interface WarScore {
  total: number;
  growth: number;
  verified: number;
  challenges: number;
  members: number;
  verifiedMembers: number;
  medianGrowth: number | null;
  /** At least WAR_MIN_VERIFIED verified members: below that, the league can't win. */
  eligible: boolean;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function warScore(members: WarMember[]): WarScore {
  const verified = members.filter((m) => m.revenueVerified);
  // A verified member with a single month has no growth yet: it counts as flat.
  const medianGrowth = median(verified.map((m) => m.growthPercent ?? 0));
  const capped = medianGrowth == null ? null : Math.min(GROWTH_CAP, Math.max(GROWTH_FLOOR, medianGrowth));
  const growth = capped == null ? 0 : ((capped - GROWTH_FLOOR) / (GROWTH_CAP - GROWTH_FLOOR)) * 50;
  const verifiedPart = members.length ? (verified.length / members.length) * 30 : 0;
  const challengesPart = members.length
    ? (members.reduce((sum, m) => sum + Math.min(CHALLENGES_CAP, m.challengesCompleted), 0) / (members.length * CHALLENGES_CAP)) * 20
    : 0;
  return {
    total: round1(growth + verifiedPart + challengesPart),
    growth: round1(growth),
    verified: round1(verifiedPart),
    challenges: round1(challengesPart),
    members: members.length,
    verifiedMembers: verified.length,
    medianGrowth: medianGrowth == null ? null : round1(medianGrowth),
    eligible: verified.length >= WAR_MIN_VERIFIED,
  };
}

/** The winning side, or null: a tie, or no side with enough verified members. */
export function warWinner(a: WarScore, b: WarScore): "a" | "b" | null {
  if (a.eligible && !b.eligible) return "a";
  if (b.eligible && !a.eligible) return "b";
  if (!a.eligible || a.total === b.total) return null;
  return a.total > b.total ? "a" : "b";
}

/** "La ligue de Luca" → "la-ligue-de-luca". */
export function leagueSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export const LEAGUE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
