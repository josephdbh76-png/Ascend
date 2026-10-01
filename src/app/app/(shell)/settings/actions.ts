"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  profileUpdateSchema,
  privacySettingsSchema,
  businessSchema,
  type BusinessInput,
  type TrainingInput,
} from "@/lib/validations";
import {
  saveOwnerTraining,
  setOwnerTrainingArchived,
  deleteOwnerTraining,
  uploadTrainingCover,
} from "@/services/training.service";
import { normalizeWebsite } from "@/lib/business";
import { toFriendlyAuthError } from "@/lib/errors";
import { getSubscription, hasProAccess, hasEliteAccess } from "@/services/subscription.service";
import { verifyAndSaveSiret } from "@/services/siret.service";
import { connectShopifyWithCredentials } from "@/services/shopify.service";
import { connectPayPalWithCredentials } from "@/services/paypal.service";
import { connectLemonSqueezyWithKey } from "@/services/lemonsqueezy.service";
import { connectApiSource, syncApiSource, disconnectApiSource, isApiConnector } from "@/services/apiConnector.service";
import type { ApiConnectorId } from "@/lib/connectors";
import {
  listBankInstitutions,
  initiateBankConnection,
  syncBankTransactions,
  listBankTransactions,
  setTransactionRevenueTag,
  disconnectBankSource,
  type BankTransactionRow,
} from "@/services/bank.service";
import type { Aspsp } from "@/lib/enableBanking";
import { submitRevenueDeclaration } from "@/services/revenue.service";
import { deleteMemberAccount } from "@/services/account.service";
import { verifyUpload, removeOtherFiles } from "@/services/upload.service";
import { evaluateChallengeProgress } from "@/services/challenge.service";
import { ACCENT_THEMES, MAX_EXTRA_BUSINESSES } from "@/lib/constants";
import type { ActionResult } from "@/app/(auth)/actions";
import type { AccentTheme, TrainingStatus } from "@/types/database.types";

/** Called once the browser has sent the photo to storage (see lib/uploadClient). */
export async function uploadAvatarAction(path: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  let url: string;
  try {
    url = (await verifyUpload(userData.user.id, "avatar", path)).publicUrl!;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Le téléversement a échoué." };
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userData.user.id);
  if (error) return { success: false, error: toFriendlyAuthError(error.message) };

  // Only the current photo is kept.
  await removeOtherFiles("avatar", userData.user.id, path).catch((err) => console.error("Old avatar cleanup failed:", err));
  // The sidebar, the header and the public profile show it too.
  revalidatePath("/app", "layout");
  revalidatePath("/profile/[username]", "page");
  return { success: true, data: { url } };
}

export async function updateProfileAction(input: {
  firstName: string;
  lastName: string;
  bio?: string;
  country: string;
  city?: string;
}): Promise<ActionResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      bio: parsed.data.bio ?? null,
      country: parsed.data.country,
      city: parsed.data.city || null,
    })
    .eq("id", userData.user.id);

  if (error) return { success: false, error: toFriendlyAuthError(error.message) };
  // The name shows in the sidebar and the header too.
  revalidatePath("/app", "layout");
  revalidatePath("/profile/[username]", "page");
  return { success: true, data: undefined };
}

type BusinessWrite = {
  name: string;
  category: string;
  custom_category: string | null;
  description: string | null;
  website: string | null;
};

function parseBusiness(input: BusinessInput): { ok: true; row: BusinessWrite } | { ok: false; error: string } {
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Vérifie les informations de ton activité." };
  }
  const website = normalizeWebsite(parsed.data.website);
  if (parsed.data.website && !website) {
    return { ok: false, error: "L'adresse du site n'est pas valide. Exemple : monsite.fr" };
  }
  return {
    ok: true,
    row: {
      name: parsed.data.name,
      category: parsed.data.category,
      custom_category: parsed.data.customCategory || null,
      description: parsed.data.description || null,
      website,
    },
  };
}

