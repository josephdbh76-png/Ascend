import { getAppUrl } from "@/lib/utils";
import { FAQ_ITEMS } from "@/lib/constants";
import { PLANS } from "@/lib/pricing";

/**
 * Static structured data only — never interpolates user-generated
 * content into this script tag. FAQ_ITEMS is shared with the visible
 * FAQ accordion so the markup can't describe questions the page doesn't
 * actually show.
 */
export function LandingStructuredData() {
  const appUrl = getAppUrl();

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ASCEND",
    url: appUrl,
    logo: `${appUrl}/icon.svg`,
    description: "Le réseau de performance des entrepreneurs ambitieux : revenus vérifiés, classement et réputation.",
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ASCEND",
    url: appUrl,
  };

  // Prices come from the same definitions as the pricing section.
  const application = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "ASCEND",
    url: appUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    inLanguage: "fr-FR",
    description:
      "Classement des entrepreneurs établi sur des revenus vérifiés à la source (Stripe, Shopify, PayPal, Lemon Squeezy, banque), avec profil public, saisons, titres et réseau de fondateurs.",
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name.charAt(0) + plan.name.slice(1).toLowerCase(),
      price: (plan.monthlyCents / 100).toFixed(2),
      priceCurrency: "EUR",
      category: plan.monthlyCents === 0 ? "free" : "subscription",
    })),
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(application) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
    </>
  );
}
