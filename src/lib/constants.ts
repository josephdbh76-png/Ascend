export const BUSINESS_CATEGORIES = [
  { value: "saas", label: "SaaS" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "agency", label: "Agence" },
  { value: "ai", label: "IA" },
  { value: "creator", label: "Créateur" },
  { value: "consulting", label: "Conseil" },
  { value: "marketplace", label: "Marketplace" },
  { value: "app", label: "Application" },
  { value: "other", label: "Autre" },
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]["value"];

export const COUNTRIES = [
  { value: "FR", label: "France" },
  { value: "US", label: "États-Unis" },
  { value: "GB", label: "Royaume-Uni" },
  { value: "DE", label: "Allemagne" },
  { value: "ES", label: "Espagne" },
  { value: "IT", label: "Italie" },
  { value: "NL", label: "Pays-Bas" },
  { value: "BE", label: "Belgique" },
  { value: "CH", label: "Suisse" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australie" },
  { value: "SG", label: "Singapour" },
  { value: "AE", label: "Émirats arabes unis" },
  { value: "IN", label: "Inde" },
  { value: "BR", label: "Brésil" },
  { value: "JP", label: "Japon" },
  { value: "OTHER", label: "Autre" },
] as const;

export const RESERVED_USERNAMES = [
  "admin",
  "ascend",
  "api",
  "settings",
  "reglages",
  "login",
  "connexion",
  "signup",
  "inscription",
  "logout",
  "dashboard",
  "tableau-de-bord",
  "leaderboard",
  "classement",
  "profile",
  "profil",
  "challenges",
  "defis",
  "achievements",
  "accomplissements",
  "support",
  "help",
  "aide",
  "about",
  "a-propos",
  "privacy",
  "confidentialite",
  "terms",
  "conditions",
  "founder",
  "founders",
  "fondateur",
  "beta",
  "root",
  "null",
  "undefined",
  "you",
  "toi",
  "me",
  "moi",
];

export const REVENUE_VISIBILITY = {
  EXACT: "exact",
  RANGE: "range",
  PRIVATE: "private",
} as const;

export type RevenueVisibility = (typeof REVENUE_VISIBILITY)[keyof typeof REVENUE_VISIBILITY];

export const VERIFICATION_STATUS = {
  UNVERIFIED: "unverified",
  VERIFIED: "verified",
  ERROR: "error",
  DISCONNECTED: "disconnected",
} as const;

export type VerificationStatus = (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

export const ACHIEVEMENT_DEFINITIONS = [
  { id: "first-verified-revenue", name: "Premiers revenus vérifiés", description: "Tu as connecté et vérifié ta première source de revenus.", rarity: "common", icon: "check-circle" },
  { id: "revenue-1k", name: "1K mensuels", description: "Tu as atteint 1 000 € de revenus mensuels.", rarity: "common", icon: "trending-up", threshold: 100000 },
  { id: "revenue-5k", name: "5K mensuels", description: "Tu as atteint 5 000 € de revenus mensuels.", rarity: "common", icon: "trending-up", threshold: 500000 },
  { id: "revenue-10k", name: "10K mensuels", description: "Tu as atteint 10 000 € de revenus mensuels.", rarity: "rare", icon: "trending-up", threshold: 1000000 },
  { id: "revenue-25k", name: "25K mensuels", description: "Tu as atteint 25 000 € de revenus mensuels.", rarity: "rare", icon: "trending-up", threshold: 2500000 },
  { id: "revenue-50k", name: "50K mensuels", description: "Tu as atteint 50 000 € de revenus mensuels.", rarity: "epic", icon: "trending-up", threshold: 5000000 },
  { id: "revenue-100k", name: "100K mensuels", description: "Tu as atteint 100 000 € de revenus mensuels.", rarity: "legendary", icon: "trending-up", threshold: 10000000 },
  { id: "top-100", name: "Top 100", description: "Tu es classé dans le top 100 mondial.", rarity: "rare", icon: "medal" },
  { id: "top-50", name: "Top 50", description: "Tu es classé dans le top 50 mondial.", rarity: "epic", icon: "medal" },
  { id: "top-10", name: "Top 10", description: "Tu es classé dans le top 10 mondial.", rarity: "legendary", icon: "medal" },
  { id: "founding-member", name: "Membre fondateur", description: "Tu as rejoint ASCEND parmi la cohorte fondatrice.", rarity: "epic", icon: "gem" },
] as const;

export const TROPHY_DEFINITIONS = [
  { id: "global-1", name: "#1 mondial", description: "Classé #1 mondial sur ASCEND.", icon: "crown" },
  { id: "category-champion", name: "Champion de catégorie", description: "Classé #1 dans ta catégorie d'activité.", icon: "shield" },
  { id: "founder-of-the-month", name: "Fondateur du mois", description: "Plus forte croissance du mois.", icon: "star" },
  { id: "growth-champion", name: "Growth Champion", description: "Croissance la plus rapide de la saison.", icon: "flame" },
  { id: "revenue-100k-trophy", name: "100K mensuels", description: "Tu as franchi 100 000 € de revenus mensuels.", icon: "trophy" },
  { id: "founding-member-trophy", name: "Membre fondateur", description: "Un des 500 premiers membres d'ASCEND.", icon: "gem" },
] as const;

export const CHALLENGE_DEFINITIONS = [
  { id: "first-10k-month", title: "Premier 10K", description: "Atteins 10 000 € de revenus mensuels pour la première fois.", type: "revenue_threshold", target: 1000000 },
  { id: "growth-30", title: "+30 % de croissance", description: "Fais croître tes revenus mensuels d'au moins 30 %.", type: "growth_threshold", target: 30 },
  { id: "consistency-30", title: "30 jours de régularité", description: "Garde ta source de revenus connectée et vérifiée pendant 30 jours d'affilée.", type: "consistency", target: 30 },
  { id: "international-customer", title: "Premier client international", description: "Bientôt disponible — suis ton premier client hors de ton pays.", type: "coming_soon", target: 1 },
  { id: "launch-something-new", title: "Nouveau lancement", description: "Bientôt disponible — enregistre le lancement d'un nouveau produit ou d'une fonctionnalité.", type: "coming_soon", target: 1 },
] as const;

export const FOUNDING_MEMBER_LIMIT = 500;

export const CURRENT_SEASON = {
  number: 1,
  name: "ASCEND SAISON 01",
  label: "Septembre 2026",
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-11-30T23:59:59.000Z",
};
