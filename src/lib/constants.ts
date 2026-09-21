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
  { id: "first-sale", title: "Première vente", description: "Réalise ta toute première vente vérifiée sur ASCEND.", type: "revenue_threshold", target: 1 },
  { id: "first-100", title: "Premiers 100 €", description: "Atteins 100 € de revenus mensuels vérifiés.", type: "revenue_threshold", target: 10000 },
  { id: "first-500", title: "Premiers 500 €", description: "Atteins 500 € de revenus mensuels vérifiés.", type: "revenue_threshold", target: 50000 },
  { id: "first-1000", title: "Premiers 1 000 €", description: "Atteins 1 000 € de revenus mensuels vérifiés.", type: "revenue_threshold", target: 100000 },
  { id: "first-10k-month", title: "Premier 10K", description: "Atteins 10 000 € de revenus mensuels pour la première fois.", type: "revenue_threshold", target: 1000000 },
  { id: "growth-30", title: "+30 % de croissance", description: "Fais croître tes revenus mensuels d'au moins 30 %.", type: "growth_threshold", target: 30 },
  { id: "consistency-30", title: "30 jours de régularité", description: "Garde ta source de revenus connectée et vérifiée pendant 30 jours d'affilée.", type: "consistency", target: 30 },
  { id: "international-customer", title: "Premier client international", description: "Bientôt disponible — suis ton premier client hors de ton pays.", type: "coming_soon", target: 1 },
  { id: "launch-something-new", title: "Nouveau lancement", description: "Bientôt disponible — enregistre le lancement d'un nouveau produit ou d'une fonctionnalité.", type: "coming_soon", target: 1 },
] as const;

/**
 * The revenue-threshold achievements, in ascending order — the "story" a
 * profile's trajectory timeline walks through. Each one is a real,
 * already-public achievement (see ACHIEVEMENT_DEFINITIONS), just replayed
 * as a sequence instead of a scattered badge grid.
 */
export const REVENUE_MILESTONE_LADDER = ACHIEVEMENT_DEFINITIONS.filter(
  (a): a is Extract<(typeof ACHIEVEMENT_DEFINITIONS)[number], { threshold: number }> => "threshold" in a,
).sort((a, b) => a.threshold - b.threshold);

export const FOUNDING_MEMBER_LIMIT = 500;

export const ACCENT_THEMES = [
  { id: "gold", label: "Or", textClass: "text-gold", bgClass: "bg-gold/10", swatchClass: "bg-gold" },
  { id: "emerald", label: "Émeraude", textClass: "text-emerald-400", bgClass: "bg-emerald-400/10", swatchClass: "bg-emerald-400" },
  { id: "violet", label: "Violet", textClass: "text-violet-400", bgClass: "bg-violet-400/10", swatchClass: "bg-violet-400" },
  { id: "crimson", label: "Cramoisi", textClass: "text-red-400", bgClass: "bg-red-400/10", swatchClass: "bg-red-400" },
  { id: "sky", label: "Ciel", textClass: "text-sky-400", bgClass: "bg-sky-400/10", swatchClass: "bg-sky-400" },
] as const;

export const CURRENT_SEASON = {
  number: 1,
  name: "ASCEND SAISON 01",
  label: "Septembre 2026",
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-11-30T23:59:59.000Z",
};

/** Shared by the landing page's FAQ accordion and its FAQPage JSON-LD — one list, so the structured data can never drift from what's actually shown. */
export const FAQ_ITEMS = [
  {
    q: "ASCEND est-il gratuit ?",
    a: "Oui. Le compte Gratuit donne accès au profil, à la vérification, au classement, aux accomplissements et aux défis, sans carte bancaire. Pro et Elite débloquent des avantages supplémentaires.",
  },
  {
    q: "Comment fonctionne la vérification des revenus ?",
    a: "Connecte Stripe et ASCEND récupère tes vraies données de transaction côté serveur — vérifié automatiquement, instantanément. Pas de Stripe ? Déclare tes revenus manuellement avec une preuve (facture, export comptable...) : un administrateur la vérifie avant qu'elle ne compte comme un revenu vérifié.",
  },
  {
    q: "Puis-je masquer mes revenus exacts ?",
    a: "Oui. Dans les Réglages, choisis d'afficher ton revenu exact, une fourchette de 10 000 €, ou de le garder entièrement privé. Ton classement peut rester visible sans exposer le montant.",
  },
  {
    q: "Mes données financières sont-elles en sécurité ?",
    a: "Tes données de revenus sont protégées par une sécurité au niveau de la base de données — toi seul peux accéder à tes connexions et chiffres bruts. Les pages publiques ne montrent que ce que tes réglages de confidentialité autorisent.",
  },
  {
    q: "Que se passe-t-il après la bêta ?",
    a: "Les fonctionnalités du compte Gratuit resteront gratuites pour toujours. Pro et Elite sont déjà disponibles dès aujourd'hui, résiliables à tout moment depuis les Réglages.",
  },
  {
    q: "Puis-je essayer Elite gratuitement ?",
    a: "Oui, si tu n'as jamais eu d'abonnement payant : 14 jours d'essai gratuit, carte bancaire requise à l'inscription. Tu peux annuler à tout moment pendant l'essai depuis les Réglages ; sinon, la facturation démarre automatiquement à la fin des 14 jours.",
  },
  {
    q: "Y a-t-il une réduction pour un engagement annuel ?",
    a: "Oui. L'abonnement annuel Pro équivaut à 2 mois offerts, et l'abonnement annuel Elite à 3 mois offerts par rapport au tarif mensuel.",
  },
] as const;
