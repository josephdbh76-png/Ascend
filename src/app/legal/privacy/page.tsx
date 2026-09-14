import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <p>
        Ceci est une politique de confidentialité provisoire pour la bêta privée d&apos;ASCEND. Elle n&apos;a
        pas encore été validée par un conseil juridique et ne doit pas être considérée comme définitive.
      </p>
      <p>
        Pendant la bêta, ASCEND stocke les informations de compte et d&apos;activité que tu fournis (nom,
        nom d&apos;utilisateur, pays, catégorie d&apos;activité et bio) et, si tu choisis de connecter une
        source de revenus, les montants mensuels récupérés depuis cette source en mode test Stripe.
      </p>
      <p>
        Tu contrôles qui peut voir tes revenus via le réglage de visibilité dans les Réglages (exact,
        fourchette ou privé). Tu peux demander la suppression de ton compte et des données associées à
        tout moment depuis Réglages → Compte.
      </p>
      <p>
        Une politique de confidentialité complète et validée juridiquement remplacera cette page avant
        la disponibilité générale.
      </p>
    </LegalPage>
  );
}
