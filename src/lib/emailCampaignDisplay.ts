// Pure types/constants shared between the server-only email-campaign
// service and the client-rendered admin panel — kept out of
// email-campaign.service.ts itself so importing them from a "use client"
// component doesn't pull that server-only module (and its Supabase/Resend
// dependencies) into the browser bundle.

export type CampaignAudience = "all" | "free" | "pro" | "elite" | "verified" | "unverified";

export const AUDIENCE_LABELS: Record<CampaignAudience, string> = {
  all: "Tous les membres consentants",
  free: "Formule Gratuite (consentants)",
  pro: "Formule Pro (consentants)",
  elite: "Formule Elite (consentants)",
  verified: "Revenus vérifiés (consentants)",
  unverified: "Revenus pas encore vérifiés (consentants)",
};

export interface CampaignHistoryRow {
  id: string;
  subject: string;
  audience: CampaignAudience;
  recipientCount: number;
  sentAt: string;
}

export interface EmailTemplateRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  /** Starter templates: who it is written for, preselected when it's loaded. */
  audience?: CampaignAudience;
  /** Starter templates: when to send it. */
  when?: string;
}

/** Brackets left in a campaign, like "[date]" (a link "[text](url)" is not one). */
export function unfilledPlaceholders(text: string): string[] {
  return [...new Set(text.match(/\[[^\]\n]+\](?!\()/g) ?? [])];
}

/**
 * Ready-to-edit campaigns for every moment of the ASCEND year, always
 * available above anything saved to email_templates. Written in the email
 * markup (lib/emailRender): "## " titles, "- " lists, "> " highlighted box,
 * a "[Label](/path)" paragraph for the button, {prénom} for the first name.
 * Brackets are the parts to fill in before sending.
 */
