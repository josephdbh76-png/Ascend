import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment ASCEND collecte, utilise et protège tes données personnelles.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <p>
        Ceci est une politique de confidentialité provisoire. Elle n&apos;a pas encore été validée par un
        conseil juridique et sera remplacée par une version définitive avant la disponibilité générale.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Responsable du traitement</h2>
      <p>
        ASCEND est l&apos;éditeur et le responsable du traitement des données décrites ci-dessous. Pour
        toute question ou demande relative à tes données, contacte{" "}
        <a href="mailto:joseph.dbh76@gmail.com" className="text-text-primary underline hover:text-gold">
          joseph.dbh76@gmail.com
        </a>
        .
      </p>

      <h2 className="text-base font-semibold text-text-primary">Données que nous collectons</h2>
      <p>
        Informations de compte (e-mail, nom d&apos;utilisateur, prénom, nom, pays, ville, bio, photo de
        profil) ; informations d&apos;activité (nom et catégorie de ton business, compétences déclarées,
        numéro SIRET si tu fais vérifier ton entreprise) ; données de revenus, lorsque tu connectes une
        source (Stripe, Shopify) — nous ne stockons que des montants mensuels agrégés, jamais le détail de
        tes transactions individuelles — ou lorsque tu déclares un revenu manuellement avec un justificatif.
        Si tu connectes un compte bancaire, c&apos;est différent : nous stockons le détail de tes virements
        entrants (date, montant, contrepartie) le temps que tu indiques toi-même lesquels sont ton revenu
        professionnel — jamais tes virements sortants, ton solde, ni tes identifiants bancaires, auxquels
        ASCEND n&apos;a jamais accès. Nous stockons aussi les contenus que tu publies (messages,
        opportunités, candidatures et leurs pièces jointes éventuelles) et tes préférences d&apos;email
        (actualités/notifications, modifiables à tout moment depuis Réglages), et, si tu y consens via la
        bannière de cookies, des données d&apos;usage anonymisées à des fins d&apos;analyse. Nous ne
        collectons que ce qui est nécessaire au fonctionnement décrit ci-dessous — aucune donnée n&apos;est
        demandée « au cas où ».
      </p>

      <h2 className="text-base font-semibold text-text-primary">Pourquoi nous les utilisons</h2>
      <p>
        Faire fonctionner le classement et la vérification de réputation, te mettre en relation avec
        d&apos;autres membres (réseau, opportunités, messagerie), t&apos;envoyer les emails liés à ton
        compte (confirmation, notifications que tu as activées) et, si tu y as consenti, des actualités
        ASCEND, traiter tes paiements (abonnement ou achat de titre), et — avec ton consentement —
        améliorer le produit grâce à des statistiques d&apos;usage anonymisées.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Avec qui nous les partageons</h2>
      <p>
        ASCEND fait appel à des sous-traitants pour opérer le service : Supabase (hébergement des données
        et authentification), Vercel (hébergement de l&apos;application), Stripe et Shopify (paiements et
        lecture de tes revenus, si tu connectes l&apos;un de ces moyens de vérification), GoCardless Bank
        Account Data (agrégateur bancaire agréé, uniquement si tu connectes un compte bancaire — c&apos;est
        lui qui parle à ta banque, jamais ASCEND directement), Resend (envoi des emails transactionnels et,
        si tu y consens, des campagnes) et, uniquement si tu acceptes les cookies
        d&apos;analyse, PostHog — hébergé dans l&apos;Union européenne — pour une mesure d&apos;audience
        anonymisée. Certains de ces prestataires peuvent traiter des données en dehors de l&apos;Union
        européenne, dans le cadre de garanties contractuelles appropriées (clauses contractuelles types).
        Nous ne vendons jamais tes données à des tiers.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Combien de temps nous les conservons</h2>
      <p>
        Tes données sont conservées tant que ton compte est actif. Tu peux demander la suppression de ton
        compte et des données associées à tout moment depuis Réglages → Compte ; la suppression est
        définitive et déclenche l&apos;effacement en cascade de tes données (revenus, titres, messages,
        candidatures).
      </p>

      <h2 className="text-base font-semibold text-text-primary">Tes droits</h2>
      <p>
        Conformément au RGPD, tu disposes d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
        de limitation, d&apos;opposition et de portabilité sur tes données. Tu contrôles également la
        visibilité de tes revenus (exact, fourchette ou privé) directement depuis Réglages. Pour exercer
        ces droits, contacte-nous à l&apos;adresse indiquée ci-dessus ; tu peux aussi introduire une
        réclamation auprès de la CNIL.
      </p>

      <h2 className="text-base font-semibold text-text-primary">Cookies</h2>
      <p>
        Le détail des cookies utilisés par ASCEND, et comment gérer ton consentement, se trouve sur notre{" "}
        <Link href="/legal/cookies" className="underline hover:text-text-primary">
          page dédiée aux cookies
        </Link>
        .
      </p>
    </LegalPage>
  );
}
