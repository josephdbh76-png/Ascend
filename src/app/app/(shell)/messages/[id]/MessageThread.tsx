"use client";

import { useState, useTransition, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn, initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { sendMessageAction, acceptConversationAction, markConversationReadAction } from "../actions";
import type { ConversationParticipant, MessageRow } from "@/services/message.service";
import type { ConversationStatus } from "@/types/database.types";

type MessageDbRow = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

const TYPING_SEND_EVERY_MS = 2500;
const TYPING_SHOWN_FOR_MS = 4000;

function seenLabel(readAt: string) {
  const d = new Date(readAt);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return today ? `Vu à ${time}` : `Vu le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à ${time}`;
}

function fromDb(row: MessageDbRow): MessageRow {
  return { id: row.id, senderId: row.sender_id, body: row.body, createdAt: row.created_at, readAt: row.read_at };
}

export function MessageThread({
  conversationId,
  currentUserId,
  thread,
  messagesRemaining,
}: {
  conversationId: string;
  currentUserId: string;
  thread: { otherUser: ConversationParticipant; status: ConversationStatus; isRequester: boolean; messages: MessageRow[] };
  /** null for Elite (unlimited); remaining sends this month for Pro. */
  messagesRemaining: number | null;
}) {
  const [messages, setMessages] = useState(thread.messages);
  const [status, setStatus] = useState(thread.status);
  const [body, setBody] = useState("");
  const [remaining, setRemaining] = useState(messagesRemaining);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const markPending = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, otherTyping]);

  // Seen as soon as it's on screen; when the tab is in the background, once it comes back.
  const markRead = useCallback(() => {
    if (document.visibilityState !== "visible") {
      markPending.current = true;
      return;
    }
    markPending.current = false;
    void markConversationReadAction(conversationId);
  }, [conversationId]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && markPending.current) markRead();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  // Live: new messages, read receipts, accepted request and "en train d'écrire".
  useEffect(() => {
    let cancelled = false;
    const channel = supabase.channel(`conversation:${conversationId}`, { config: { broadcast: { self: false } } });
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const row = fromDb(payload.new as MessageDbRow);
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          if (row.senderId === currentUserId) {
            // Our own message coming back: it replaces its optimistic copy.
            const i = prev.findIndex((m) => m.id.startsWith("optimistic-") && m.body === row.body);
            if (i >= 0) return [...prev.slice(0, i), row, ...prev.slice(i + 1)];
          }
          return [...prev, row];
        });
        if (row.senderId !== currentUserId) {
          setOtherTyping(false);
          markRead();
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const row = payload.new as MessageDbRow;
        setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, readAt: row.read_at } : m)));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${conversationId}` }, (payload) => {
        const next = (payload.new as { status?: ConversationStatus }).status;
        if (next) setStatus(next);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId === currentUserId) return;
        if (typingTimer.current) clearTimeout(typingTimer.current);
        if (payload?.typing === false) return setOtherTyping(false);
        setOtherTyping(true);
        typingTimer.current = setTimeout(() => setOtherTyping(false), TYPING_SHOWN_FOR_MS);
      });

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      channel.subscribe();
      channelRef.current = channel;
    });
    return () => {
      cancelled = true;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, currentUserId, markRead]);

  function sendTyping(typing: boolean) {
    const channel = channelRef.current;
    if (!channel) return;
    if (typing) {
      if (Date.now() - lastTypingSent.current < TYPING_SEND_EVERY_MS) return;
      lastTypingSent.current = Date.now();
    } else {
      lastTypingSent.current = 0;
    }
    void channel.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId, typing } });
  }

  const lastMineIndex = messages.map((m) => m.senderId).lastIndexOf(currentUserId);

  // Loading this page already marked this conversation's messages (and its
  // matching bell notification) read server-side — refresh so the sidebar's
  // "Messages" badge and the notification bell drop immediately instead of
  // waiting for the next navigation or background poll.
  useEffect(() => {
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      readAt: null,
    };
    setMessages((m) => [...m, optimistic]);
    setBody("");
    sendTyping(false);
    startTransition(async () => {
      const result = await sendMessageAction(conversationId, trimmed);
      if (!result.success) {
        setMessages((m) => m.filter((msg) => msg.id !== optimistic.id));
        toast.show(result.error, "error");
        return;
      }
      setRemaining((r) => (r == null ? r : Math.max(0, r - 1)));
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
          <div className="mx-auto mb-2 flex max-w-sm flex-col items-center gap-1.5 rounded-md border border-gold/30 bg-gold/5 px-4 py-3 text-center">
            <Lock className="h-4 w-4 text-gold" />
            <p className="text-xs text-text-secondary">
              Première prise de contact avec {thread.otherUser.firstName} : tu ne peux envoyer{" "}
              <span className="font-medium text-text-primary">qu&apos;un seul message</span> tant
              qu&apos;iel n&apos;a pas répondu ou accepté ta demande, sauf si vous vous suivez
              mutuellement.
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const isMine = m.senderId === currentUserId;
          const time = new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
              <div
                title={time}
                className={cn(
                  "max-w-[75%] whitespace-pre-wrap break-words rounded-lg px-3.5 py-2 text-sm",
                  isMine ? "bg-gold text-[#0a0a0a]" : "bg-card-elevated text-text-primary",
                  m.id.startsWith("optimistic-") && "opacity-70",
                )}
              >
                {m.body}
              </div>
              {i === lastMineIndex && (
                <span className="mt-1 px-1 text-[11px] text-text-muted" aria-live="polite">
                  {m.id.startsWith("optimistic-") ? "Envoi..." : m.readAt ? seenLabel(m.readAt) : "Envoyé"}
                </span>
              )}
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex items-center gap-2" aria-live="polite">
            <span className="flex items-center gap-1 rounded-lg bg-card-elevated px-3.5 py-3" aria-hidden>
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted motion-reduce:animate-none"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
            <span className="text-xs text-text-muted">{thread.otherUser.firstName ?? "Ton contact"} est en train d&apos;écrire...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {canReplyToAccept && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-gold/30 bg-gold/5 px-4 py-3">
          <p className="text-xs text-text-secondary">
            {thread.otherUser.firstName} t&apos;a envoyé une demande de message.
          </p>
          <Button size="sm" onClick={accept} disabled={pending}>
            Accepter
          </Button>
        </div>
      )}

      {awaitingReply ? (
        <div className="flex items-center gap-2 rounded-md border border-border-strong bg-card-elevated px-4 py-3 text-xs text-text-muted">
          <Lock className="h-3.5 w-3.5" />
          En attente d&apos;une réponse : tu ne peux envoyer qu&apos;un seul message tant que{" "}
          {thread.otherUser.firstName} n&apos;a pas répondu ou accepté.
        </div>
      ) : remaining != null && remaining <= 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-md border border-gold/30 bg-gold/5 px-4 py-3 text-center">
          <Lock className="h-4 w-4 text-gold" />
          <p className="text-xs text-text-secondary">
            Tu as atteint ta limite de messages ce mois-ci.{" "}
            <a href="/api/stripe/checkout?tier=elite" className="text-gold hover:underline">
              Passe Elite
            </a>{" "}
            pour un accès illimité.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {firstContact && (
            <p className="flex items-center gap-1.5 px-1 text-[11px] text-text-muted">
              <Lock className="h-3 w-3" /> 1 seul message autorisé avant réponse ou acceptation.
            </p>
          )}
          {remaining != null && (
            <p className="px-1 text-[11px] text-text-muted">
              {remaining} message{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""} ce mois-ci (formule Pro).
            </p>
          )}
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                sendTyping(e.target.value.trim().length > 0);
              }}
              onBlur={() => sendTyping(false)}
              placeholder="Écris un message..."
              className="w-full rounded-md border border-border-strong bg-card-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40"
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
