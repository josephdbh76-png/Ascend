// Pure types/constants shared between the server-only email-campaign
// service and the client-rendered admin panel — kept out of
// email-campaign.service.ts itself so importing them from a "use client"
// component doesn't pull that server-only module (and its Supabase/Resend
// dependencies) into the browser bundle.

export type CampaignAudience = "all" | "free" | "pro" | "elite" | "verified";

export const AUDIENCE_LABELS: Record<CampaignAudience, string> = {
  all: "Tous les membres consentants",
  free: "Formule Gratuite (consentants)",
  pro: "Formule Pro (consentants)",
  elite: "Formule Elite (consentants)",
  verified: "Revenus vérifiés (consentants)",
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
}

/**
 * A handful of ready-to-edit starting points, always available regardless
 * of what an admin has saved — shown first in the template picker, above
 * anything saved to email_templates.
 */
export const STARTER_TEMPLATES: EmailTemplateRow[] = [
  {
    id: "starter-event",
    name: "Annonce d'un événement",
    subject: "Un nouvel événement ASCEND arrive",
    body: "Bonjour,\n\nOn organise [nom de l'événement] le [date]. Voici ce qui t'attend :\n\n- [point clé 1]\n- [point clé 2]\n\nOn espère t'y voir.",
  },
  {
    id: "starter-feature",
    name: "Nouvelle fonctionnalité",
    subject: "Nouveau sur ASCEND : [nom de la fonctionnalité]",
    body: "Bonjour,\n\nOn vient de lancer [nom de la fonctionnalité] : [description en une phrase].\n\nVa y jeter un œil dans ton tableau de bord.",
  },
  {
    id: "starter-newsletter",
    name: "Point mensuel",
    subject: "Ce mois-ci sur ASCEND",
    body: "Bonjour,\n\nVoici ce qui s'est passé sur ASCEND ce mois-ci :\n\n- [chiffre ou temps fort 1]\n- [chiffre ou temps fort 2]\n\nMerci de faire partie de l'aventure.",
  },
];
