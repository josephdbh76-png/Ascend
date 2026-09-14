import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Politique de cookies" };

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Politique de cookies">
      <p>
        Ceci est une politique de cookies provisoire pour la bêta privée d&apos;ASCEND. Elle n&apos;a pas
        encore été validée par un conseil juridique.
      </p>
      <p>
        ASCEND utilise des cookies strictement nécessaires pour te garder connecté (via Supabase Auth) et,
        lorsque configurés, des cookies d&apos;analyse anonymes pour comprendre l&apos;usage de la bêta.
      </p>
      <p>
        Une politique de cookies complète et validée juridiquement remplacera cette page avant la
        disponibilité générale.
      </p>
    </LegalPage>
  );
}
