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
    case "referral_rewarded":
      return {
        subject: params.title,
        body: `${greeting}\n\n${params.body}`,
        ctaLabel: "Voir mes réglages",
        ctaPath: "/app/settings#parrainage",
      };
    default:
      return null;
  }
}

export function welcomeEmailContent(firstName: string | null): TransactionalEmailContent {
  const name = firstName ? firstName : "";
  return {
    subject: "Bienvenue sur ASCEND",
    body: `Salut ${name},\n\nTon compte ASCEND est prêt. Connecte Stripe (ou déclare tes revenus manuellement) pour vérifier tes performances et débloquer ton rang dans le classement.\n\nÀ très vite sur ASCEND.`,
    ctaLabel: "Aller sur mon tableau de bord",
    ctaPath: "/app/dashboard",
  };
}
