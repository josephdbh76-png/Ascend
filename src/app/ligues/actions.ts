"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { joinCreatorLeague, leaveCreatorLeague } from "@/services/creatorLeague.service";
import type { ActionResult } from "@/app/(auth)/actions";

export async function joinLeagueAction(leagueId: string, slug: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { success: false, error: "Connecte-toi pour rejoindre une ligue." };
  try {
    await joinCreatorLeague(data.user.id, leagueId);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Impossible de rejoindre la ligue." };
  }
  revalidatePath(`/ligues/${slug}`);
  revalidatePath("/app/challenges");
  return { success: true, data: undefined };
}

export async function leaveLeagueAction(slug: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { success: false, error: "Tu n'es pas connecté." };
  try {
    await leaveCreatorLeague(data.user.id);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Impossible de quitter la ligue." };
  }
  revalidatePath(`/ligues/${slug}`);
  revalidatePath("/app/challenges");
  return { success: true, data: undefined };
}
