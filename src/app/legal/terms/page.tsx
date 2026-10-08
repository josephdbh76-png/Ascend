import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions générales",
  description: "Conditions générales d'utilisation et de vente d'ASCEND.",
};

const h2 = "text-base font-semibold text-text-primary";

function Mail() {
  return (
    <a href={`mailto:${LEGAL.contactEmail}`} className="text-text-primary underline hover:text-gold">
      {LEGAL.contactEmail}
    </a>
  );
}

export default function TermsPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation et de vente">
      <p className="text-xs text-text-muted">Dernière mise à jour : {LEGAL.lastUpdated}</p>

      <p>
        Ces conditions s&apos;appliquent à toute utilisation d&apos;ASCEND et à tout achat effectué sur la
        plateforme. En créant un compte, tu les acceptes. L&apos;éditeur du service est présenté dans les{" "}
        <Link href="/legal/mentions" className="underline hover:text-text-primary">
          mentions légales
        </Link>
        .
      </p>

      <h2 className={h2}>1. Le service</h2>
      <p>
        ASCEND est un réseau où les entrepreneurs vérifient leurs revenus, apparaissent dans un classement,
        débloquent des titres et des accomplissements, relèvent des défis et échangent des opportunités
        professionnelles. Une partie du service est gratuite. Certaines fonctionnalités nécessitent un
        abonnement Pro ou Elite, ou l&apos;achat d&apos;un titre exclusif.
      </p>

      <h2 className={h2}>2. Ton compte</h2>
      <p>
        Tu dois exercer une activité entrepreneuriale réelle, fournir des informations exactes et ne
        connecter que des sources de revenus qui t&apos;appartiennent ou que tu es habilité à connecter.
        Tu es responsable de la confidentialité de ton mot de passe ; nous te recommandons
        d&apos;activer la double authentification dans les Réglages.
      </p>
      <p>
        Sont interdits : la falsification de revenus ou de justificatifs, l&apos;usurpation
        d&apos;identité, le spam, le harcèlement, et tout contenu frauduleux ou illicite dans la
        messagerie, les opportunités ou les candidatures. Ces comportements peuvent entraîner la
        suspension ou la suppression du compte, sans remboursement des sommes déjà versées.
      </p>

      <h2 className={h2}>3. Vérification des revenus et classement</h2>
      <p>
        Les revenus sont vérifiés à partir des données transmises par les services que tu connectes
        (Stripe, Shopify, PayPal, Lemon Squeezy, Whop, Gumroad, Paddle, Mollie, WooCommerce, Qonto) ou à partir des justificatifs que tu fournis,
        contrôlés par un administrateur. ASCEND lit ces données sans jamais initier de paiement, de
        remboursement ni de virement depuis tes comptes. Le classement reflète les données disponibles au
        moment du calcul et ne constitue ni une certification comptable ni un conseil financier.
      </p>

      <h2 className={h2}>4. Abonnements Pro et Elite</h2>
      <p>
        Les prix affichés sur la page Tarifs et dans les Réglages sont ceux que tu paies, toutes taxes comprises. L&apos;abonnement est payé
        d&apos;avance, par mois ou par an, via Stripe, et se renouvelle automatiquement à chaque échéance.
        Tu peux résilier à tout moment depuis Réglages → Gérer mon abonnement : la résiliation prend effet
        à la fin de la période déjà payée, sans nouveau prélèvement. Tu peux aussi changer de formule ;
        la différence est alors calculée au prorata.
      </p>
      <p>
        L&apos;essai gratuit Elite de 14 jours est réservé aux membres n&apos;ayant jamais eu
        d&apos;abonnement payant. Une carte est demandée à l&apos;inscription ; si tu résilies avant la fin
        de l&apos;essai, rien n&apos;est prélevé. Sinon, la facturation démarre automatiquement à la fin
        des 14 jours.
      </p>
      <p>
        Si tu t&apos;abonnes pendant la bêta, ton tarif reste le même tant que ton abonnement est actif
        sans interruption. En cas d&apos;échec de paiement, Stripe réessaie plusieurs fois ; sans
        régularisation, l&apos;abonnement prend fin et le compte repasse en formule Gratuite.
      </p>
      <p>
        Lorsqu&apos;elle est ouverte, la communauté WhatsApp Elite d&apos;ASCEND est réservée aux membres
        Elite. L&apos;accès suit l&apos;abonnement : un membre qui n&apos;est plus Elite en est retiré. Les règles de la communauté
        (respect, pas de démarchage non sollicité, pas de publicité sans accord de l&apos;équipe) y sont
        affichées ; l&apos;équipe peut retirer un membre qui ne les respecte pas, sans que cela modifie son
        abonnement.
      </p>

      <h2 className={h2}>5. Titres de la Boutique</h2>
      <p>
        Un titre de la Boutique est un contenu numérique affiché sur ton profil ASCEND, vendu en édition
        limitée ou ouverte. Chaque exemplaire d&apos;une édition limitée porte un numéro, qui le suit s&apos;il
        est revendu. Certains titres ne sont vendus que pendant une période indiquée sur le titre, ou
        seulement aux membres d&apos;une formule d&apos;abonnement : une fois sa vente terminée ou son édition
        épuisée, un titre n&apos;est jamais remis en vente par ASCEND. Il est livré immédiatement après
        confirmation du paiement. Un titre ne confère aucun droit de propriété intellectuelle, aucune
        valeur financière garantie et ne peut être échangé contre de l&apos;argent en dehors du Marché ASCEND.
      </p>
      <p>
        Si un titre s&apos;épuise pendant ton paiement, tu es remboursé intégralement et
        automatiquement.
      </p>

      <h2 className={h2}>6. Marché entre membres</h2>
      <p>
        Les titres revendables peuvent être mis en vente par leur propriétaire au prix qu&apos;il fixe, à
        partir de 10 €. Le paiement est traité par Stripe : le vendeur reçoit le prix de vente diminué de la
        commission d&apos;ASCEND (10 % jusqu&apos;à 50 €, avec un minimum de 2,50 €, puis dégressive jusqu&apos;à 5 %
        à partir de 1 000 €), le titre est transféré à l&apos;acheteur dès le paiement confirmé et le vendeur le
        perd. Les sommes dues au vendeur lui sont versées sur son compte bancaire une fois par mois, le 5,
        dès que Stripe a validé le paiement (quelques jours après la vente) ; son solde et ses versements
        sont affichés dans l&apos;onglet Marché. Pour vendre, le membre doit configurer un compte vendeur
        Stripe et faire vérifier son identité par Stripe. Si
        l&apos;annonce est vendue ou retirée pendant ton paiement, tu es remboursé intégralement et
        automatiquement.
      </p>

      <h2 className={h2}>7. Droit de rétractation</h2>
      <p>
        Pour un titre, contenu numérique fourni immédiatement, tu demandes expressément sa livraison dès le
        paiement et renonces ainsi à ton droit de rétractation, conformément à l&apos;article L221-28 du
        Code de la consommation. Pour un abonnement souscrit en tant que consommateur, tu disposes de 14
        jours à compter de la souscription pour te rétracter en écrivant à <Mail /> ; si tu as utilisé les
        fonctionnalités payantes pendant ce délai, le montant correspondant à la période écoulée peut
        être retenu.
      </p>

      <h2 className={h2}>8. Contenus publiés par les membres</h2>
      <p>
        Tu restes responsable de ce que tu publies (profil, messages, opportunités, candidatures,
        pièces jointes). ASCEND ne garantit pas l&apos;exactitude des informations publiées par les autres
        membres et peut retirer tout contenu manifestement illicite ou contraire à ces conditions. Pour
        signaler un contenu, écris à <Mail />.
      </p>

      <h2 className={h2}>9. Disponibilité et responsabilité</h2>
      <p>
        Nous faisons le nécessaire pour que le service soit disponible et fiable, sans pouvoir garantir une
        disponibilité continue. Les fonctionnalités peuvent évoluer ; une fonctionnalité payante retirée
        fait l&apos;objet d&apos;une information préalable. ASCEND ne peut être tenu responsable des
        décisions commerciales prises sur la base des informations publiées sur la plateforme.
      </p>

      <h2 className={h2}>10. Suppression du compte</h2>
      <p>
        Tu peux supprimer ton compte à tout moment depuis Réglages → Compte. La suppression est définitive
        et résilie immédiatement un abonnement en cours, sans nouveau prélèvement.
      </p>

      <h2 className={h2}>11. Réclamations, médiation et droit applicable</h2>
      <p>
        Pour toute question ou réclamation, écris à <Mail /> : nous te répondons au plus vite. Si
        tu es consommateur et qu&apos;aucune solution amiable n&apos;est trouvée, tu peux recourir
        gratuitement à un médiateur de la consommation ou à la plateforme européenne de règlement en
        ligne des litiges. Ces conditions sont régies par le droit français.
      </p>
    </LegalPage>
  );
}
