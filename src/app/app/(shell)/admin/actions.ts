"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin, adminSetTier, adminSetIsAdmin } from "@/services/admin.service";
import { syncPurchasableTitleStripeProducts } from "@/services/title.service";
import { approveRevenueDeclaration,
  approveRevenueDeclarations, rejectRevenueDeclaration } from "@/services/revenue.service";
import { syncAnnualPrices, updateElitePricing, type AnnualPriceSyncResult, type ElitePriceUpdateResult } from "@/services/subscription.service";
import {
  getAudienceCount,
  sendCampaign,
  sendCampaignPreview,
  listEmailTemplates,
  saveEmailTemplate,
  deleteEmailTemplate,
} from "@/services/email-campaign.service";
import { renderTransactionalEmailPreview } from "@/lib/transactionalEmailPreviews";
import { getResend, resendFromAddress, resendReplyTo } from "@/lib/resend";
import {
  createInfluencer,
  setInfluencerStatus,
  markCommissionPaid,
  listCommissionsForInfluencer,
  type InfluencerRow,
  type InfluencerCommissionRow,
} from "@/services/influencer.service";
import {
  createBanner,
  updateBanner,
  setBannerActive,
  deleteBanner,
  type DashboardBannerRow,
  type CreateBannerInput,
} from "@/services/banner.service";
import { setEmailTypeEnabledPlatformWide } from "@/services/notification.service";
import type { CampaignAudience, EmailTemplateRow } from "@/lib/emailCampaignDisplay";
import type { ActionResult } from "@/app/(auth)/actions";
import type { SubscriptionTier, PhysicalRewardStatus } from "@/types/database.types";
import { deleteMemberAccount } from "@/services/account.service";
import { createMetricsToken, revokeMetricsTokens } from "@/services/metrics.service";
import {
  saveSeason,
  activateSeason,
  saveChallenge,
  deleteChallenge,
  addSeasonReward,
  deleteSeasonReward,
  closeSeasonAndDistribute,
  setPhysicalRewardStatus,
  type SeasonInput,
  type ChallengeInput,
  type RewardInput,
} from "@/services/season.service";
import { generateLeagueSeason } from "@/services/league.service";
import { verifyUpload } from "@/services/upload.service";
import { createPromoCode, setPromoCodeActive, type PromoCodeInput } from "@/services/promo.service";
import { runStripeDiagnostic, type DiagnosticCheck } from "@/services/stripeDiagnostic.service";
import { createTitle, createTrophy, createAchievement, grantRewardToMember } from "@/services/catalog.service";
import {
  reviewTraining,
  setTrainingPinned,
  adminSetTrainingStatus,
  adminDeleteTraining,
  adminSaveTraining,
} from "@/services/training.service";
import type { TrainingInput } from "@/lib/validations";
import { setBetaMode } from "@/services/platform.service";
import { setCommunityEnabled, setCommunityInviteUrl, markWhatsappMemberAdded, deleteWhatsappMember } from "@/services/community.service";

const TIERS: SubscriptionTier[] = ["free", "pro", "elite"];

export async function adminSetTierAction(targetUserId: string, tier: SubscriptionTier): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!TIERS.includes(tier)) return { success: false, error: "Formule invalide." };

  try {
    await adminSetTier(targetUserId, tier);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin", "layout");
  return { success: true, data: undefined };
}

export async function adminSetIsAdminAction(targetUserId: string, isAdmin: boolean): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };

  try {
    await adminSetIsAdmin(targetUserId, isAdmin);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin", "layout");
  return { success: true, data: undefined };
}

export async function adminSyncTitleStripeProductsAction(): Promise<ActionResult<{ created: string[]; updated: string[] }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };

  try {
    const result = await syncPurchasableTitleStripeProducts();
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function adminUpdateElitePricingAction(): Promise<ActionResult<ElitePriceUpdateResult[]>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };

  try {
    const result = await updateElitePricing();
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
  revalidatePath("/app/admin", "layout");
  return { success: true, data: undefined };
}

