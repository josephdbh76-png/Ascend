import "server-only";
import type { NotificationType } from "@/types/database.types";

export interface TransactionalEmailContent {
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaPath?: string;
}

/**
 * Deliberately curated, not "every notification type gets an email" — the
 * ones generated in bulk by background jobs (rank_increased,
 * milestone_reached, achievement_unlocked) stay in-app only, so a member's
 * inbox isn't flooded every time a scheduled job runs. Returns null for any
 * type not in this list, which the caller treats as "no email for this one".
 */
export function transactionalEmailContent(
  type: NotificationType,
  params: { title: string; body: string; firstName: string | null },
): TransactionalEmailContent | null {
  const greeting = params.firstName ? `Salut ${params.firstName},` : "Salut,";

  switch (type) {
    case "new_follower":
      return {
        subject: params.title,
        body: `${greeting}\n\n${params.body}`,
        ctaLabel: "Voir mon profil",
        ctaPath: "/app/dashboard",
      };
    case "new_message":
      return {
        subject: params.title,
        body: `${greeting}\n\n${params.body}`,
        ctaLabel: "Répondre",
        ctaPath: "/app/messages",
      };
    case "new_application":
      return {
        subject: params.title,
        body: `${greeting}\n\n${params.body}`,
        ctaLabel: "Voir la candidature",
        ctaPath: "/app/opportunities",
      };
    case "application_status_changed":
      return {
        subject: params.title,
        body: `${greeting}\n\n${params.body}`,
        ctaLabel: "Voir mes candidatures",
        ctaPath: "/app/opportunities",
      };
    case "verification_completed":
      return {
        subject: params.title,
        body: `${greeting}\n\n${params.body}\n\nTon classement et ton profil public reflètent maintenant tes vraies performances.`,
        ctaLabel: "Voir mon tableau de bord",
        ctaPath: "/app/dashboard",
      };
    case "revenue_review_completed":
      return {
        subject: params.title,
        body: `${greeting}\n\n${params.body}`,
        ctaLabel: "Voir mes réglages",
        ctaPath: "/app/settings#revenus",
      };
    case "revenue_reminder":
      return {
        subject: params.title,
        body: `${greeting}\n\n${params.body}`,
        ctaLabel: "Déclarer mes revenus",
        ctaPath: "/app/settings?connecter=manuel#comptes-connectes",
      };
    case "referral_rewarded":
      return {
        subject: params.title,
        body: `${greeting}\n\n${params.body}`,
        ctaLabel: "Voir mes gains",
        ctaPath: "/app/ligue/gains",
      };
    case "training_review_completed":
      return {
        subject: params.title,
        body: `${greeting}\n\n${params.body}`,
        ctaLabel: "Voir mes formations",
        ctaPath: "/app/settings#formations",
      };
    default:
      return null;
  }
}

export function welcomeEmailContent(firstName: string | null, foundingMemberNumber: number | null = null): TransactionalEmailContent {
  const greeting = firstName ? `Salut ${firstName},` : "Salut,";
  const founding = foundingMemberNumber
    ? `\n\nTu es le membre fondateur n°${foundingMemberNumber}. Ton titre de fondateur apparaîtra sur ton profil dès que tes revenus seront vérifiés.`
    : "";
  return {
    subject: foundingMemberNumber ? `Bienvenue sur ASCEND, membre fondateur n°${foundingMemberNumber}` : "Bienvenue sur ASCEND",
    body: `${greeting}\n\nBienvenue sur ASCEND, le réseau des entrepreneurs aux revenus vérifiés. Ton compte est prêt.${founding}\n\n## Pour bien démarrer\n- **Vérifie tes revenus** : connecte Stripe, Shopify, PayPal, Whop, Gumroad… en lecture seule, ou envoie un justificatif. Ton rang apparaît juste après.\n- **Découvre ta ligue** : tu joues avec des entrepreneurs de ton niveau, et la saison en cours t'attend avec ses défis.\n- **Complète ton profil** : une photo et une bio, pour que les autres membres sachent qui tu es.`,
    ctaLabel: "Vérifier mes revenus",
    ctaPath: "/app/settings#comptes-connectes",
  };
}
