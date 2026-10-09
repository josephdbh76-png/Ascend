// Leagues, Clash of Clans style ("clans" in the code, « ligues » in the UI,
// not to be confused with the level leagues Bronze → Diamant of lib/leagues).
// Client-safe: the pages show the rules and the scores with these numbers.

import type { ClanAccess, ClanRole } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Look
// ---------------------------------------------------------------------------

export const CLAN_EMBLEMS = ["shield", "swords", "crown", "flame", "rocket", "zap", "gem", "target", "mountain", "star"] as const;
export type ClanEmblemId = (typeof CLAN_EMBLEMS)[number];

/** Each color as [light, dark] for the emblem's gradient. */
export const CLAN_COLORS = {
  gold: { label: "Or", from: "#f0cf7a", to: "#9a722d" },
  emerald: { label: "Émeraude", from: "#6ee7b7", to: "#047857" },
  sky: { label: "Azur", from: "#7dd3fc", to: "#0369a1" },
  violet: { label: "Améthyste", from: "#c4b5fd", to: "#6d28d9" },
  rose: { label: "Rubis", from: "#fda4af", to: "#be123c" },
  orange: { label: "Braise", from: "#fdba74", to: "#c2410c" },
  slate: { label: "Acier", from: "#e2e8f0", to: "#475569" },
  cyan: { label: "Glacier", from: "#a5f3fc", to: "#0e7490" },
} as const;
export type ClanColorId = keyof typeof CLAN_COLORS;

export const isClanEmblem = (v: unknown): v is ClanEmblemId => typeof v === "string" && (CLAN_EMBLEMS as readonly string[]).includes(v);
export const isClanColor = (v: unknown): v is ClanColorId => typeof v === "string" && v in CLAN_COLORS;
export const clanColor = (v: string) => CLAN_COLORS[isClanColor(v) ? v : "gold"];

export const ACCESS_LABELS: Record<ClanAccess, { label: string; detail: string }> = {
  open: { label: "Ouverte", detail: "Tout le monde peut entrer." },
  request: { label: "Sur demande", detail: "Le chef ou un adjoint accepte chaque demande." },
  invite: { label: "Sur invitation", detail: "Seulement avec le lien d'invitation du chef ou d'un adjoint." },
};

export const ROLE_LABELS: Record<ClanRole, string> = { leader: "Chef", coleader: "Adjoint", member: "Membre" };

export const CLAN_MAX_MEMBERS = 50;
export const PARTNER_CLAN_MAX_MEMBERS = 200;
export const MAX_COLEADERS = 5;

// ---------------------------------------------------------------------------
// Invites and rewards
// ---------------------------------------------------------------------------

/** For each new member who subscribes thanks to an invite. */
export const INVITE_REWARD_CENTS = 500;
/** On top, at every 10th (10th, 20th, 30th…). */
export const INVITE_BONUS_EVERY = 10;
export const INVITE_BONUS_CENTS = 5000;
/** The league leader earns this share of what the members' invites earn, paid on top by ASCEND. */
export const LEADER_SHARE = 0.2;
/** Window to subscribe after joining through an invite. */
export const INVITE_WINDOW_DAYS = 60;
/** Rewards are held this long (refund window) before they can be paid. */
export const REWARD_HOLD_DAYS = 30;
/** Paid on the 5th once at least this much is available. */
export const MIN_PAYOUT_CENTS = 2000;

/** How many paid invites until the next bonus, and how many since the last one. */
export function bonusProgress(paidInvites: number): { done: number; next: number } {
  const done = paidInvites % INVITE_BONUS_EVERY;
  return { done, next: INVITE_BONUS_EVERY - done };
}

// ---------------------------------------------------------------------------
// Wars
// ---------------------------------------------------------------------------

export const WAR_MIN_VERIFIED = 5;
export const WAR_RESPONSE_HOURS = 48;
export const WAR_PREP_HOURS = 24;
export const WAR_DAYS = 7;
/** Wars start and end at this hour (UTC), right when the nightly job syncs revenue. */
export const WAR_HOUR_UTC = 6;
export const WAR_REMATCH_DAYS = 30;
export const WAR_DECLINE_COOLDOWN_DAYS = 7;

export const WAR_TROPHIES = { win: 30, loss: -10, draw: 10 } as const;

/** Titles for wins as a verified fighter. */
export const WAR_TITLES = [
  { wins: 1, id: "league-war-winner", name: "Vainqueur · Guerre de ligues" },
  { wins: 5, id: "league-war-veteran", name: "Vétéran de guerre" },
  { wins: 25, id: "league-war-legend", name: "Légende de guerre" },
] as const;

