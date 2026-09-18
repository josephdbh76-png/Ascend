import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isFollowing } from "@/services/network.service";
import { createNotificationForUser } from "@/services/notification.service";
import type { ConversationStatus } from "@/types/database.types";

export interface ConversationParticipant {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface ConversationSummary {
  id: string;
  otherUser: ConversationParticipant;
  status: ConversationStatus;
  isRequester: boolean;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
}

export interface MessageRow {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function isMutualFollow(userA: string, userB: string): Promise<boolean> {
  const [aFollowsB, bFollowsA] = await Promise.all([isFollowing(userA, userB), isFollowing(userB, userA)]);
  return aFollowsB && bFollowsA;
}

export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
): Promise<{ id: string; status: ConversationStatus }> {
  if (userId === otherUserId) throw new Error("Tu ne peux pas t'envoyer un message à toi-même.");
  const supabase = await createClient();
  const [userA, userB] = pairKey(userId, otherUserId);

  const { data: existing } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("user_a", userA)
    .eq("user_b", userB)
    .maybeSingle();
  if (existing) return existing;

  const mutual = await isMutualFollow(userId, otherUserId);
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      user_a: userA,
      user_b: userB,
      requested_by: userId,
      status: mutual ? "accepted" : "pending",
    })
    .select("id, status")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

async function canSend(
  conversationId: string,
  senderId: string,
): Promise<{ allowed: boolean; reason?: string; shouldAccept: boolean }> {
  const supabase = await createClient();
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("user_a, user_b, requested_by, status")
    .eq("id", conversationId)
    .single();
  if (error || !conversation) return { allowed: false, reason: "Conversation introuvable.", shouldAccept: false };

  if (conversation.status === "accepted") return { allowed: true, shouldAccept: false };

  const otherUserId = conversation.user_a === senderId ? conversation.user_b : conversation.user_a;
  if (await isMutualFollow(senderId, otherUserId)) return { allowed: true, shouldAccept: true };

  // The recipient replying to a pending request counts as accepting it.
  if (conversation.requested_by !== senderId) return { allowed: true, shouldAccept: true };

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("sender_id", senderId);
  if ((count ?? 0) > 0) {
    return {
      allowed: false,
      reason: "Tu as déjà envoyé une demande de message. Attends une réponse ou que la personne l'accepte.",
      shouldAccept: false,
    };
  }
  return { allowed: true, shouldAccept: false };
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<MessageRow> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Le message ne peut pas être vide.");
  if (trimmed.length > 2000) throw new Error("Message trop long.");

  const { allowed, reason, shouldAccept } = await canSend(conversationId, senderId);
  if (!allowed) throw new Error(reason ?? "Envoi impossible.");

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("user_a, user_b, requested_by, status")
    .eq("id", conversationId)
    .single();

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed })
    .select("id, sender_id, body, created_at")
    .single();
  if (error) throw new Error(error.message);

  if (shouldAccept) {
    await supabase.from("conversations").update({ status: "accepted" }).eq("id", conversationId);
  } else {
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  }

  if (conversation) {
    const recipientId = conversation.user_a === senderId ? conversation.user_b : conversation.user_a;
    const { data: sender } = await supabase.from("profiles").select("username, first_name").eq("id", senderId).maybeSingle();
    const isNewRequest = conversation.status === "pending" && conversation.requested_by === senderId;
    await createNotificationForUser({
      userId: recipientId,
      type: "new_message",
      title: isNewRequest ? "Nouvelle demande de message" : "Nouveau message",
      body: `${sender?.first_name ?? sender?.username ?? "Quelqu'un"} : « ${trimmed.slice(0, 80)}${trimmed.length > 80 ? "…" : ""} »`,
      metadata: { conversation_id: conversationId, sender_id: senderId },
    });
  }

  return { id: message.id, senderId: message.sender_id, body: message.body, createdAt: message.created_at };
}

export async function acceptConversation(conversationId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("user_a, user_b, requested_by")
    .eq("id", conversationId)
    .single();
  if (error || !conversation) throw new Error("Conversation introuvable.");
  if (conversation.user_a !== userId && conversation.user_b !== userId) {
    throw new Error("Tu ne fais pas partie de cette conversation.");
  }
  if (conversation.requested_by === userId) throw new Error("Tu ne peux pas accepter ta propre demande.");

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ status: "accepted" })
    .eq("id", conversationId);
  if (updateError) throw new Error(updateError.message);
}

async function fetchParticipants(userIds: string[]): Promise<Map<string, ConversationParticipant>> {
  if (userIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, first_name, last_name, avatar_url")
    .in("id", userIds);
  return new Map(
    (data ?? []).map((p) => [
      p.id,
      { id: p.id, username: p.username, firstName: p.first_name, lastName: p.last_name, avatarUrl: p.avatar_url },
    ]),
  );
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, requested_by, status, updated_at")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!conversations || conversations.length === 0) return [];

  const otherIds = conversations.map((c) => (c.user_a === userId ? c.user_b : c.user_a));
  const participants = await fetchParticipants(otherIds);

  const ids = conversations.map((c) => c.id);
  const { data: allMessages } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, body, created_at, read_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });

  const messagesByConversation = new Map<string, typeof allMessages>();
  for (const m of allMessages ?? []) {
    const list = messagesByConversation.get(m.conversation_id) ?? [];
    list.push(m);
    messagesByConversation.set(m.conversation_id, list);
  }

  return conversations.map((c) => {
    const otherUserId = c.user_a === userId ? c.user_b : c.user_a;
    const msgs = messagesByConversation.get(c.id) ?? [];
    const last = msgs.at(-1);
    const unreadCount = msgs.filter((m) => m.sender_id !== userId && !m.read_at).length;
    return {
      id: c.id,
      otherUser: participants.get(otherUserId) ?? {
        id: otherUserId,
        username: "inconnu",
        firstName: null,
        lastName: null,
        avatarUrl: null,
      },
      status: c.status,
      isRequester: c.requested_by === userId,
      lastMessage: last ? { body: last.body, senderId: last.sender_id, createdAt: last.created_at } : null,
      unreadCount,
    };
  });
}

export async function getConversationThread(
  conversationId: string,
  userId: string,
): Promise<{ otherUser: ConversationParticipant; status: ConversationStatus; isRequester: boolean; messages: MessageRow[] } | null> {
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("user_a, user_b, requested_by, status")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;
  if (conversation.user_a !== userId && conversation.user_b !== userId) return null;

  const otherUserId = conversation.user_a === userId ? conversation.user_b : conversation.user_a;
  const participants = await fetchParticipants([otherUserId]);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const unreadIds = (messages ?? []).filter((m) => m.sender_id !== userId && !m.read_at).map((m) => m.id);
  if (unreadIds.length > 0) {
    await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);

    // Opening this thread just read every unread message in it — the
    // matching "new_message" bell notification(s) for this conversation
    // are now stale too. Scoped to this conversation only (via the
    // metadata it was created with), never all of the user's notifications.
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("type", "new_message")
      .is("read_at", null)
      .contains("metadata", { conversation_id: conversationId });
  }

  return {
    otherUser: participants.get(otherUserId) ?? {
      id: otherUserId,
      username: "inconnu",
      firstName: null,
      lastName: null,
      avatarUrl: null,
    },
    status: conversation.status,
    isRequester: conversation.requested_by === userId,
    messages: (messages ?? []).map((m) => ({ id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at })),
  };
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  const ids = (conversations ?? []).map((c) => c.id);
  if (ids.length === 0) return 0;

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", ids)
    .is("read_at", null)
    .neq("sender_id", userId);
  return count ?? 0;
}
