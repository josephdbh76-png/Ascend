import type { BusinessCategory } from "./constants";

/** Public, indexable leaderboard pages, one per activity. Slugs are French and never change. */
export interface CategoryPage {
  value: BusinessCategory;
  slug: string;
  /** Short name used in titles and links ("fondateurs SaaS"). */
  audience: string;
  intro: string;
}

export const CATEGORY_PAGES: CategoryPage[] = [
  {
    value: "saas",
    slug: "saas",
    audience: "fondateurs SaaS",
    intro:
      "MRR, croissance mensuelle, clients actifs : les fondateurs SaaS classés sur leurs revenus récurrents, vérifiés directement depuis Stripe, Lemon Squeezy, PayPal ou leur banque.",
  },
  {
    value: "ecommerce",
    slug: "e-commerce",
    audience: "e-commerçants",
    intro:
      "Boutiques Shopify, marques en direct, sites marchands : le chiffre d'affaires mensuel de chaque boutique, relevé à la source plutôt que déclaré.",
  },
  {
    value: "fashion",
    slug: "mode",
    audience: "marques de mode",
    intro:
      "Marques de vêtements, streetwear, accessoires : les créateurs de mode classés sur leurs ventes réelles, vérifiées depuis leur boutique ou leur banque.",
  },
  {
    value: "agency",
    slug: "agences",
    audience: "agences",
    intro:
      "Agences marketing, web, acquisition ou design : le chiffre d'affaires mensuel encaissé, vérifié à la source, pour se comparer sans bluff.",
  },
  {
    value: "ai",
    slug: "intelligence-artificielle",
    audience: "entrepreneurs de l'IA",
    intro:
      "Outils, assistants et API d'intelligence artificielle : les projets IA qui génèrent déjà des revenus, classés sur des chiffres vérifiés.",
  },
  {
    value: "app",
    slug: "applications",
    audience: "créateurs d'applications",
    intro:
      "Applications mobiles et web : abonnements et achats vérifiés depuis les outils de paiement, pour voir qui vit vraiment de son app.",
  },
  {
    value: "marketplace",
    slug: "marketplaces",
    audience: "fondateurs de marketplaces",
    intro:
      "Places de marché et plateformes de mise en relation : le volume de revenus vérifié chaque mois, sans chiffres arrondis à la hausse.",
  },
  {
    value: "creator",
    slug: "createurs-de-contenu",
    audience: "créateurs de contenu",
    intro:
      "YouTube, newsletters, podcasts, communautés payantes : les créateurs qui monétisent leur audience, classés sur leurs revenus vérifiés.",
  },
  {
    value: "education",
    slug: "formation-coaching",
    audience: "formateurs et coachs",
    intro:
      "Formations en ligne, coaching, programmes d'accompagnement : les revenus encaissés, vérifiés à la source, pour distinguer les vrais résultats des promesses.",
  },
  {
    value: "consulting",
    slug: "conseil",
    audience: "consultants",
    intro:
      "Cabinets et consultants indépendants : le chiffre d'affaires mensuel vérifié, pour situer son activité face à celles des autres.",
  },
  {
    value: "freelance",
    slug: "freelances",
    audience: "freelances",
    intro:
      "Développeurs, designers, rédacteurs, growth : les indépendants classés sur ce qu'ils facturent réellement chaque mois.",
  },
  {
    value: "beauty",
    slug: "beaute-bien-etre",
    audience: "entrepreneurs beauté et bien-être",
    intro:
      "Instituts, marques de cosmétiques, bien-être : les revenus mensuels vérifiés des entrepreneurs du secteur.",
  },
  {
    value: "food",
    slug: "restauration",
    audience: "restaurateurs et marques food",
    intro:
      "Restaurants, food trucks, marques alimentaires : le chiffre d'affaires mensuel vérifié depuis la caisse en ligne ou la banque.",
  },
  {
    value: "realestate",
    slug: "immobilier",
    audience: "entrepreneurs de l'immobilier",
    intro:
      "Location courte durée, agences, investissement : les revenus immobiliers mensuels, vérifiés à la source.",
  },
  {
    value: "local",
    slug: "artisanat-commerce-local",
    audience: "artisans et commerçants",
    intro:
      "Ateliers, boutiques de quartier, artisans : les commerces locaux classés sur leurs encaissements réels.",
  },
];

export function categoryPageBySlug(slug: string): CategoryPage | undefined {
  return CATEGORY_PAGES.find((c) => c.slug === slug);
}

export function categoryPageByValue(value: string): CategoryPage | undefined {
  return CATEGORY_PAGES.find((c) => c.value === value);
}

/** Questions shown on the public leaderboard, and described to search engines. */
export const LEADERBOARD_FAQ = [
  {
    q: "Comment les revenus sont-ils vérifiés ?",
    a: "Chaque membre connecte sa source de revenus en lecture seule : Stripe, Shopify, PayPal, Lemon Squeezy ou son compte bancaire, et les montants sont relevés automatiquement. Un revenu déclaré à la main ne compte qu'après contrôle d'un justificatif par l'équipe ASCEND.",
  },
  {
    q: "Le classement affiche-t-il mon chiffre exact ?",
    a: "Seulement si tu le décides. Tu peux afficher le montant exact, une fourchette (par exemple de 10 k € à 25 k €) ou le garder privé : tu restes classé, mais le chiffre n'apparaît pas.",
  },
  {
    q: "Qui peut apparaître au classement ?",
    a: "Tout entrepreneur dont les revenus sont vérifiés : fondateurs SaaS, e-commerçants, marques, agences, créateurs, freelances. L'inscription est gratuite.",
  },
  {
    q: "À quelle fréquence le classement est-il mis à jour ?",
    a: "Les revenus sont synchronisés automatiquement depuis les sources connectées, et le classement public est rafraîchi toutes les heures.",
  },
];
