"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasEliteAccess } from "@/services/subscription.service";
import { leaveWhatsappCommunity, saveMyWhatsappNumber } from "@/services/community.service";
import type { ActionResult } from "@/app/(auth)/actions";

export async function saveWhatsappNumberAction(phone: string, consent: boolean): Promise<ActionResult<{ phone: string }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };
  if (!consent) return { success: false, error: "Coche la case pour accepter l'utilisation de ton numéro." };

  const subscription = await getSubscription(userData.user.id);
  if (!hasEliteAccess(subscription.tier)) {
    return { success: false, error: "La communauté WhatsApp est réservée aux membres Elite." };
  }

  try {
    const saved = await saveMyWhatsappNumber(userData.user.id, phone);
    revalidatePath("/app/community");
    return { success: true, data: { phone: saved } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Enregistrement impossible." };
  }
}

export async function leaveWhatsappCommunityAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await leaveWhatsappCommunity(userData.user.id);
    revalidatePath("/app/community");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Action impossible." };
  }
}
