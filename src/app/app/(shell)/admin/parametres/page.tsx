import type { Metadata } from "next";
import { getBetaMode, getBetaStats } from "@/services/platform.service";
import { AdminSection } from "../AdminSection";
import { BetaModePanel } from "../BetaModePanel";

export const metadata: Metadata = { title: "Paramètres · Administration" };

export default async function AdminSettingsPage() {
  const beta = await getBetaMode();
  const stats = await getBetaStats(beta.since);
  return (
    <AdminSection
      title="Version bêta"
      description="Pour la phase de test avec les influenceurs : Elite offert à tous et aucun paiement dans l'application."
    >
      <BetaModePanel
        enabled={beta.enabled}
        since={beta.since}
        joinedSinceStart={stats.joinedSinceStart}
        activePaidSubscriptions={stats.activePaidSubscriptions}
      />
    </AdminSection>
  );
}
