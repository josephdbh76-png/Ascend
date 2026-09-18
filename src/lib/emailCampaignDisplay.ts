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
