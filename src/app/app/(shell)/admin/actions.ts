"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin, adminSetTier, adminSetIsAdmin } from "@/services/admin.service";
import { syncPurchasableTitleStripeProducts } from "@/services/title.service";
import { approveRevenueDeclaration, rejectRevenueDeclaration } from "@/services/revenue.service";
import { syncAnnualPrices, type AnnualPriceSyncResult } from "@/services/subscription.service";
import {
  getAudienceCount,
  sendCampaign,
  sendCampaignPreview,
  listEmailTemplates,
  saveEmailTemplate,
  deleteEmailTemplate,
} from "@/services/email-campaign.service";
import { renderTransactionalEmailPreview } from "@/lib/transactionalEmailPreviews";
import { getResend, resendFromAddress } from "@/lib/resend";
import {
  createInfluencer,
  setInfluencerStatus,
  markCommissionPaid,
  listCommissionsForInfluencer,
  type InfluencerRow,
  type InfluencerCommissionRow,
} from "@/services/influencer.service";
import type { CampaignAudience, EmailTemplateRow } from "@/lib/emailCampaignDisplay";
import type { ActionResult } from "@/app/(auth)/actions";
import type { SubscriptionTier } from "@/types/database.types";

const TIERS: SubscriptionTier[] = ["free", "pro", "elite"];

export async function adminSetTierAction(targetUserId: string, tier: SubscriptionTier): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!TIERS.includes(tier)) return { success: false, error: "Formule invalide." };

  try {
    await adminSetTier(targetUserId, tier);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin");
  return { success: true, data: undefined };
}

export async function adminSetIsAdminAction(targetUserId: string, isAdmin: boolean): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };

  try {
    await adminSetIsAdmin(targetUserId, isAdmin);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin");
  return { success: true, data: undefined };
}

export async function adminSyncTitleStripeProductsAction(): Promise<ActionResult<{ created: string[] }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };

  try {
    const result = await syncPurchasableTitleStripeProducts();
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function adminSyncAnnualPricesAction(): Promise<ActionResult<AnnualPriceSyncResult[]>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };

  try {
    const result = await syncAnnualPrices();
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function adminApproveRevenueDeclarationAction(declarationId: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await approveRevenueDeclaration(declarationId, userData.user.id);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin");
  return { success: true, data: undefined };
}

export async function adminRejectRevenueDeclarationAction(declarationId: string, reason: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!reason.trim()) return { success: false, error: "Indique une raison pour le refus." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await rejectRevenueDeclaration(declarationId, userData.user.id, reason.trim());
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin");
  return { success: true, data: undefined };
}

export async function getAudienceCountAction(audience: CampaignAudience): Promise<ActionResult<number>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    return { success: true, data: await getAudienceCount(audience) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function sendCampaignPreviewAction(subject: string, body: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!subject.trim() || !body.trim()) return { success: false, error: "Sujet et message obligatoires." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) return { success: false, error: "Impossible de trouver ton adresse email." };

  try {
    await sendCampaignPreview(userData.user.email, subject.trim(), body.trim());
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  return { success: true, data: undefined };
}

export async function sendCampaignAction(
  subject: string,
  body: string,
  audience: CampaignAudience,
): Promise<ActionResult<{ recipientCount: number }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!subject.trim() || !body.trim()) return { success: false, error: "Sujet et message obligatoires." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    const result = await sendCampaign({
      subject: subject.trim(),
      body: body.trim(),
      audience,
      sentByUserId: userData.user.id,
    });
    revalidatePath("/app/admin");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function listEmailTemplatesAction(): Promise<ActionResult<EmailTemplateRow[]>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    return { success: true, data: await listEmailTemplates() };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function saveEmailTemplateAction(name: string, subject: string, body: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!name.trim() || !subject.trim() || !body.trim()) return { success: false, error: "Nom, sujet et message obligatoires." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await saveEmailTemplate({ name: name.trim(), subject: subject.trim(), body: body.trim(), createdBy: userData.user.id });
    revalidatePath("/app/admin");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function getTransactionalEmailPreviewAction(
  key: string,
): Promise<ActionResult<{ subject: string; html: string }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const preview = renderTransactionalEmailPreview(key);
  if (!preview) return { success: false, error: "Aperçu introuvable." };
  return { success: true, data: preview };
}

export async function sendTransactionalEmailPreviewAction(key: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const preview = renderTransactionalEmailPreview(key);
  if (!preview) return { success: false, error: "Aperçu introuvable." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) return { success: false, error: "Impossible de trouver ton adresse email." };

  try {
    await getResend().emails.send({
      from: resendFromAddress(),
      to: userData.user.email,
      subject: `[Aperçu] ${preview.subject}`,
      html: preview.html,
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  return { success: true, data: undefined };
}

export async function deleteEmailTemplateAction(id: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    await deleteEmailTemplate(id);
    revalidatePath("/app/admin");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function createInfluencerAction(name: string, email: string, code: string): Promise<ActionResult<InfluencerRow>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!name.trim() || !email.trim() || !code.trim()) return { success: false, error: "Nom, email et code obligatoires." };

  try {
    const influencer = await createInfluencer(name, email, code);
    revalidatePath("/app/admin");
    return { success: true, data: influencer };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function setInfluencerStatusAction(influencerId: string, status: "active" | "inactive"): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    await setInfluencerStatus(influencerId, status);
    revalidatePath("/app/admin");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function listInfluencerCommissionsAction(influencerId: string): Promise<ActionResult<InfluencerCommissionRow[]>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    return { success: true, data: await listCommissionsForInfluencer(influencerId) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function markCommissionPaidAction(commissionId: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    await markCommissionPaid(commissionId);
    revalidatePath("/app/admin");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}
