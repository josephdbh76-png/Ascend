import "server-only";
import { getAppUrl } from "@/lib/utils";
import { renderEmailHtml } from "@/lib/emailRender";
import { transactionalEmailContent, welcomeEmailContent } from "@/lib/transactionalEmails";
import type { NotificationType } from "@/types/database.types";

/**
 * One entry per automatic email ASCEND actually sends. Sample title/body
 * text mirrors exactly what the real trigger sites (network.service.ts,
 * message.service.ts, opportunity.service.ts, revenue.service.ts,
 * stripe.service.ts) generate, so this preview matches production rather
 * than a generic placeholder.
 */
interface PreviewDefinition {
  key: string;
  label: string;
  trigger: string;
  type: NotificationType | "welcome";
  sampleTitle: string;
  sampleBody: string;
}

const SAMPLE_FIRST_NAME = "Camille";

const PREVIEW_DEFINITIONS: PreviewDefinition[] = [
  {
    key: "welcome",
    label: "Bienvenue",
    trigger: "Envoyé une fois, à la fin de l'inscription.",
    type: "welcome",
    sampleTitle: "",
    sampleBody: "",
  },
  {
    key: "new_follower",
    label: "Nouvel abonné",
    trigger: "Envoyé quand quelqu'un commence à suivre le membre.",
    type: "new_follower",
    sampleTitle: "Nouvel abonné",
    sampleBody: "Thomas M. a commencé à te suivre.",
  },
  {
    key: "new_message",
    label: "Nouveau message",
    trigger: "Envoyé à la réception d'un nouveau message.",
    type: "new_message",
    sampleTitle: "Nouveau message",
    sampleBody: "Thomas M. : « Salut ! Je suis intéressé par ton offre, on peut en discuter ? »",
  },
  {
    key: "new_application",
    label: "Nouvelle candidature",
    trigger: "Envoyé à l'auteur d'une opportunité quand quelqu'un postule.",
    type: "new_application",
    sampleTitle: "Nouvelle candidature",
    sampleBody: "Thomas M. a postulé à « Recherche CTO pour SaaS B2B en croissance ».",
  },
  {
    key: "application_accepted",
    label: "Candidature acceptée",
    trigger: "Envoyé au candidat quand sa candidature est acceptée.",
    type: "application_status_changed",
    sampleTitle: "Candidature acceptée",
    sampleBody: "Ta candidature à « Recherche CTO pour SaaS B2B en croissance » a été acceptée.",
  },
  {
    key: "application_rejected",
    label: "Candidature refusée",
    trigger: "Envoyé au candidat quand sa candidature est refusée.",
    type: "application_status_changed",
    sampleTitle: "Candidature refusée",
    sampleBody: "Ta candidature à « Recherche CTO pour SaaS B2B en croissance » n'a pas été retenue.",
  },
  {
    key: "verification_completed",
    label: "Revenus vérifiés",
    trigger: "Envoyé quand une source de revenu est connectée et vérifiée.",
    type: "verification_completed",
    sampleTitle: "Revenus vérifiés",
    sampleBody: "Ton activité est désormais vérifiée sur ASCEND.",
  },
  {
    key: "revenue_review_approved",
    label: "Déclaration validée",
    trigger: "Envoyé quand un admin valide une déclaration de revenu manuelle.",
    type: "revenue_review_completed",
    sampleTitle: "Revenu déclaré vérifié",
    sampleBody: "Ta déclaration « Ventes Q3 » de 12 500 € a été validée et compte désormais comme un revenu vérifié.",
  },
  {
    key: "revenue_review_rejected",
    label: "Déclaration refusée",
    trigger: "Envoyé quand un admin refuse une déclaration de revenu manuelle.",
    type: "revenue_review_completed",
    sampleTitle: "Déclaration de revenu refusée",
    sampleBody: "Ta déclaration « Ventes Q3 » n'a pas été validée : justificatif insuffisant.",
  },
];

export interface TransactionalEmailPreview {
  key: string;
  label: string;
  trigger: string;
}

export function listTransactionalEmailPreviews(): TransactionalEmailPreview[] {
  return PREVIEW_DEFINITIONS.map(({ key, label, trigger }) => ({ key, label, trigger }));
}

export function renderTransactionalEmailPreview(key: string): { subject: string; html: string } | null {
  const def = PREVIEW_DEFINITIONS.find((d) => d.key === key);
  if (!def) return null;

  const appUrl = getAppUrl();
  const content =
    def.type === "welcome"
      ? welcomeEmailContent(SAMPLE_FIRST_NAME)
      : transactionalEmailContent(def.type, {
          title: def.sampleTitle,
          body: def.sampleBody,
          firstName: SAMPLE_FIRST_NAME,
        });

  if (!content) return null;

  return {
    subject: content.subject,
    html: renderEmailHtml(content.body, {
      ctaLabel: content.ctaLabel,
      ctaUrl: content.ctaPath ? `${appUrl}${content.ctaPath}` : undefined,
    }),
  };
}
