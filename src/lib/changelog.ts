export interface ChangelogEntry {
  period: string;
  title: string;
  description: string;
}

/** Newest first. Kept honest — no fabricated precise dates, no shipped-sounding language for things still in progress. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    period: "Septembre 2026",
    title: "Marché des titres",
    description: "Revends tes titres exclusifs à d'autres membres au prix que tu fixes. Le paiement est sécurisé par Stripe et le titre change de propriétaire automatiquement.",
  },
  {
    period: "Septembre 2026",
    title: "Bons plans Elite",
    description: "Des formations et offres de créateurs à prix réduit, réservées aux membres Elite.",
  },
  {
    period: "Septembre 2026",
    title: "PayPal, Lemon Squeezy et banque",
    description: "Vérifie tes revenus depuis PayPal Business, Lemon Squeezy ou directement depuis ton compte bancaire, en plus de Stripe et Shopify.",
  },
  {
    period: "Septembre 2026",
    title: "Photo de profil",
    description: "Ajoute ta photo pour que les autres membres te reconnaissent dans le classement et le réseau.",
  },
  {
    period: "Septembre 2026",
    title: "Double authentification",
    description: "Protège ton compte avec un code à usage unique en plus de ton mot de passe, via n'importe quelle application d'authentification.",
  },
  {
    period: "Septembre 2026",
    title: "Installation en application mobile",
    description: "ASCEND s'installe désormais depuis ton téléphone comme une vraie application, avec icône sur l'écran d'accueil.",
  },
  {
    period: "Septembre 2026",
    title: "Export de tes données",
    description: "Télécharge un export complet de ton profil, ton activité et tes revenus en un clic depuis les Réglages.",
  },
  {
    period: "Septembre 2026",
    title: "Vérification Shopify",
    description: "Connecte ta boutique Shopify pour vérifier ton chiffre d'affaires, en plus de Stripe et des déclarations manuelles.",
  },
  {
    period: "Septembre 2026",
    title: "Campagnes email",
    description: "Notifications automatiques (nouvel abonné, message, candidature...) et campagnes ponctuelles, avec désinscription en un clic.",
  },
  {
    period: "Septembre 2026",
    title: "Candidatures avec pièces jointes",
    description: "Ajoute un portfolio, une lettre de motivation ou tout autre document facultatif à tes candidatures.",
  },
  {
    period: "Septembre 2026",
    title: "Réseau et opportunités",
    description: "Recherche des fondateurs de ton secteur et découvre des opportunités de collaboration, avec Pro et Elite.",
  },
  {
    period: "Août 2026",
    title: "Accomplissements, titres et défis",
    description: "Des récompenses collectibles qui retracent ta progression, et des titres à débloquer selon tes performances.",
  },
  {
    period: "Août 2026",
    title: "Lancement du classement vérifié",
    description: "Connecte Stripe ou déclare tes revenus manuellement avec preuve, et découvre ta place au classement mondial, par pays et par catégorie.",
  },
];

export interface RoadmapEntry {
  title: string;
  description: string;
}

export const ROADMAP: RoadmapEntry[] = [
  {
    title: "Protections anti-abus renforcées",
    description: "Limitation de débit sur la connexion et l'inscription pour empêcher les tentatives automatisées.",
  },
  {
    title: "Accessibilité",
    description: "Audit et améliorations continues pour les utilisateurs de lecteurs d'écran et de la navigation au clavier.",
  },
  {
    title: "Version anglaise",
    description: "Une traduction complète d'ASCEND pour les fondateurs hors francophonie.",
  },
];
