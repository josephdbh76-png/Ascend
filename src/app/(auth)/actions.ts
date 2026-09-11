"use server";

import { createClient } from "@/lib/supabase/server";
import {
  signupAccountSchema,
  signupProfileSchema,
  signupBioSchema,
  loginSchema,
} from "@/lib/validations";
import { isUsernameAvailable } from "@/services/profile.service";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createAccountAction(input: {
  email: string;
  password: string;
  username: string;
}): Promise<ActionResult<{ needsEmailConfirmation: boolean }>> {
  const parsed = signupAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, password, username } = parsed.data;

  const available = await isUsernameAvailable(username);
  if (!available) {
    return { success: false, error: "That username is already taken." };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (signUpError || !signUpData.user) {
    return { success: false, error: signUpError?.message ?? "Could not create your account." };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: signUpData.user.id,
    username,
    onboarding_step: "business",
  });

  if (profileError) {
    return { success: false, error: profileError.message };
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
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Not authenticated." };

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

  if (profileError) return { success: false, error: profileError.message };

  const { error: businessError } = await supabase.from("businesses").upsert(
    { user_id: userData.user.id, name: businessName, category },
    { onConflict: "user_id" },
  );

  if (businessError) return { success: false, error: businessError.message };

  return { success: true, data: undefined };
}

export async function saveBioStepAction(input: { bio?: string }): Promise<ActionResult> {
  const parsed = signupBioSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({ bio: parsed.data.bio ?? null, onboarding_step: "revenue" })
    .eq("id", userData.user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_step: "done" })
    .eq("id", userData.user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, error: "Incorrect email or password." };
  }

  return { success: true, data: undefined };
}

export async function requestPasswordResetAction(email: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/confirm`,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function checkUsernameAvailableAction(username: string): Promise<boolean> {
  return isUsernameAvailable(username);
}
