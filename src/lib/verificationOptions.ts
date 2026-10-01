// Ways to verify revenue, and the ones to suggest first from the signup
// survey answer ("Où encaisses-tu ?"). Client-safe.

export interface VerificationOption {
  id: string;
  name: string;
  /** Where the button goes: the Stripe OAuth flow, or the settings with that form open. */
  href: string;
  hint: string;
}

const settingsFor = (id: string) => `/app/settings?connecter=${id}#comptes-connectes`;

export const VERIFICATION_OPTIONS: Record<string, VerificationOption> = {
  stripe: { id: "stripe", name: "Stripe", href: "/api/stripe/connect", hint: "En un clic, sans clé à copier" },
  shopify: { id: "shopify", name: "Shopify", href: settingsFor("shopify"), hint: "Ta boutique, en lecture seule" },
  paypal: { id: "paypal", name: "PayPal", href: settingsFor("paypal"), hint: "Compte PayPal Business" },
  lemonsqueezy: { id: "lemonsqueezy", name: "Lemon Squeezy", href: settingsFor("lemonsqueezy"), hint: "Avec une clé API" },
  gumroad: { id: "gumroad", name: "Gumroad", href: settingsFor("gumroad"), hint: "Avec un jeton d'accès" },
  whop: { id: "whop", name: "Whop", href: settingsFor("whop"), hint: "Avec une clé API" },
  mollie: { id: "mollie", name: "Mollie", href: settingsFor("mollie"), hint: "Avec ta clé Live" },
  paddle: { id: "paddle", name: "Paddle", href: settingsFor("paddle"), hint: "Avec une clé API" },
  woocommerce: { id: "woocommerce", name: "WooCommerce", href: settingsFor("woocommerce"), hint: "Ta boutique WordPress" },
  qonto: { id: "qonto", name: "Qonto", href: settingsFor("qonto"), hint: "Ton compte pro, sans agrégateur" },
  manuel: {
    id: "manuel",
    name: "Déclaration avec justificatif",
    href: settingsFor("manuel"),
    hint: "Sans rien connecter, vérifiée par l'équipe",
  },
};

// Survey answer → suggested ways (Systeme.io collects through Stripe or PayPal).
const FROM_SURVEY: Record<string, string[]> = {
  stripe: ["stripe"],
  systeme_io: ["stripe", "paypal"],
  paypal: ["paypal"],
  shopify: ["shopify"],
  lemonsqueezy: ["lemonsqueezy"],
  gumroad: ["gumroad"],
  whop: ["whop"],
  mollie: ["mollie"],
  paddle: ["paddle"],
  woocommerce: ["woocommerce"],
  bank_transfer: ["qonto"],
};

/** Up to three suggestions, Stripe when the survey says nothing useful. */
export function suggestedVerification(platforms: string[] | null | undefined): VerificationOption[] {
  const ids = [...new Set((platforms ?? []).flatMap((p) => FROM_SURVEY[p] ?? []))];
  return (ids.length > 0 ? ids : ["stripe"]).slice(0, 3).map((id) => VERIFICATION_OPTIONS[id]);
}
