"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileUpdateSchema, privacySettingsSchema } from "@/lib/validations";
import type { ActionResult } from "@/app/(auth)/actions";

export async function updateProfileAction(input: {
  firstName: string;
  lastName: string;
  bio?: string;
  country: string;
}): Promise<ActionResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      bio: parsed.data.bio ?? null,
      country: parsed.data.country,
    })
    .eq("id", userData.user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function updateBusinessAction(input: {
  name: string;
  category: string;
  website?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase.from("businesses").upsert(
    {
      user_id: userData.user.id,
      name: input.name,
      category: input.category,
      website: input.website || null,
    },
    { onConflict: "user_id" },
  );

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function updatePrivacyAction(input: {
  revenueVisibility: "exact" | "range" | "private";
  showCountry: boolean;
}): Promise<ActionResult> {
  const parsed = privacySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("privacy_settings")
    .update({
      revenue_visibility: parsed.data.revenueVisibility,
      show_country: parsed.data.showCountry,
    })
    .eq("user_id", userData.user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function deleteAccountAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Not authenticated." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userData.user.id);
  if (error) return { success: false, error: error.message };

  await supabase.auth.signOut();
  redirect("/");
}