const PERFORMANCE_POINTS = 60;
const CHALLENGE_POINTS = 25;
const VERIFIED_POINTS = 15;
const RATIO_CAP = 2;
const CHALLENGES_CAP = 3;

export const WAR_SCORE_PARTS = [
  {
    key: "performance",
    label: "Performance",
    points: PERFORMANCE_POINTS,
    detail: "Chiffre d'affaires vérifié encaissé pendant la guerre, comparé au rythme habituel de chaque membre (jusqu'à 2 fois son rythme).",
  },
  { key: "challenges", label: "Défis réussis", points: CHALLENGE_POINTS, detail: "Défis de la saison réussis pendant la guerre, jusqu'à 3 par membre." },
  { key: "verified", label: "Membres vérifiés", points: VERIFIED_POINTS, detail: "Part des combattants aux revenus vérifiés." },
] as const;

/** The first war hour (06:00 UTC) at least 24 h after the war is accepted. */
export function warStartAfter(acceptedAt: Date): Date {
  const earliest = new Date(acceptedAt.getTime() + WAR_PREP_HOURS * 3600e3);
  const start = new Date(Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), earliest.getUTCDate(), WAR_HOUR_UTC));
  if (start < earliest) start.setUTCDate(start.getUTCDate() + 1);
  return start;
}

export interface FighterInput {
  revenueEligible: boolean;
  /** Revenue during the war / the member's usual pace for the same time. */
  ratio: number | null;
  challenges: number;
  verified: boolean;
}

export interface ClanWarScore {
  total: number;
  performance: number;
  challenges: number;
  verified: number;
  fighters: number;
  /** Fighters whose revenue syncs on its own: the only ones the performance part is measured on. */
  revenueFighters: number;
  /** Mean of the capped ratios, 1 = usual pace. */
  pace: number | null;
  verifiedFighters: number;
  /** Points each fighter brings, in the input order. */
  perFighter: number[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Brought back to the size of the league: every part is an average over
 * the fighters, so a small, active league can beat a big one.
 */
export function clanWarScore(fighters: FighterInput[]): ClanWarScore {
  const n = fighters.length;
  const revenue = fighters.filter((f) => f.revenueEligible && f.ratio != null);
  const m = revenue.length;
  const perFighter = fighters.map((f) => {
    const perf = f.revenueEligible && f.ratio != null && m ? (PERFORMANCE_POINTS * (Math.min(RATIO_CAP, Math.max(0, f.ratio)) / RATIO_CAP)) / m : 0;
    const chal = n ? (CHALLENGE_POINTS * (Math.min(CHALLENGES_CAP, f.challenges) / CHALLENGES_CAP)) / n : 0;
    const ver = n && f.verified ? VERIFIED_POINTS / n : 0;
    return { perf, chal, ver };
  });
  const sum = (k: "perf" | "chal" | "ver") => perFighter.reduce((s, p) => s + p[k], 0);
  const performance = sum("perf");
  const challenges = sum("chal");
  const verified = sum("ver");
  const pace = m ? revenue.reduce((s, f) => s + Math.min(RATIO_CAP, Math.max(0, f.ratio!)), 0) / m : null;
  return {
    total: round1(performance + challenges + verified),
    performance: round1(performance),
    challenges: round1(challenges),
    verified: round1(verified),
    fighters: n,
    revenueFighters: m,
    pace: pace == null ? null : Math.round(pace * 100) / 100,
    verifiedFighters: fighters.filter((f) => f.verified).length,
    perFighter: perFighter.map((p) => round1(p.perf + p.chal + p.ver)),
  };
}

/** The winning side, or null for a tie. A side that started with fewer than 5 verified members can't win. */
export function clanWarWinner(a: { total: number; canWin: boolean }, b: { total: number; canWin: boolean }): "a" | "b" | null {
  if (a.canWin && !b.canWin) return "a";
  if (b.canWin && !a.canWin) return "b";
  if (!a.canWin || a.total === b.total) return null;
  return a.total > b.total ? "a" : "b";
}

/** "La ligue de Lùcas !" → "la-ligue-de-lucas". */
export function clanSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 34)
    .replace(/-+$/g, "");
}

export const CLAN_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
/** Names that would pass for ASCEND itself. */
export const RESERVED_CLAN_WORDS = /\b(ascend|officiel|official|admin|moderat)/i;

export const formatPoints = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export const euros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
