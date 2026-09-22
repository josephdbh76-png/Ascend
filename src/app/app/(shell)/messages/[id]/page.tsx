import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasProAccess, hasEliteAccess } from "@/services/subscription.service";
import { getConversationThread, getSentMessageCountThisMonth, PRO_MONTHLY_MESSAGE_LIMIT } from "@/services/message.service";
import { MessageThread } from "./MessageThread";

export const metadata: Metadata = { title: "Messages" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subscription = await getSubscription(user.id);
  if (!hasProAccess(subscription.tier)) redirect("/app/messages");
  const isElite = hasEliteAccess(subscription.tier);

  const thread = await getConversationThread(id, user.id);
  if (!thread) notFound();

  const messagesRemaining = isElite ? null : PRO_MONTHLY_MESSAGE_LIMIT - (await getSentMessageCountThisMonth(user.id));

  return (
    <MessageThread conversationId={id} currentUserId={user.id} thread={thread} messagesRemaining={messagesRemaining} />
  );
}