export async function updateBusinessAction(input: BusinessInput & { skills?: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const parsed = parseBusiness(input);
  if (!parsed.ok) return { success: false, error: parsed.error };

  const { error } = await supabase
    .from("businesses")
    .upsert({ user_id: userData.user.id, ...parsed.row }, { onConflict: "user_id" });

  if (error) return { success: false, error: toFriendlyAuthError(error.message) };

  const skills = (input.skills ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  const { error: skillsError } = await supabase.from("profiles").update({ skills }).eq("id", userData.user.id);
  if (skillsError) return { success: false, error: toFriendlyAuthError(skillsError.message) };

  return { success: true, data: undefined };
}

export async function saveExtraBusinessAction(
  input: BusinessInput & { id?: string },
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };
  const userId = userData.user.id;

  const parsed = parseBusiness(input);
  if (!parsed.ok) return { success: false, error: parsed.error };

  if (input.id) {
    const { data, error } = await supabase
      .from("extra_businesses")
      .update(parsed.row)
      .eq("id", input.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error) return { success: false, error: "Impossible d'enregistrer cette activité. Réessaie." };
    if (!data) return { success: false, error: "Cette activité n'existe plus. Recharge la page." };
    revalidatePath("/app/settings");
    return { success: true, data: { id: data.id } };
  }

  const { count } = await supabase
    .from("extra_businesses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= MAX_EXTRA_BUSINESSES) {
    return { success: false, error: `Tu peux présenter jusqu'à ${MAX_EXTRA_BUSINESSES} autres activités.` };
  }

  const { data, error } = await supabase
    .from("extra_businesses")
    .insert({ user_id: userId, position: count ?? 0, ...parsed.row })
    .select("id")
    .single();
  if (error || !data) return { success: false, error: "Impossible d'ajouter cette activité. Réessaie." };
  revalidatePath("/app/settings");
  return { success: true, data: { id: data.id } };
}

export async function deleteExtraBusinessAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const { error } = await supabase.from("extra_businesses").delete().eq("id", id).eq("user_id", userData.user.id);
  if (error) return { success: false, error: "Impossible de retirer cette activité. Réessaie." };
  revalidatePath("/app/settings");
  return { success: true, data: undefined };
}

export async function verifySiretAction(siret: string): Promise<ActionResult<{ legalName: string }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const result = await verifyAndSaveSiret(userData.user.id, siret.replace(/\s/g, ""));
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: { legalName: result.legalName } };
}

export async function connectShopifyAction(
  shop: string,
  clientId: string,
  clientSecret: string,
): Promise<ActionResult<{ isFirstVerification: boolean; monthsSynced: number }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    const { syncResult } = await connectShopifyWithCredentials(
      userData.user.id,
      shop.trim().toLowerCase(),
      clientId.trim(),
      clientSecret.trim(),
    );
    if (!syncResult.success) return { success: false, error: syncResult.error };
    return {
      success: true,
      data: { isFirstVerification: syncResult.isFirstVerification, monthsSynced: syncResult.monthsSynced },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Impossible de connecter Shopify." };
  }
}

export async function connectPayPalAction(
  clientId: string,
  clientSecret: string,
): Promise<ActionResult<{ isFirstVerification: boolean; monthsSynced: number }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    const { syncResult } = await connectPayPalWithCredentials(userData.user.id, clientId.trim(), clientSecret.trim());
    if (!syncResult.success) return { success: false, error: syncResult.error };
    return { success: true, data: { isFirstVerification: syncResult.isFirstVerification, monthsSynced: syncResult.monthsSynced } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Impossible de connecter PayPal." };
  }
}

export async function connectLemonSqueezyAction(
  apiKey: string,
): Promise<ActionResult<{ isFirstVerification: boolean; monthsSynced: number }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    const { syncResult } = await connectLemonSqueezyWithKey(userData.user.id, apiKey.trim());
    if (!syncResult.success) return { success: false, error: syncResult.error };
    return { success: true, data: { isFirstVerification: syncResult.isFirstVerification, monthsSynced: syncResult.monthsSynced } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Impossible de connecter Lemon Squeezy." };
  }
}

