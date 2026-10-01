// Revenue sources connected with an API key the member creates in their own
// account (no aggregator, no fee for ASCEND). Client-safe: labels and steps
// only, the API calls live in services/connectors.

export type ApiConnectorId = "qonto" | "mollie" | "paddle" | "gumroad" | "whop" | "woocommerce";

export interface ConnectorField {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
  hint?: string;
}

export interface ConnectorMeta {
  id: ApiConnectorId;
  name: string;
  /** What kind of business it suits, shown under the name. */
  tagline: string;
  fields: ConnectorField[];
  steps: string[];
  /** Reviewing which incoming transfers are revenue, like a bank account. */
  reviewsTransactions?: boolean;
}

export const API_CONNECTORS: ConnectorMeta[] = [
  {
    id: "qonto",
    name: "Qonto",
    tagline: "Compte pro : les virements reçus, sans agrégateur",
    reviewsTransactions: true,
    fields: [
      { key: "login", label: "Identifiant (login)", placeholder: "ma-societe-1234" },
      { key: "secretKey", label: "Clé secrète", secret: true },
    ],
    steps: [
      "Dans Qonto (sur ordinateur), clique sur le nom de ta société puis Paramètres.",
      "Ouvre Intégrations et partenaires → API, puis génère ta clé.",
      "Copie l'identifiant et la clé secrète ci-dessous (accès en lecture, rien ne peut être payé avec).",
    ],
  },
  {
    id: "mollie",
    name: "Mollie",
    tagline: "Paiements en ligne (CB, virement, Bancontact...)",
    fields: [{ key: "apiKey", label: "Clé API live", secret: true, placeholder: "live_..." }],
    steps: [
      "Dans ton tableau de bord Mollie, ouvre Développeurs → Clés API.",
      "Copie la clé Live (elle commence par live_) ci-dessous.",
    ],
  },
  {
    id: "paddle",
    name: "Paddle",
    tagline: "Abonnements SaaS et logiciels",
    fields: [{ key: "apiKey", label: "Clé API", secret: true, placeholder: "pdl_live_apikey_..." }],
    steps: [
      "Dans Paddle, ouvre Developer tools → Authentication → API keys.",
      "Crée une clé avec uniquement la permission de lecture des transactions (transaction.read) et des ajustements (adjustment.read).",
      "Copie la clé ci-dessous.",
    ],
  },
  {
    id: "gumroad",
    name: "Gumroad",
    tagline: "Produits numériques, ebooks, formations",
    fields: [{ key: "accessToken", label: "Jeton d'accès", secret: true }],
    steps: [
      "Sur Gumroad, va dans Settings → Advanced → Applications.",
      "Crée une application (nom : ASCEND, URL : https://ascend-eight-mauve.vercel.app), puis clique sur Generate access token.",
      "Copie le jeton ci-dessous.",
    ],
  },
  {
    id: "whop",
    name: "Whop",
    tagline: "Communautés, formations et accès payants",
    fields: [{ key: "apiKey", label: "Clé API", secret: true }],
    steps: [
      "Dans ton dashboard Whop, ouvre Developer → API keys.",
      "Crée une clé avec la permission de lecture des paiements.",
      "Copie la clé ci-dessous.",
    ],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    tagline: "Boutique WordPress",
    fields: [
      { key: "storeUrl", label: "Adresse de la boutique", placeholder: "https://maboutique.fr" },
      { key: "consumerKey", label: "Clé client", placeholder: "ck_..." },
      { key: "consumerSecret", label: "Secret client", secret: true, placeholder: "cs_..." },
    ],
    steps: [
      "Dans WordPress, ouvre WooCommerce → Réglages → Avancé → API REST.",
      "Ajoute une clé avec le droit Lecture uniquement.",
      "Copie la clé client et le secret client ci-dessous, avec l'adresse de ta boutique.",
    ],
  },
];

export function connectorMeta(id: string): ConnectorMeta | undefined {
  return API_CONNECTORS.find((c) => c.id === id);
}
