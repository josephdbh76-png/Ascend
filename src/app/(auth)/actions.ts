"use server";

import { createClient } from "@/lib/supabase/server";
import {
  signupAccountSchema,
  signupProfileSchema,
  signupBioSchema,
  loginSchema,
} from "@/lib/validations";
import { toFriendlyAuthError } from "@/lib/errors";
import { getAppUrl } from "@/lib/utils";
import { isUsernameAvailable } from "@/services/profile.service";
import { resolveReferrerId, recordReferral } from "@/services/referral.service";
import { getResend, resendFromAddress } from "@/lib/resend";
import { renderEmailHtml } from "@/lib/emailRender";
import { welcomeEmailContent } from "@/lib/transactionalEmails";
import { isEmailTypeEnabledPlatformWide } from "@/services/notification.service";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createAccountAction(input: {
  email: string;
  password: string;
  username: string;
  /** Explicit, unchecked-by-default opt-in — never assume consent just because someone is signing up. */
  marketingConsent?: boolean;
  /** Honeypot — a real visitor never sees or fills this field (hidden via
   * CSS, not type="hidden" which some bots already skip). Any value here
   * means the submission is automated, so we reject without touching
   * Supabase Auth at all. */
  website?: string;
  /** Referrer's username from ?ref=, if this signup came through a referral link. */
  referredBy?: string | null;
}): Promise<ActionResult<{ needsEmailConfirmation: boolean }>> {
  if (input.website) {
    return { success: false, error: "Une erreur est survenue. Réessaie." };
  }

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(ip, "signup", { maxAttempts: 8, windowMinutes: 60 });
  if (!allowed) {
    return { success: false, error: "Trop de tentatives d'inscription. Réessaie dans quelques minutes." };
  }

  const parsed = signupAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { email, password, username } = parsed.data;

  const available = await isUsernameAvailable(username);
  if (!available) {
    return { success: false, error: "Ce nom d'utilisateur est déjà pris." };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/api/auth/callback`,
    },
  });

  if (signUpError || !signUpData.user) {
    return { success: false, error: toFriendlyAuthError(signUpError?.message) };
  }

  const referrerId = input.referredBy ? await resolveReferrerId(input.referredBy, signUpData.user.id) : null;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: signUpData.user.id,
    username,
    onboarding_step: "business",
    marketing_consent: input.marketingConsent === true,
    referred_by: referrerId,
  });

  if (profileError) {
    return { success: false, error: toFriendlyAuthError(profileError.message) };
  }

  if (referrerId) {
    await recordReferral(referrerId, signUpData.user.id);
  }

  return { success: true, data: { needsEmailConfirmation: !signUpData.session } };
}

export async function saveProfileStepAction(input: {
  firstName: string;
  lastName: string;
  country: string;
  category: string;
  businessName: string;
}): Promise<ActionResult> {
  const parsed = signupProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const { firstName, lastName, country, category, businessName } = parsed.data;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      country,
      onboarding_step: "bio",
    })
    .eq("id", userData.user.id);

  if (profileError) return { success: false, error: toFriendlyAuthError(profileError.message) };

  const { error: businessError } = await supabase.from("businesses").upsert(
    { user_id: userData.user.id, name: businessName, category },
    { onConflict: "user_id" },
  );

  if (businessError) return { success: false, error: toFriendlyAuthError(businessError.message) };

  return { success: true, data: undefined };
}

export async function saveBioStepAction(input: { bio?: string }): Promise<ActionResult> {
  const parsed = signupBioSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const { error } = await supabase
    .from("profiles")
    .update({ bio: parsed.data.bio ?? null, onboarding_step: "revenue" })
    .eq("id", userData.user.id);

  if (error) return { success: false, error: toFriendlyAuthError(error.message) };
  return { success: true, data: undefined };
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("onboarding_step, first_name, email_notifications_enabled")
    .eq("id", userData.user.id)
    .maybeSingle();
  const alreadyDone = existingProfile?.onboarding_step === "done";

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_step: "done" })
    .eq("id", userData.user.id);

  if (error) return { success: false, error: toFriendlyAuthError(error.message) };

  // Only the very first completion — re-running this action (it's callable
  // more than once in the wizard's flow) must never re-send the welcome email.
  if (
    !alreadyDone &&
    userData.user.email &&
    existingProfile?.email_notifications_enabled !== false &&
    (await isEmailTypeEnabledPlatformWide("welcome"))
  ) {
    try {
      const content = welcomeEmailContent(existingProfile?.first_name ?? null);
      await getResend().emails.send({
        from: resendFromAddress(),
        to: userData.user.email,
        subject: content.subject,
        html: renderEmailHtml(content.body, {
          ctaLabel: content.ctaLabel,
          ctaUrl: content.ctaPath ? `${getAppUrl()}${content.ctaPath}` : undefined,
        }),
      });
    } catch (err) {
      console.error("Welcome email failed:", err);
    }
  }

  return { success: true, data: undefined };
}

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  // Two independent limits: by IP (catches a single source hammering many
  // accounts) and by email (catches one targeted account being brute-forced
  // from many different IPs) — either one tripping blocks the attempt.
  const ip = await getClientIp();
  const [byIp, byEmail] = await Promise.all([
    checkRateLimit(ip, "login", { maxAttempts: 15, windowMinutes: 15 }),
    checkRateLimit(`email:${parsed.data.email.toLowerCase()}`, "login", { maxAttempts: 6, windowMinutes: 15 }),
  ]);
  if (!byIp.allowed || !byEmail.allowed) {
    return { success: false, error: "Trop de tentatives. Réessaie dans quelques minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, error: "E-mail ou mot de passe incorrect." };
  }

  return { success: true, data: undefined };
}

export async function requestPasswordResetAction(email: string): Promise<ActionResult> {
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(ip, "password_reset", { maxAttempts: 6, windowMinutes: 15 });
  if (!allowed) {
    return { success: false, error: "Trop de tentatives. Réessaie dans quelques minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/reset-password/confirm`,
  });
  if (error) return { success: false, error: toFriendlyAuthError(error.message) };
  return { success: true, data: undefined };
}

export async function checkUsernameAvailableAction(username: string): Promise<boolean> {
  return isUsernameAvailable(username);
}