type OwnApiSource =
  | { ok: false; error: string }
  | { ok: true; userId: string; provider: ApiConnectorId; source: { id: string; status: string } | null };

async function ownApiSource(provider: string): Promise<OwnApiSource> {
  if (!isApiConnector(provider)) return { ok: false, error: "Source inconnue." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Tu n'es pas connecté." };
  const { data: source } = await supabase
    .from("revenue_sources")
    .select("id, status")
    .eq("user_id", userData.user.id)
    .eq("provider", provider)
    .maybeSingle();
  return { ok: true, userId: userData.user.id, provider, source };
}

export async function connectApiSourceAction(
  provider: string,
  fields: Record<string, string>,
): Promise<ActionResult<{ isFirstVerification: boolean; monthsSynced: number }>> {
  const own = await ownApiSource(provider);
  if (!own.ok) return { success: false, error: own.error };
  try {
    const result = await connectApiSource(own.userId, own.provider, fields ?? {});
    if (!result.success) return { success: false, error: result.error };
    revalidatePath("/app", "layout");
    return { success: true, data: { isFirstVerification: result.isFirstVerification, monthsSynced: result.monthsSynced } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Impossible de connecter cette source." };
  }
}

export async function syncApiSourceAction(
  provider: string,
): Promise<ActionResult<{ isFirstVerification: boolean; monthsSynced: number }>> {
  const own = await ownApiSource(provider);
  if (!own.ok) return { success: false, error: own.error };
  if (own.source?.status !== "connected") return { success: false, error: "Cette source n'est pas connectée." };
  const result = await syncApiSource(own.userId, own.provider, own.source.id);
  if (!result.success) return { success: false, error: result.error };
  revalidatePath("/app", "layout");
  return { success: true, data: { isFirstVerification: result.isFirstVerification, monthsSynced: result.monthsSynced } };
}

export async function disconnectApiSourceAction(provider: string): Promise<ActionResult> {
  const own = await ownApiSource(provider);
  if (!own.ok) return { success: false, error: own.error };
  if (!own.source) return { success: false, error: "Aucune connexion trouvée." };
  await disconnectApiSource(own.userId, own.source.id);
  revalidatePath("/app", "layout");
  return { success: true, data: undefined };
}

export async function listBankInstitutionsAction(country: string): Promise<ActionResult<Aspsp[]>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    return { success: true, data: await listBankInstitutions(country) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function connectBankAction(institutionName: string, institutionCountry: string): Promise<ActionResult<{ link: string }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    const result = await initiateBankConnection(userData.user.id, institutionName, institutionCountry);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Impossible de connecter ce compte bancaire." };
  }
}

export async function syncBankAction(revenueSourceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const result = await syncBankTransactions(userData.user.id, revenueSourceId);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: undefined };
}

