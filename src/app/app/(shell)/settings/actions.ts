"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileUpdateSchema, privacySettingsSchema } from "@/lib/validations";
import { toFriendlyAuthError } from "@/lib/errors";
import { getSubscription, hasProAccess } from "@/services/subscription.service";
import { verifyAndSaveSiret } from "@/services/siret.service";
import { connectShopifyWithCredentials } from "@/services/shopify.service";
import { submitRevenueDeclaration, calculateMonthlyGrowth, getCurrentRevenue } from "@/services/revenue.service";
import { evaluateChallengeProgress } from "@/services/challenge.service";
import { ACCENT_THEMES } from "@/lib/constants";
import type { ActionResult } from "@/app/(auth)/actions";
import type { AccentTheme } from "@/types/database.types";

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
  return { success: true, data: undefined };
}

export async function updateBusinessAction(input: {
  name: string;
  category: string;
  website?: string;
  skills?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const { error } = await supabase.from("businesses").upsert(
    {
      user_id: userData.user.id,
      name: input.name,
      category: input.category,
      website: input.website || null,
    },
    { onConflict: "user_id" },
  );

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

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function submitRevenueDeclarationAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };
  const userId = userData.user.id;

  const amountRaw = String(formData.get("amount") ?? "").replace(",", ".");
  const amount = Number.parseFloat(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Indique un montant valide." };
  }
  const amountCents = Math.round(amount * 100);
  const label = String(formData.get("label") ?? "").trim().slice(0, 120);

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const proof = formData.get("proof");
  if (!(proof instanceof File) || proof.size === 0) {
    return { success: false, error: "Une preuve (facture, export comptable, capture bancaire...) est obligatoire." };
  }
  if (proof.size > MAX_PROOF_BYTES) {
    return { success: false, error: "Le fichier ne doit pas dépasser 5 Mo." };
  }
  if (!ALLOWED_PROOF_TYPES.includes(proof.type)) {
    return { success: false, error: "Formats acceptés : PDF, PNG, JPEG, WebP." };
  }
  const ext = proof.name.split(".").pop() || "bin";
  const path = `${userId}/${period}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("revenue-proofs").upload(path, proof, {
    contentType: proof.type,
    upsert: true,
  });
  if (uploadError) return { success: false, error: "Le téléversement de la preuve a échoué." };
  const proofPath = path;

  try {
    await submitRevenueDeclaration({ userId, period, label, amountCents, proofPath });

    const { current, previous } = await getCurrentRevenue(userId);
    if (current) {
      const growth = calculateMonthlyGrowth(current.amountCents, previous?.amountCents ?? null);
      await evaluateChallengeProgress(userId, current.amountCents, growth);
    }

    return { success: true, data: undefined };
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

export async function deleteAccountAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userData.user.id);
  if (error) return { success: false, error: toFriendlyAuthError(error.message) };

  await supabase.auth.signOut();
  redirect("/");
}
