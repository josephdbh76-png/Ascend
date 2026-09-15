"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasEliteAccess } from "@/services/subscription.service";
import { getOrCreateConversation, sendMessage, acceptConversation } from "@/services/message.service";
import type { ActionResult } from "@/app/(auth)/actions";

async function requireElite(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu n'es pas connecté." };

  const subscription = await getSubscription(user.id);
  if (!hasEliteAccess(subscription.tier)) return { error: "La messagerie est réservée aux membres Elite." };

  return { userId: user.id };
}

export async function startConversationAction(targetUserId: string): Promise<ActionResult<{ conversationId: string }>> {
  const auth = await requireElite();
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    const conversation = await getOrCreateConversation(auth.userId, targetUserId);
    return { success: true, data: { conversationId: conversation.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function sendMessageAction(conversationId: string, body: string): Promise<ActionResult> {
  const auth = await requireElite();
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await sendMessage(conversationId, auth.userId, body);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath(`/app/messages/${conversationId}`);
  revalidatePath("/app/messages");
  return { success: true, data: undefined };
}

export async function acceptConversationAction(conversationId: string): Promise<ActionResult> {
  const auth = await requireElite();
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await acceptConversation(conversationId, auth.userId);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath(`/app/messages/${conversationId}`);
  revalidatePath("/app/messages");
  return { success: true, data: undefined };
}
