// Season leagues: members compete with businesses of their size. Client-safe.
//
// A member's league comes from their best verified month over the 3 months
// before the season starts (or their first verified month if they start
// during the season). It doesn't move when they grow during the season:
// growing is how they win their league, and they go up a league next season.
// Revenue history that shows up later (a source connected mid-season syncs
// its past months) does move them, so hiding revenue to land in an easier
// league doesn't work.

export type LeagueId = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface League {
  id: LeagueId;
  name: string;
  /** Inclusive lower bound of monthly revenue, in cents. */
  minCents: number;
  /** Exclusive upper bound; null for the top league. */
  maxCents: number | null;
  /** Text and border colors of the league badge. */
  tone: string;
}

export const LEAGUES: League[] = [
  { id: "bronze", name: "Bronze", minCents: 0, maxCents: 100_000, tone: "text-[#d08b5b] border-[#d08b5b]/40 bg-[#d08b5b]/10" },
  { id: "silver", name: "Argent", minCents: 100_000, maxCents: 500_000, tone: "text-[#c9d1d9] border-[#c9d1d9]/40 bg-[#c9d1d9]/10" },
  { id: "gold", name: "Or", minCents: 500_000, maxCents: 2_000_000, tone: "text-gold border-gold/40 bg-gold/10" },
  { id: "platinum", name: "Platine", minCents: 2_000_000, maxCents: 10_000_000, tone: "text-[#8fd3d1] border-[#8fd3d1]/40 bg-[#8fd3d1]/10" },
  { id: "diamond", name: "Diamant", minCents: 10_000_000, maxCents: null, tone: "text-[#a5b4fc] border-[#a5b4fc]/40 bg-[#a5b4fc]/10" },
];

export const LEAGUE_IDS = LEAGUES.map((l) => l.id);

export function league(id: string | null | undefined): League {
  return LEAGUES.find((l) => l.id === id) ?? LEAGUES[0];
}

export function isLeagueId(value: unknown): value is LeagueId {
  return typeof value === "string" && LEAGUE_IDS.includes(value as LeagueId);
}

export function leagueForRevenue(cents: number): LeagueId {
  for (let i = LEAGUES.length - 1; i >= 0; i--) if (cents >= LEAGUES[i].minCents) return LEAGUES[i].id;
  return "bronze";
}

export function nextLeague(id: LeagueId): League | null {
  const i = LEAGUE_IDS.indexOf(id);
  return i >= 0 && i < LEAGUES.length - 1 ? LEAGUES[i + 1] : null;
}

const euros = (cents: number) => `${new Intl.NumberFormat("fr-FR").format(cents / 100)} €`;

/** "1 000 à 5 000 € par mois". */
export function leagueRangeLabel(id: LeagueId): string {
  const l = league(id);
  if (l.minCents === 0) return `Moins de ${euros(l.maxCents!)} par mois`;
  if (l.maxCents == null) return `${euros(l.minCents)} et plus par mois`;
  return `${euros(l.minCents)} à ${euros(l.maxCents)} par mois`;
}

// ---------------------------------------------------------------------------
// Season content generated for every league. Each league has the same number
// of points to win (255), so a ranking is as hard to top in Bronze as in
// Diamant. From Argent up, most points come from growth measured against the
// member's own reference month: a business at the top of its league can't
// collect them just by being bigger.
// ---------------------------------------------------------------------------

export interface ChallengeTemplate {
  key: string;
  title: string;
  description: string;
  type: string;
  /** Stored value (revenue in cents). */
  target: number;
  points: number;
  /** null: every league. */
  leagues: LeagueId[] | null;
}

const UPPER: LeagueId[] = ["silver", "gold", "platinum", "diamond"];

function leagueSet(
  id: Exclude<LeagueId, "bronze">,
  milestone: number,
  promotion: number,
  customers: number,
  sales: number,
  promotionTitle: string,
): ChallengeTemplate[] {
  return [
    {
      key: `${id}-revenue-mid`,
      title: `${euros(milestone)} dans le mois`,
      description: `Atteins ${euros(milestone)} de revenus vérifiés sur un mois.`,
      type: "revenue_threshold",
      target: milestone,
      points: 20,
      leagues: [id],
    },
    {
      key: `${id}-revenue-top`,
      title: promotionTitle,
      description: `Atteins ${euros(promotion)} de revenus vérifiés sur un mois.`,
      type: "revenue_threshold",
      target: promotion,
      points: 40,
      leagues: [id],
    },
    {
      key: `${id}-customers`,
      title: `${new Intl.NumberFormat("fr-FR").format(customers)} clients dans le mois`,
      description: `Sers au moins ${new Intl.NumberFormat("fr-FR").format(customers)} clients sur un mois vérifié.`,
      type: "customer_threshold",
      target: customers,
      points: 20,
      leagues: [id],
    },
    {
      key: `${id}-sales`,
      title: `${new Intl.NumberFormat("fr-FR").format(sales)} ventes dans le mois`,
      description: `Réalise au moins ${new Intl.NumberFormat("fr-FR").format(sales)} ventes sur un mois vérifié.`,
      type: "transaction_threshold",
      target: sales,
      points: 15,
      leagues: [id],
    },
  ];
}

