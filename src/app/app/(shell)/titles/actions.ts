"use server";

import { createClient } from "@/lib/supabase/server";
import { setActiveTitle } from "@/services/title.service";
import { toFriendlyAuthError } from "@/lib/errors";
import type { ActionResult } from "@/app/(auth)/actions";

export async function setActiveTitleAction(titleId: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await setActiveTitle(userData.user.id, titleId);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: toFriendlyAuthError(err instanceof Error ? err.message : undefined) };
  }
}
