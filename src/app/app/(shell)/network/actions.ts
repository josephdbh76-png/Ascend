"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toggleFollow } from "@/services/network.service";
import type { ActionResult } from "@/app/(auth)/actions";

export async function toggleFollowAction(targetUserId: string): Promise<ActionResult<{ following: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    const result = await toggleFollow(user.id, targetUserId);
    revalidatePath("/app/network");
    revalidatePath("/profile/[username]", "page");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}
