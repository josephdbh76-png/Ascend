"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn, initials } from "@/lib/utils";
import { sendMessageAction, acceptConversationAction } from "../actions";
import type { ConversationParticipant, MessageRow } from "@/services/message.service";
import type { ConversationStatus } from "@/types/database.types";

export function MessageThread({
  conversationId,
  currentUserId,
  thread,
}: {
  conversationId: string;
  currentUserId: string;
  thread: { otherUser: ConversationParticipant; status: ConversationStatus; isRequester: boolean; messages: MessageRow[] };
}) {
  const [messages, setMessages] = useState(thread.messages);
  const [status, setStatus] = useState(thread.status);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const awaitingReply = status === "pending" && thread.isRequester && messages.some((m) => m.senderId === currentUserId);
  const canReplyToAccept = status === "pending" && !thread.isRequester;
  const firstContact = status === "pending" && thread.isRequester && messages.length === 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    const optimistic: MessageRow = {
      id: `optimistic-${Date.now()}`,
      senderId: currentUserId,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setBody("");
    startTransition(async () => {
      const result = await sendMessageAction(conversationId, trimmed);
      if (!result.success) {
        setMessages((m) => m.filter((msg) => msg.id !== optimistic.id));
        toast.show(result.error, "error");
        return;
      }
      if (canReplyToAccept) setStatus("accepted");
    });
  }

  function accept() {
    startTransition(async () => {
      const result = await acceptConversationAction(conversationId);
      if (!result.success) return toast.show(result.error, "error");
      setStatus("accepted");
      toast.show("Demande acceptée.", "success");
    });
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col lg:h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href="/app/messages" className="rounded-md p-1.5 text-text-secondary hover:text-text-primary lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-elevated text-xs font-semibold text-gold">
          {thread.otherUser.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thread.otherUser.avatarUrl} alt={thread.otherUser.username} className="h-full w-full object-cover" />
          ) : (
            initials(thread.otherUser.firstName, thread.otherUser.lastName)
          )}
        </span>
        <div>
          <Link href={`/profile/${thread.otherUser.username}`} className="text-sm font-medium text-text-primary hover:underline">
            {thread.otherUser.firstName} {thread.otherUser.lastName}
          </Link>
          <p className="text-xs text-text-muted">@{thread.otherUser.username}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
        {firstContact && (
          <div className="mx-auto mb-2 flex max-w-sm flex-col items-center gap-1.5 border border-gold/30 bg-gold/5 px-4 py-3 text-center">
            <Lock className="h-4 w-4 text-gold" />
            <p className="text-xs leading-relaxed text-text-secondary">
              Première prise de contact avec {thread.otherUser.firstName} : tu ne peux envoyer{" "}
              <span className="font-medium text-text-primary">qu&apos;un seul message</span> tant
              qu&apos;iel n&apos;a pas répondu ou accepté ta demande — sauf si vous vous suivez
              mutuellement.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const isMine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-sm px-3.5 py-2 text-sm",
                  isMine ? "bg-gold text-[#0a0a0a]" : "bg-card-elevated text-text-primary",
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {canReplyToAccept && (
        <div className="mb-3 flex items-center justify-between gap-3 border border-gold/30 bg-gold/5 px-4 py-3">
          <p className="text-xs text-text-secondary">
            {thread.otherUser.firstName} t&apos;a envoyé une demande de message.
          </p>
          <Button size="sm" onClick={accept} disabled={pending}>
            Accepter
          </Button>
        </div>
      )}

      {awaitingReply ? (
        <div className="flex items-center gap-2 border border-border-strong bg-card-elevated px-4 py-3 text-xs text-text-muted">
          <Lock className="h-3.5 w-3.5" />
          En attente d&apos;une réponse — tu ne peux envoyer qu&apos;un seul message tant que{" "}
          {thread.otherUser.firstName} n&apos;a pas répondu ou accepté.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {firstContact && (
            <p className="flex items-center gap-1.5 px-1 text-[11px] text-text-muted">
              <Lock className="h-3 w-3" /> 1 seul message autorisé avant réponse ou acceptation.
            </p>
          )}
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Écris un message..."
              className="w-full rounded-sm border border-border-strong bg-card-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40"
            />
            <Button type="submit" size="md" disabled={pending || !body.trim()} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