export async function listBankTransactionsAction(revenueSourceId: string): Promise<ActionResult<BankTransactionRow[]>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    return { success: true, data: await listBankTransactions(userData.user.id, revenueSourceId) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function setTransactionRevenueTagAction(transactionId: string, isRevenue: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await setTransactionRevenueTag(userData.user.id, transactionId, isRevenue);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function disconnectBankAction(revenueSourceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  await disconnectBankSource(userData.user.id, revenueSourceId);
  return { success: true, data: undefined };
}

const MAX_DECLARED_MONTHS = 12;

/** "YYYY-MM-01" of the current month and the 11 before it. */
function declarablePeriods(): string[] {
  const now = new Date();
  return Array.from({ length: MAX_DECLARED_MONTHS }, (_, i) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 10),
  );
}

/**
 * One or several months declared with one proof (an export can cover a few
 * months). The proof was sent straight to storage by the browser.
 */
export async function submitRevenueDeclarationAction(input: {
  entries: { period: string; amount: string }[];
  label: string;
  proofPath: string;
}): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };
  const userId = userData.user.id;

  const allowed = new Set(declarablePeriods());
  const entries = Array.isArray(input?.entries) ? input.entries : [];
  if (entries.length === 0) return { success: false, error: "Ajoute au moins un mois." };
  if (entries.length > MAX_DECLARED_MONTHS) return { success: false, error: `${MAX_DECLARED_MONTHS} mois au maximum par envoi.` };
  const seen = new Set<string>();
  const rows: { period: string; amountCents: number }[] = [];
  for (const e of entries) {
    const period = String(e?.period ?? "");
    if (!allowed.has(period)) return { success: false, error: "Tu peux déclarer le mois en cours et les 11 précédents." };
    if (seen.has(period)) return { success: false, error: "Un même mois apparaît deux fois." };
    seen.add(period);
    const amount = Number.parseFloat(String(e?.amount ?? "").replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return { success: false, error: "Indique un montant valide pour chaque mois." };
    rows.push({ period, amountCents: Math.round(amount * 100) });
  }
  const label = String(input?.label ?? "").trim().slice(0, 120);

  if (!input?.proofPath) {
    return { success: false, error: "Une preuve (export de paiements, facture, capture du tableau de bord...) est obligatoire." };
  }
  let proofPath: string;
  try {
    proofPath = (await verifyUpload(userId, "revenue-proof", input.proofPath)).path;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Le téléversement de la preuve a échoué." };
  }

  try {
    for (const r of rows) await submitRevenueDeclaration({ userId, period: r.period, label, amountCents: r.amountCents, proofPath });
    await evaluateChallengeProgress(userId);
    revalidatePath("/app/settings");
    return { success: true, data: { count: rows.length } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function updatePrivacyAction(input: {
  revenueVisibility: "exact" | "range" | "private";
  showCountry: boolean;
}): Promise<ActionResult> {
  const parsed = privacySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const { error } = await supabase
    .from("privacy_settings")
    .update({
      revenue_visibility: parsed.data.revenueVisibility,
      show_country: parsed.data.showCountry,
    })
    .eq("user_id", userData.user.id);

  if (error) return { success: false, error: toFriendlyAuthError(error.message) };
  return { success: true, data: undefined };
}

export async function updateMarketingConsentAction(consent: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const { error } = await supabase
    .from("profiles")
    .update({ marketing_consent: consent })
    .eq("id", userData.user.id);
  if (error) return { success: false, error: toFriendlyAuthError(error.message) };
  return { success: true, data: undefined };
}

export async function updateEmailNotificationsAction(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const { error } = await supabase
    .from("profiles")
    .update({ email_notifications_enabled: enabled })
    .eq("id", userData.user.id);
  if (error) return { success: false, error: toFriendlyAuthError(error.message) };
  return { success: true, data: undefined };
}

export async function updateNotificationEmailPrefAction(type: string, enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_email_prefs")
    .eq("id", userData.user.id)
    .maybeSingle();

  const nextPrefs = { ...(profile?.notification_email_prefs ?? {}), [type]: enabled };
  const { error } = await supabase
    .from("profiles")
    .update({ notification_email_prefs: nextPrefs })
    .eq("id", userData.user.id);
  if (error) return { success: false, error: toFriendlyAuthError(error.message) };
  return { success: true, data: undefined };
}

export async function updateAccentThemeAction(theme: AccentTheme): Promise<ActionResult> {
  if (!ACCENT_THEMES.some((t) => t.id === theme)) {
    return { success: false, error: "Thème invalide." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const subscription = await getSubscription(userData.user.id);
  if (!hasProAccess(subscription.tier)) {
    return { success: false, error: "La personnalisation du profil est réservée aux abonnés Pro et Elite." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ accent_theme: theme })
    .eq("id", userData.user.id);

  if (error) return { success: false, error: toFriendlyAuthError(error.message) };
  return { success: true, data: undefined };
}

/**
 * A real fulfillment of the "droit à la portabilité" the privacy policy
 * already promises — everything here comes through the caller's own
 * RLS-scoped client, so it's structurally impossible to return another
 * member's row. Deliberately excludes provider_credentials (Stripe/
 * Shopify secrets) even though it's owner-readable in principle — a data
 * export a member downloads to their own machine is the wrong place for
 * a live API secret to end up.
 */
export async function exportMyDataAction(): Promise<ActionResult<Record<string, unknown>>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };
  const userId = userData.user.id;

  const [
    profile,
    business,
    privacySettings,
    subscription,
    revenueSources,
    revenueSnapshots,
    revenueSourceSnapshots,
    revenueDeclarations,
    bankConnections,
    bankTransactions,
    achievements,
    trophies,
    titles,
    followers,
    following,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("businesses").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("privacy_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("revenue_sources").select("id, provider, status, is_test_mode, connected_at, last_synced_at").eq("user_id", userId),
    supabase.from("revenue_snapshots").select("period, amount_cents, currency, is_verified, transaction_count, customer_count").eq("user_id", userId),
    supabase.from("revenue_source_snapshots").select("revenue_source_id, period, amount_cents, currency, transaction_count, customer_count").eq("user_id", userId),
    supabase.from("revenue_declarations").select("period, label, amount_cents, review_status, created_at").eq("user_id", userId),
    supabase.from("bank_connections").select("institution_name, account_ids, expires_at, created_at").eq("user_id", userId),
    supabase
      .from("bank_transactions")
      .select("booking_date, amount_cents, currency, counterparty, description, is_revenue")
      .eq("user_id", userId),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
    supabase.from("user_trophies").select("trophy_id, earned_at").eq("user_id", userId),
    supabase.from("user_titles").select("title_id, is_active, acquired_at").eq("user_id", userId),
    supabase.from("follows").select("follower_id, created_at").eq("followee_id", userId),
    supabase.from("follows").select("followee_id, created_at").eq("follower_id", userId),
  ]);

  return {
    success: true,
    data: {
      exportedAt: new Date().toISOString(),
      account: { id: userId, email: userData.user.email },
      profile: profile.data,
      business: business.data,
      privacySettings: privacySettings.data,
      subscription: subscription.data,
      revenueSources: revenueSources.data,
      revenueSnapshots: revenueSnapshots.data,
      revenueSourceSnapshots: revenueSourceSnapshots.data,
      revenueDeclarations: revenueDeclarations.data,
      bankConnections: bankConnections.data,
      bankTransactions: bankTransactions.data,
      achievements: achievements.data,
      trophies: trophies.data,
      titles: titles.data,
      followers: followers.data,
      following: following.data,
    },
  };
}

export async function deleteAccountAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await deleteMemberAccount(userData.user.id);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Une erreur est survenue. Réessaie." };
  }

  await supabase.auth.signOut();
  redirect("/");
}

// ---------------------------------------------------------------- trainings

export async function saveTrainingAction(
  input: TrainingInput,
  id?: string,
): Promise<ActionResult<{ id: string; status: TrainingStatus }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  if (!id) {
    const subscription = await getSubscription(userData.user.id);
    if (!hasEliteAccess(subscription.tier)) {
      return {
        success: false,
        error: "Proposer une formation est réservé aux membres Elite. Tes formations déjà en ligne restent modifiables.",
      };
    }
  }

  const result = await saveOwnerTraining(userData.user.id, input, id);
  if (!result.ok) return { success: false, error: result.error };
  revalidatePath("/app/settings");
  revalidatePath("/formations");
  return { success: true, data: { id: result.id, status: result.status } };
}

export async function setTrainingArchivedAction(
  id: string,
  archived: boolean,
): Promise<ActionResult<{ status: TrainingStatus }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const result = await setOwnerTrainingArchived(userData.user.id, id, archived);
  if (!result.ok) return { success: false, error: result.error };
  revalidatePath("/formations");
  return { success: true, data: { status: result.status } };
}

export async function deleteTrainingAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const result = await deleteOwnerTraining(userData.user.id, id);
  if (!result.ok) return { success: false, error: result.error };
  revalidatePath("/formations");
  return { success: true, data: undefined };
}

export async function uploadTrainingCoverAction(path: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const result = await uploadTrainingCover(userData.user.id, path);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: { url: result.url } };
}
