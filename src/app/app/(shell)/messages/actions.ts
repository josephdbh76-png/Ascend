"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasProAccess, hasEliteAccess } from "@/services/subscription.service";
import {
  getOrCreateConversation,
  sendMessage,
  acceptConversation,
  getSentMessageCountThisMonth,
  PRO_MONTHLY_MESSAGE_LIMIT,
} from "@/services/message.service";
import type { ActionResult } from "@/app/(auth)/actions";

async function requireMessagingAccess(): Promise<{ userId: string; isElite: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu n'es pas connecté." };

  const subscription = await getSubscription(user.id);
  if (!hasProAccess(subscription.tier)) {
    return { error: "La messagerie est réservée aux membres Pro et Elite." };
  }

  return { userId: user.id, isElite: hasEliteAccess(subscription.tier) };
}

export async function startConversationAction(targetUserId: string): Promise<ActionResult<{ conversationId: string }>> {
  const auth = await requireMessagingAccess();
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    const conversation = await getOrCreateConversation(auth.userId, targetUserId);
    return { success: true, data: { conversationId: conversation.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function sendMessageAction(conversationId: string, body: string): Promise<ActionResult> {
  const auth = await requireMessagingAccess();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!auth.isElite) {
    const sentThisMonth = await getSentMessageCountThisMonth(auth.userId);
    if (sentThisMonth >= PRO_MONTHLY_MESSAGE_LIMIT) {
      return {
        success: false,
        error: `Tu as atteint ta limite de ${PRO_MONTHLY_MESSAGE_LIMIT} messages ce mois-ci. Passe Elite pour un accès illimité.`,
      };
    }
  }

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
  const auth = await requireMessagingAccess();
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