export const SEASON_CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // Every league
  { key: "profile", title: "Profil complet", description: "Ajoute ta photo, ta bio, tes compétences et la description de ton activité.", type: "profile_complete", target: 100, points: 10, leagues: null },
  { key: "verified", title: "Revenus vérifiés", description: "Connecte une source de revenus et fais vérifier ton activité.", type: "verification", target: 1, points: 15, leagues: null },
  { key: "followers", title: "5 abonnés", description: "Fais-toi suivre par au moins 5 membres.", type: "follower_threshold", target: 5, points: 10, leagues: null },
  { key: "consistency", title: "30 jours vérifiés", description: "Garde des revenus vérifiés pendant au moins 30 jours.", type: "consistency", target: 30, points: 20, leagues: null },

  // Bronze: the first steps
  { key: "bronze-first-sale", title: "Première vente", description: "Encaisse ta première vente vérifiée.", type: "revenue_threshold", target: 1, points: 15, leagues: ["bronze"] },
  { key: "bronze-100", title: "100 € dans le mois", description: "Atteins 100 € de revenus vérifiés sur un mois.", type: "revenue_threshold", target: 10_000, points: 20, leagues: ["bronze"] },
  { key: "bronze-500", title: "500 € dans le mois", description: "Atteins 500 € de revenus vérifiés sur un mois.", type: "revenue_threshold", target: 50_000, points: 30, leagues: ["bronze"] },
  { key: "bronze-1000", title: "1 000 € dans le mois · niveau Argent", description: "Atteins 1 000 € de revenus vérifiés sur un mois : le niveau de la ligue Argent.", type: "revenue_threshold", target: 100_000, points: 45, leagues: ["bronze"] },
  { key: "bronze-customers-5", title: "5 clients dans le mois", description: "Sers au moins 5 clients sur un mois vérifié.", type: "customer_threshold", target: 5, points: 20, leagues: ["bronze"] },
  { key: "bronze-customers-10", title: "10 clients dans le mois", description: "Sers au moins 10 clients sur un mois vérifié.", type: "customer_threshold", target: 10, points: 25, leagues: ["bronze"] },
  { key: "bronze-sales-10", title: "10 ventes dans le mois", description: "Réalise au moins 10 ventes sur un mois vérifié.", type: "transaction_threshold", target: 10, points: 20, leagues: ["bronze"] },
  { key: "bronze-growth-30", title: "+30 % en un mois", description: "Fais progresser tes revenus d'au moins 30 % d'un mois sur l'autre.", type: "growth_threshold", target: 30, points: 25, leagues: ["bronze"] },

  // Argent and up: growth against the member's own reference month
  { key: "base-growth-10", title: "+10 % sur ton mois de référence", description: "Dépasse de 10 % ton mois de référence de la saison.", type: "base_growth", target: 10, points: 25, leagues: UPPER },
  { key: "base-growth-25", title: "+25 % sur ton mois de référence", description: "Dépasse de 25 % ton mois de référence de la saison.", type: "base_growth", target: 25, points: 35, leagues: UPPER },
  { key: "base-growth-50", title: "+50 % sur ton mois de référence", description: "Dépasse de 50 % ton mois de référence de la saison.", type: "base_growth", target: 50, points: 45, leagues: UPPER },

  ...leagueSet("silver", 250_000, 500_000, 20, 100, "5 000 € dans le mois · niveau Or"),
  ...leagueSet("gold", 1_000_000, 2_000_000, 50, 250, "20 000 € dans le mois · niveau Platine"),
  ...leagueSet("platinum", 5_000_000, 10_000_000, 150, 750, "100 000 € dans le mois · niveau Diamant"),
  ...leagueSet("diamond", 25_000_000, 50_000_000, 500, 2500, "500 000 € dans le mois"),
];

/** Rewards for each league's final ranking. */
export const LEAGUE_REWARD_TIERS = [
  { key: "champion", rankFrom: 1, rankTo: 1, titleName: "Champion", rarity: "legendary", icon: "crown", trophy: true },
  { key: "podium", rankFrom: 2, rankTo: 3, titleName: "Podium", rarity: "epic", icon: "medal", trophy: true },
  { key: "top10", rankFrom: 4, rankTo: 10, titleName: "Top 10", rarity: "rare", icon: "trophy", trophy: false },
] as const;
