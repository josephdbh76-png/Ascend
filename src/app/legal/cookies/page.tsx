import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { ManageCookiesButton } from "@/components/legal/ManageCookiesButton";

export const metadata: Metadata = {
  title: "Politique de cookies",
  description: "Quels cookies ASCEND utilise, et comment gérer ton consentement.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Politique de cookies">
      <p>
        Ceci est une politique de cookies provisoire. Elle n&apos;a pas encore été validée par un conseil
        juridique et sera remplacée par une version définitive avant la disponibilité générale.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Cookies strictement nécessaires</h2>
      <p>
        Ces cookies (posés par Supabase Auth) te gardent connecté à ton compte. Ils sont indispensables au
        fonctionnement du site et ne peuvent pas être désactivés.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Cookies d&apos;analyse</h2>
      <p>
        Avec ton accord uniquement, ASCEND utilise PostHog pour comprendre l&apos;usage du produit de
        façon anonymisée (pages visitées, fonctionnalités utilisées) — jamais de contenu personnel ou de
        montants de revenus. Ces cookies ne sont posés qu&apos;après avoir cliqué sur &quot;Accepter&quot;
        dans la bannière affichée lors de ta première visite.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Gérer ton choix</h2>
      <p>
        Tu peux revenir sur ta décision à tout moment et réafficher la bannière de consentement.
      </p>
      <ManageCookiesButton />
    </LegalPage>
  );
}
