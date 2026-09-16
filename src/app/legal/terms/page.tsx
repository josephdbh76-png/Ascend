import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Les conditions d'utilisation d'ASCEND, le réseau de performance des entrepreneurs.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <p>
        Ceci est une version provisoire des conditions d&apos;utilisation. Elle n&apos;a pas encore été
        validée par un conseil juridique et sera remplacée par une version définitive avant la
        disponibilité générale.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Le service</h2>
      <p>
        ASCEND est un réseau où les entrepreneurs vérifient leurs revenus (via Stripe), grimpent dans un
        classement, débloquent des titres, complètent des défis et échangent des opportunités
        professionnelles avec d&apos;autres membres. Certaines fonctionnalités sont gratuites, d&apos;autres
        nécessitent un abonnement payant (Pro ou Elite) ou l&apos;achat ponctuel d&apos;un titre exclusif.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Ton compte</h2>
      <p>
        Tu dois avoir une activité entrepreneuriale réelle, fournir des informations exactes et n&apos;es
        autorisé à connecter que des sources de revenus t&apos;appartenant ou que tu es habilité à
        connecter. Toute tentative de falsification de revenus, d&apos;usurpation d&apos;identité ou
        d&apos;abus du réseau (spam, harcèlement, contenu frauduleux dans la messagerie ou les
        opportunités) peut entraîner la suspension ou la suppression de ton compte.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Abonnements et paiements</h2>
      <p>
        Les abonnements Pro et Elite sont facturés de façon récurrente via Stripe, notre prestataire de
        paiement. Tu peux résilier à tout moment depuis Réglages ; la résiliation prend effet à la fin de
        la période déjà payée, sans reconduction ultérieure. Les achats de titres exclusifs sont des achats
        ponctuels de contenu numérique, livrés immédiatement sur ton profil dès confirmation du paiement.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Limitation de responsabilité</h2>
      <p>
        ASCEND est fourni &quot;en l&apos;état&quot;, sans garantie de résultat commercial ou de
        disponibilité continue. Les fonctionnalités peuvent évoluer ou être retirées avec un préavis
        raisonnable. ASCEND ne garantit pas l&apos;exactitude des informations publiées par d&apos;autres
        membres (activité, opportunités, candidatures).
      </p>

      <h2 className="text-base font-semibold text-text-primary">Droit applicable</h2>
      <p>
        Ces conditions sont régies par le droit français. Pour toute question, contacte{" "}
        <span className="text-text-primary">[email de contact à renseigner]</span>.
      </p>
    </LegalPage>
  );
}
