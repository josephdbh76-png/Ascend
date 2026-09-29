export interface SurveyOption {
  value: string;
  label: string;
}

export const DISCOVERY_SOURCES: SurveyOption[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "influencer", label: "Un créateur / influenceur" },
  { value: "friend", label: "Un ami, un proche" },
  { value: "google", label: "Google" },
  { value: "other", label: "Autre" },
];

/** Sources where "par qui ?" is worth asking. */
export const SOURCES_WITH_REFERRER = new Set(["influencer", "friend", "instagram", "tiktok", "youtube"]);

export const PAYMENT_PLATFORMS: SurveyOption[] = [
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "shopify", label: "Shopify" },
  { value: "lemonsqueezy", label: "Lemon Squeezy" },
  { value: "gumroad", label: "Gumroad" },
  { value: "whop", label: "Whop" },
  { value: "systeme_io", label: "Systeme.io" },
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "other", label: "Autre" },
];

export const REVENUE_RANGES: SurveyOption[] = [
  { value: "none", label: "Pas encore de revenus" },
  { value: "lt_1k", label: "Moins de 1 000 €" },
  { value: "1k_5k", label: "1 000 – 5 000 €" },
  { value: "5k_20k", label: "5 000 – 20 000 €" },
  { value: "20k_50k", label: "20 000 – 50 000 €" },
  { value: "50k_plus", label: "Plus de 50 000 €" },
];

export const MAIN_GOALS: SurveyOption[] = [
  { value: "credibility", label: "Prouver mes résultats, gagner en crédibilité" },
  { value: "ranking", label: "Grimper au classement" },
  { value: "network", label: "Rencontrer d'autres entrepreneurs" },
  { value: "opportunities", label: "Trouver des opportunités, des partenaires" },
  { value: "motivation", label: "Me challenger, rester motivé" },
];

export function surveyLabel(options: SurveyOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function isValidOption(options: SurveyOption[], value: string): boolean {
  return options.some((o) => o.value === value);
}
