import type { Metadata } from "next";
import Link from "next/link";
import { Lock, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasProAccess } from "@/services/subscription.service";
import { listConversations } from "@/services/message.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const subscription = await getSubscription(user.id);
  const isPro = hasProAccess(subscription.tier);

  if (!isPro) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Messages</h1>
          <p className="mt-1 text-sm text-text-secondary">Discute directement avec les fondateurs du réseau.</p>
        </div>
        <EmptyState
          icon={Lock}
          title="Réservé aux membres Pro et Elite."
          description="Envoie et reçois des messages depuis n'importe quel profil — Pro donne 10 messages par mois, Elite un accès illimité."
          action={
            <Button href="/api/stripe/checkout?tier=pro" size="sm">
              Passer Pro
            </Button>
          }
        />
      </div>
    );
  }

  const conversations = await listConversations(user.id);
  const requests = conversations.filter((c) => c.status === "pending" && !c.isRequester);
  const active = conversations.filter((c) => c.status !== "pending" || c.isRequester);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Messages</h1>
        <p className="mt-1 text-sm text-text-secondary">Discute directement avec les fondateurs du réseau.</p>
      </div>

      {requests.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Demandes ({requests.length})
          </h2>
          <ConversationList conversations={requests} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {requests.length > 0 && (
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Messages</h2>
        )}
        {active.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Pas encore de message."
            description="Envoie un message depuis le profil d'un fondateur ou depuis le Réseau."
          />
        ) : (
          <ConversationList conversations={active} />
        )}
      </div>
    </div>
  );
}

function ConversationList({ conversations }: { conversations: Awaited<ReturnType<typeof listConversations>> }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border">
      {conversations.map((c) => (
        <Link
          key={c.id}
          href={`/app/messages/${c.id}`}
          className="flex items-center gap-3 border-b border-border bg-card px-4 py-3.5 transition-colors last:border-0 hover:bg-card-elevated"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-elevated text-sm font-semibold text-gold">
            {c.otherUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.otherUser.avatarUrl} alt={c.otherUser.username} className="h-full w-full object-cover" />
            ) : (
              initials(c.otherUser.firstName, c.otherUser.lastName)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-text-primary">
                {c.otherUser.firstName} {c.otherUser.lastName}
              </span>
              {c.status === "pending" && !c.isRequester && <Badge variant="gold">Demande</Badge>}
            </div>
            <p className="truncate text-xs text-text-muted">{c.lastMessage?.body ?? "Aucun message"}</p>
          </div>
          {c.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-semibold text-[#0a0a0a]">
              {c.unreadCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
