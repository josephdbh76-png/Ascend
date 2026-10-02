import type { Metadata } from "next";
import { AdminSection } from "../AdminSection";
import { TitleStripeSyncButton } from "../TitleStripeSyncButton";
import { AnnualPriceSyncPanel } from "../AnnualPriceSyncPanel";
import { ElitePricingPanel } from "../ElitePricingPanel";
import { StripeDiagnosticPanel } from "../StripeDiagnosticPanel";

export const metadata: Metadata = { title: "Facturation · Administration" };

export default function AdminBillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminSection title="Diagnostic Stripe" description="Tout ce qui doit être en place pour encaisser : compte, prix, webhook, portail client, vendeurs.">
        <StripeDiagnosticPanel />
      </AdminSection>

      <AdminSection
        title="Titres payants"
        description="Donne à chaque titre de la Boutique un prix Stripe identique à son prix sur ASCEND : crée les nouveaux, met à jour ceux dont le prix a changé."
        action={<TitleStripeSyncButton />}
      >
        <p className="text-xs text-text-muted">
          À relancer après chaque ajout de titre ou changement de prix. Tant que ce n&apos;est pas fait, le titre concerné ne peut pas être acheté.
        </p>
      </AdminSection>

      <AdminSection title="Tarifs annuels" description="Crée les prix Stripe annuels (Pro, Elite) sur les mêmes produits que les prix mensuels.">
        <AnnualPriceSyncPanel />
      </AdminSection>

      <AdminSection title="Tarif Elite" description="Crée les prix Stripe Elite (39 €/mois, 351 €/an) sur le produit Elite existant.">
        <ElitePricingPanel />
      </AdminSection>
    </div>
  );
}
