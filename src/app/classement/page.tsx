import type { Metadata } from "next";
import { getPublicLeaderboard } from "@/services/leaderboard.service";
import { PublicLeaderboardView } from "@/components/leaderboard/PublicLeaderboardView";

export const revalidate = 3600;

const TITLE = "Classement des entrepreneurs aux revenus vérifiés";
const DESCRIPTION =
  "Le classement public des entrepreneurs francophones, établi sur des revenus vérifiés à la source (Stripe, Shopify, PayPal, Whop, Gumroad…). Global et par activité, mis à jour toutes les heures.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/classement" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/classement", type: "website" },
};

export default async function PublicLeaderboardPage() {
  const rows = await getPublicLeaderboard("global", "", 50);
  return <PublicLeaderboardView rows={rows} />;
}
