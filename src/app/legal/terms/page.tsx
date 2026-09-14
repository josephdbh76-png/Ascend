import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <p>
        Ceci est une version provisoire des conditions d&apos;utilisation pour la bêta privée d&apos;ASCEND.
        Elle n&apos;a pas encore été validée par un conseil juridique et ne doit pas être considérée comme
        définitive.
      </p>
      <p>
        ASCEND est fourni pendant la bêta &quot;en l&apos;état&quot;, gratuitement, sans garantie d&apos;aucune
        sorte. Les fonctionnalités peuvent évoluer ou être retirées sans préavis.
      </p>
      <p>
        Tu es responsable de l&apos;exactitude des informations que tu fournis et tu t&apos;engages à ne
        connecter que des sources de revenus que tu es autorisé à connecter.
      </p>
      <p>
        Des conditions d&apos;utilisation complètes et validées juridiquement remplaceront cette page avant
        la disponibilité générale.
      </p>
    </LegalPage>
  );
}