export async function adminApproveRevenueDeclarationsAction(declarationIds: string[]): Promise<ActionResult<{ count: number }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };
  try {
    const count = await approveRevenueDeclarations(declarationIds.slice(0, 50), userData.user.id);
    revalidatePath("/app/admin", "layout");
    return { success: true, data: { count } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
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
  revalidatePath("/app/admin", "layout");
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
    revalidatePath("/app/admin", "layout");
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
    revalidatePath("/app/admin", "layout");
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
      replyTo: resendReplyTo(),
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
    revalidatePath("/app/admin", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function createInfluencerAction(
  name: string,
  email: string,
  code: string,
  discountPercent: number,
  commissionPercent: number,
  duration: "forever" | "once",
): Promise<ActionResult<InfluencerRow>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!name.trim() || !email.trim() || !code.trim()) return { success: false, error: "Nom, email et code obligatoires." };

  try {
    const influencer = await createInfluencer(name, email, code, commissionPercent / 100, discountPercent, duration);
    revalidatePath("/app/admin", "layout");
    return { success: true, data: influencer };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function setInfluencerStatusAction(influencerId: string, status: "active" | "inactive"): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    await setInfluencerStatus(influencerId, status);
    revalidatePath("/app/admin", "layout");
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
    revalidatePath("/app/admin", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function setEmailTypeEnabledAction(emailKey: string, enabled: boolean): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    await setEmailTypeEnabledPlatformWide(emailKey, enabled);
    revalidatePath("/app/admin", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function createBannerAction(input: CreateBannerInput): Promise<ActionResult<DashboardBannerRow>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!input.imageUrl || !input.title.trim()) return { success: false, error: "Image et titre obligatoires." };

  try {
    const banner = await createBanner(input);
    revalidatePath("/app/admin", "layout");
    revalidatePath("/app/dashboard");
    return { success: true, data: banner };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function updateBannerAction(
  bannerId: string,
  input: CreateBannerInput,
): Promise<ActionResult<DashboardBannerRow>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!input.imageUrl || !input.title.trim()) return { success: false, error: "Image et titre obligatoires." };

  try {
    const banner = await updateBanner(bannerId, input);
    revalidatePath("/app/admin", "layout");
    revalidatePath("/app/dashboard");
    return { success: true, data: banner };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function setBannerActiveAction(bannerId: string, isActive: boolean): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    await setBannerActive(bannerId, isActive);
    revalidatePath("/app/admin", "layout");
    revalidatePath("/app/dashboard");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function deleteBannerAction(bannerId: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    await deleteBanner(bannerId);
    revalidatePath("/app/admin", "layout");
    revalidatePath("/app/dashboard");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}


/** Shared upload used by training covers and dashboard banners. */
/** Called once the browser has sent the image to storage (see lib/uploadClient). */
export async function uploadAdminImageAction(path: string): Promise<ActionResult<{ url: string }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tu n'es pas connecté." };
  try {
    const file = await verifyUpload(user.id, "admin-media", path);
    return { success: true, data: { url: file.publicUrl! } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Le téléversement a échoué." };
  }
}

// ---------------------------------------------------------------- stripe diagnostic

export async function runStripeDiagnosticAction(): Promise<ActionResult<DiagnosticCheck[]>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    return { success: true, data: await runStripeDiagnostic() };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

// ---------------------------------------------------------------- promo codes

export async function createPromoCodeAction(input: PromoCodeInput): Promise<ActionResult> {
  return adminRun(() => createPromoCode(input));
}

export async function setPromoCodeActiveAction(promotionCodeId: string, active: boolean): Promise<ActionResult> {
  return adminRun(() => setPromoCodeActive(promotionCodeId, active));
}

// ---------------------------------------------------------------- members

export async function adminDeleteMemberAction(targetUserId: string, confirmUsername: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === targetUserId) return { success: false, error: "Supprime ton propre compte depuis tes Réglages." };

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("username").eq("id", targetUserId).maybeSingle();
  if (!target) return { success: false, error: "Membre introuvable." };
  if (target.username !== confirmUsername.trim().replace(/^@/, "")) {
    return { success: false, error: "Le nom d'utilisateur saisi ne correspond pas." };
  }

  try {
    await deleteMemberAccount(targetUserId);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin", "layout");
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------- metrics links

export async function createMetricsLinkAction(): Promise<ActionResult<{ token: string }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  try {
    return { success: true, data: { token: await createMetricsToken(user!.id) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function revokeMetricsLinksAction(): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    await revokeMetricsTokens();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin", "layout");
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------- seasons

async function adminRun(fn: () => Promise<unknown>, paths: string[] = []): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    await fn();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin", "layout");
  for (const p of paths) revalidatePath(p);
  return { success: true, data: undefined };
}

export async function saveSeasonAction(input: SeasonInput): Promise<ActionResult> {
  if (!input.name.trim() || !input.label.trim()) return { success: false, error: "Nom et période sont obligatoires." };
  if (new Date(input.endsAt) <= new Date(input.startsAt)) return { success: false, error: "La fin doit être après le début." };
  return adminRun(() => saveSeason(input), ["/app/challenges"]);
}

export async function activateSeasonAction(seasonId: string): Promise<ActionResult> {
  return adminRun(() => activateSeason(seasonId), ["/app/challenges", "/app/dashboard"]);
}

export async function saveChallengeAction(input: ChallengeInput): Promise<ActionResult> {
  if (!input.title.trim() || !input.description.trim()) return { success: false, error: "Titre et description sont obligatoires." };
  if (!(input.points >= 0) || !(input.target >= 0)) return { success: false, error: "Valeurs invalides." };
  return adminRun(() => saveChallenge(input), ["/app/challenges"]);
}

export async function deleteChallengeAction(challengeId: string): Promise<ActionResult> {
  return adminRun(() => deleteChallenge(challengeId), ["/app/challenges"]);
}

export async function addSeasonRewardAction(input: RewardInput): Promise<ActionResult> {
  if (input.rankFrom < 1 || input.rankTo < input.rankFrom) return { success: false, error: "Plage de rangs invalide." };
  if (!input.label.trim()) return { success: false, error: "Décris la récompense." };
  if (input.kind === "title" && !input.titleId) return { success: false, error: "Choisis un titre." };
  if (input.kind === "trophy" && !input.trophyId) return { success: false, error: "Choisis un trophée." };
  return adminRun(() => addSeasonReward(input), ["/app/challenges"]);
}

export async function deleteSeasonRewardAction(rewardId: string): Promise<ActionResult> {
  return adminRun(() => deleteSeasonReward(rewardId), ["/app/challenges"]);
}

export async function generateLeagueSeasonAction(
  seasonId: string,
): Promise<ActionResult<{ created: number; updated: number; hidden: number; rewards: number }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    const result = await generateLeagueSeason(seasonId);
    revalidatePath("/app/admin", "layout");
    revalidatePath("/app/challenges");
    revalidatePath("/app/dashboard");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function closeSeasonAction(seasonId: string): Promise<ActionResult<{ winners: number }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  try {
    const result = await closeSeasonAndDistribute(seasonId);
    revalidatePath("/app/admin", "layout");
    revalidatePath("/app/challenges");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function setPhysicalRewardStatusAction(
  seasonId: string,
  userId: string,
  status: PhysicalRewardStatus,
): Promise<ActionResult> {
  return adminRun(() => setPhysicalRewardStatus(seasonId, userId, status));
}

// ---------------------------------------------------------------- catalog

export async function createTitleAction(input: Parameters<typeof createTitle>[0]): Promise<ActionResult> {
  if (!input.name.trim() || !input.description.trim()) return { success: false, error: "Nom et description sont obligatoires." };
  return adminRun(() => createTitle(input), ["/app/titles"]);
}

export async function createTrophyAction(input: Parameters<typeof createTrophy>[0]): Promise<ActionResult> {
  if (!input.name.trim() || !input.description.trim()) return { success: false, error: "Nom et description sont obligatoires." };
  return adminRun(() => createTrophy(input));
}

export async function createAchievementAction(input: Parameters<typeof createAchievement>[0]): Promise<ActionResult> {
  if (!input.name.trim() || !input.description.trim()) return { success: false, error: "Nom et description sont obligatoires." };
  return adminRun(() => createAchievement(input), ["/app/achievements"]);
}

export async function grantRewardAction(input: Parameters<typeof grantRewardToMember>[0]): Promise<ActionResult> {
  if (!input.username.trim() || !input.id) return { success: false, error: "Choisis un membre et une récompense." };
  return adminRun(() => grantRewardToMember(input));
}

// ---------------------------------------------------------------- trainings

function revalidateTrainings() {
  revalidatePath("/app/admin", "layout");
  revalidatePath("/formations", "layout");
  revalidatePath("/app/network");
}

export async function reviewTrainingAction(id: string, approve: boolean, reason?: string): Promise<ActionResult> {
  return adminRun(async () => {
    await reviewTraining(id, approve, reason);
    revalidateTrainings();
  });
}

export async function setTrainingPinnedAction(id: string, pinned: boolean): Promise<ActionResult> {
  return adminRun(async () => {
    await setTrainingPinned(id, pinned);
    revalidateTrainings();
  });
}

export async function adminSetTrainingStatusAction(id: string, status: "published" | "archived"): Promise<ActionResult> {
  return adminRun(async () => {
    await adminSetTrainingStatus(id, status);
    revalidateTrainings();
  });
}

export async function adminDeleteTrainingAction(id: string): Promise<ActionResult> {
  return adminRun(async () => {
    await adminDeleteTraining(id);
    revalidateTrainings();
  });
}

export async function adminSaveTrainingAction(
  input: TrainingInput & { ownerUsername?: string; creatorName?: string },
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const result = await adminSaveTraining(input, id);
  if (!result.ok) return { success: false, error: result.error };
  revalidateTrainings();
  return { success: true, data: { id: result.id } };
}

// ---------------------------------------------------------------- platform

export async function setBetaModeAction(enabled: boolean): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  try {
    await setBetaMode(enabled, user!.id);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  // Every page reads the plan: refresh them all, including the static signup page.
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------- WhatsApp community

export async function setCommunityInviteUrlAction(url: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return adminRun(() => setCommunityInviteUrl(url, user!.id), ["/app/community"]);
}

export async function setCommunityEnabledAction(enabled: boolean): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const result = await adminRun(() => setCommunityEnabled(enabled, user!.id));
  // The menu entry and the Elite plan's features show on every page.
  if (result.success) revalidatePath("/", "layout");
  return result;
}

export async function markWhatsappMemberAddedAction(id: string): Promise<ActionResult> {
  return adminRun(() => markWhatsappMemberAdded(id), ["/app/community"]);
}

export async function deleteWhatsappMemberAction(id: string): Promise<ActionResult> {
  return adminRun(() => deleteWhatsappMember(id), ["/app/community"]);
}
