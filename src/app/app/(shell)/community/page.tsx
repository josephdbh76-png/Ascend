import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, Lock, Megaphone, MessageCircleQuestion, Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasEliteAccess } from "@/services/subscription.service";
import { getCommunitySettings, getMyWhatsappMembership } from "@/services/community.service";
import { isCurrentUserAdmin } from "@/services/admin.service";
import { Button } from "@/components/ui/Button";
import { CommunityJoin } from "./CommunityJoin";

export const metadata: Metadata = { title: "Communauté" };

// Mirrors the groups of the WhatsApp community, so members know what they join.
const GROUPS = [
  { icon: Megaphone, title: "Annonces", text: "Nouveautés, sorties de titres, résultats de saison. Seule l'équipe y écrit." },
  {
    icon: MessageCircleQuestion,
    title: "Questions et support",
    text: "Une question sur ASCEND ? L'équipe répond directement. Pour un sujet personnel, écris-lui en privé.",
  },
  { icon: CalendarDays, title: "Événements", text: "Lives, masterclass et rencontres entre membres, avec inscription en un clic." },
  { icon: Handshake, title: "Networking", text: "Présente ton business, trouve un associé, partage tes victoires." },
];

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [subscription, community, isAdmin] = await Promise.all([
    getSubscription(user.id),
    getCommunitySettings(),
    isCurrentUserAdmin(),
  ]);
  if (!community.enabled && !isAdmin) redirect("/app/dashboard");
  const isElite = hasEliteAccess(subscription.tier);
  // Non-Elite members never receive the invite link, not even in the page data.
  const membership = isElite ? await getMyWhatsappMembership(user.id) : null;
  const inviteUrl = isElite ? community.inviteUrl : null;

  return (
    <div className="flex flex-col gap-8">
      {!community.enabled && (
        <p className="rounded-md border border-border-strong bg-card-elevated px-4 py-3 text-xs text-text-secondary">
          Page masquée pour les membres : seuls les admins la voient. Affiche-la dans Admin → Communauté.
        </p>
      )}
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-text-primary">
          Communauté Elite
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
            WhatsApp
          </span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Le groupe WhatsApp des membres Elite : une ligne directe avec l&apos;équipe ASCEND, les événements et l&apos;entraide
          entre fondateurs.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GROUPS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/10">
              <Icon className="h-4 w-4 text-gold" />
            </span>
            <div>
              <p className="text-sm font-semibold text-text-primary">{title}</p>
              <p className="mt-0.5 text-xs text-text-secondary">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      {isElite ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Rejoindre la communauté</h2>
          {subscription.beta && (
            <p className="rounded-md border border-gold/25 bg-gold/5 px-4 py-3 text-xs text-text-secondary">
              Pendant la bêta, la communauté est ouverte à tous les membres, comme le reste d&apos;Elite. Après le lancement,
              elle sera réservée aux membres Elite.
            </p>
          )}
          <CommunityJoin membership={membership} inviteUrl={inviteUrl} />
        </section>
      ) : (
        <section className="flex flex-col items-start gap-3 rounded-lg border border-gold/30 bg-gold/5 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Lock className="h-4 w-4 text-gold" /> Réservé aux membres Elite
          </p>
          <p className="max-w-xl text-sm text-text-secondary">
            Passe Elite pour rejoindre la communauté : support direct avec l&apos;équipe, accès aux événements et au
            networking entre fondateurs.
          </p>
          <Button href="/app/settings#abonnement" size="sm">
            Passer Elite
          </Button>
        </section>
      )}

      <p className="text-xs text-text-muted">
        Ton numéro sert uniquement à valider ton entrée et à te retirer si tu n&apos;es plus Elite. Dans les groupes, il est
        visible des autres membres, comme dans tout groupe WhatsApp. Respect, pas de démarchage non sollicité : l&apos;équipe
        peut retirer quiconque ne suit pas ces règles.
      </p>
    </div>
  );
}