export const STARTER_TEMPLATES: EmailTemplateRow[] = [
  {
    id: "starter-launch",
    name: "Lancement officiel",
    when: "Le jour où la bêta s'arrête.",
    audience: "all",
    subject: "ASCEND est officiellement ouvert",
    body: `Salut {prénom},

Après des semaines de bêta, ASCEND ouvre aujourd'hui à tous. Merci d'avoir été là dès le début : la plateforme s'est construite avec tes retours.

## Ce qui ouvre aujourd'hui
- Les formules **Pro** et **Elite**, avec 14 jours d'essai Elite pour qui n'a jamais été abonné
- La **Boutique** de titres en éditions limitées, et le **Marché** pour les revendre entre membres
- Le titre **Pionnier** : en vente 7 jours seulement, jamais réédité

## Ce qui change pour toi
Pendant la bêta, Elite t'était offert. À partir d'aujourd'hui, ton compte repasse en formule Gratuite, sauf si tu choisis Pro ou Elite. Ton profil, tes revenus vérifiés et ton rang restent bien sûr les tiens.

[Choisir ma formule](/app/settings#abonnement)`,
  },
  {
    id: "starter-verify",
    name: "Relance : vérifier ses revenus",
    when: "Quelques jours après l'inscription, pour ceux qui n'ont rien vérifié.",
    audience: "unverified",
    subject: "{prénom}, ton profil attend ses chiffres",
    body: `Salut {prénom},

Ton profil ASCEND est créé, mais il lui manque l'essentiel : tes revenus vérifiés. Sans eux, tu n'entres ni dans le classement ni dans ta ligue.

Ça prend deux minutes, au choix :
- **Connecte ta plateforme** en lecture seule : Stripe, Shopify, PayPal, Whop, Gumroad… Personne ne peut déplacer ni dépenser ton argent.
- **Ou envoie un justificatif** : une capture ou un export de tes ventes, vérifié à la main par l'équipe.

Dès que c'est fait, tu découvres ta ligue et les défis de la saison.

[Vérifier mes revenus](/app/settings#comptes-connectes)`,
  },
  {
    id: "starter-season-start",
    name: "Début de saison",
    when: "Le jour où une saison commence.",
    audience: "all",
    subject: "La saison [numéro] commence : ta ligue t'attend",
    body: `Salut {prénom},

La saison [numéro] d'ASCEND commence aujourd'hui et dure jusqu'au [date de fin].

## Comment ça marche
- Tu joues dans ta ligue, avec des entrepreneurs de ton niveau : Bronze, Argent, Or, Platine ou Diamant
- Chaque défi réussi te rapporte des points
- Les mieux classés de chaque ligue gagnent des titres et des trophées en fin de saison

Le premier défi est déjà ouvert.

[Voir mes défis](/app/challenges)`,
  },
  {
    id: "starter-season-results",
    name: "Résultats de saison",
    when: "Quand les récompenses de la saison sont distribuées.",
    audience: "all",
    subject: "Les résultats de la saison [numéro]",
    body: `Salut {prénom},

La saison [numéro] est terminée. Bravo à tous ceux qui ont relevé les défis.

## Les champions de chaque ligue
- **Diamant** : [@pseudo]
- **Platine** : [@pseudo]
- **Or** : [@pseudo]
- **Argent** : [@pseudo]
- **Bronze** : [@pseudo]

Les titres et les trophées sont sur les profils des gagnants : va voir si tu en fais partie. La saison [numéro suivant] démarre le [date].

[Voir le classement](/app/leaderboard)`,
  },
  {
    id: "starter-title-drop",
    name: "Sortie d'un titre",
    when: "Quand un nouveau titre arrive dans la Boutique.",
    audience: "all",
    subject: "Nouveau titre : [nom du titre], [nombre] exemplaires",
    body: `Salut {prénom},

Un nouveau titre arrive dans la Boutique : **[nom du titre]**.

- [nombre] exemplaires numérotés, jamais réédités
- En vente jusqu'au [date], ou jusqu'à épuisement
- Il s'affiche à côté de ton nom, sur ton profil et dans le Réseau

Une fois épuisé, il ne se trouvera plus que sur le Marché, auprès des membres qui le possèdent.

[Voir la Boutique](/app/titles)`,
  },
  {
    id: "starter-event",
    name: "Événement",
    when: "Une semaine avant un live ou une rencontre.",
    audience: "all",
    subject: "Live ASCEND : [thème], le [date]",
    body: `Salut {prénom},

On organise un live le **[jour et date] à [heure]** : [thème, en une phrase].

## Au programme
- [point 1]
- [point 2]
- Tes questions, en direct

C'est gratuit et ouvert à tous les membres. Inscris-toi pour recevoir le lien et un rappel le jour J.

[Je m'inscris]([lien d'inscription])`,
  },
  {
    id: "starter-feature",
    name: "Nouvelle fonctionnalité",
    when: "Quand une nouveauté est en ligne.",
    audience: "all",
    subject: "Nouveau sur ASCEND : [fonctionnalité]",
    body: `Salut {prénom},

**[Fonctionnalité]** est disponible sur ASCEND : [ce que ça change pour toi, en une phrase].

## Comment l'utiliser
- [étape 1]
- [étape 2]

Dis-nous ce que tu en penses en répondant à cet e-mail : on lit tout.

[Essayer maintenant](/app/dashboard)`,
  },
  {
    id: "starter-monthly",
    name: "Point du mois",
    when: "Début de chaque mois.",
    audience: "all",
    subject: "Ce mois-ci sur ASCEND",
    body: `Salut {prénom},

Voici ce qui s'est passé sur ASCEND en [mois].

## En chiffres
- [nombre] nouveaux membres
- [montant] € de revenus vérifiés au total
- [nombre] opportunités publiées

## Les temps forts
- [temps fort 1]
- [temps fort 2]

Merci de faire grandir ASCEND avec nous.

[Voir mon tableau de bord](/app/dashboard)`,
  },
  {
    id: "starter-offer",
    name: "Offre aux membres gratuits",
    when: "Après le lancement : les paiements sont fermés pendant la bêta.",
    audience: "free",
    subject: "-15 % sur ton premier paiement Pro ou Elite",
    body: `Salut {prénom},

Pour passer à la vitesse supérieure, voici -15 % sur ton premier paiement Pro ou Elite, avec ce code :

> ASCEND15

- **Pro** : les opportunités, les analyses avancées et la messagerie
- **Elite** : tout Pro, plus la publication d'opportunités, les messages illimités et le réseau des fondateurs

Le code est valable sur ton premier abonnement, à saisir au moment du paiement.

[Choisir ma formule](/app/settings#abonnement)`,
  },
  {
    id: "starter-winback",
    name: "Retour des inactifs",
    when: "Pour les membres qui ne sont pas revenus depuis un moment.",
    audience: "all",
    subject: "{prénom}, ça bouge sur ASCEND",
    body: `Salut {prénom},

Ça fait un moment qu'on ne t'a pas vu sur ASCEND. Pendant ce temps :

- [nouveauté ou chiffre 1]
- [nouveauté ou chiffre 2]

Ton profil et ton rang t'attendent, et la saison en cours a encore des défis à relever.

[Revenir sur ASCEND](/app/dashboard)`,
  },
  {
    id: "starter-community",
    name: "Ouverture de la communauté WhatsApp",
    when: "Quand la communauté est affichée aux membres (Admin → Communauté).",
    audience: "elite",
    subject: "La communauté ASCEND Elite est ouverte",
    body: `Salut {prénom},

La communauté WhatsApp des membres Elite est ouverte : une ligne directe avec l'équipe, les événements ASCEND et le networking entre fondateurs.

## Ce que tu y trouves
- **Annonces** : les nouveautés et les sorties de titres en avant-première
- **Questions et support** : l'équipe te répond directement
- **Événements** : lives, masterclass et rencontres
- **Networking** : associés, partenaires, collabs

Pour entrer, donne ton numéro WhatsApp sur la page Communauté, puis demande à rejoindre.

[Rejoindre la communauté](/app/community)`,
  },
];
