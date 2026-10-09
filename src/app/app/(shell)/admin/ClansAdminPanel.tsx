"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Banknote, BadgeCheck, Play, Plus, Power, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ClanEmblem } from "@/components/clans/ClanEmblem";
import { MIN_PAYOUT_CENTS, euros, formatPoints } from "@/lib/clans";
import { createPartnerClanAction, payMemberRewardsAction, runWarJobsAction, setClanActiveAction } from "./actions";

export interface AdminClanRow {
  id: string;
  slug: string;
  name: string;
  emblem: string;
  color: string;
  leader: string | null;
  memberCount: number;
  verifiedCount: number;
  trophies: number;
  isPartner: boolean;
  isActive: boolean;
}

export interface AdminWarRow {
  id: string;
  phase: string;
  a: string;
  b: string;
  totalA: number | null;
  totalB: number | null;
  startsAt: string | null;
  endsAt: string | null;
  winner: string | null;
}

export interface AdminPayoutRow {
  userId: string;
  username: string;
  availableCents: number;
  holdingCents: number;
  payoutAccount: "ready" | "pending" | "none";
}

const PHASE: Record<string, string> = {
  proposed: "Déclarée",
  preparing: "Préparation",
  starting: "Démarrage",
  live: "En cours",
  ending: "À clore",
  closed: "Close",
  declined: "Refusée",
  expired: "Expirée",
  canceled: "Annulée",
};

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) : "—");

export function ClansAdminPanel({
  clans,
  wars,
  payouts,
  partners,
}: {
  clans: AdminClanRow[];
  wars: AdminWarRow[];
  payouts: AdminPayoutRow[];
  /** Partner creators linked to an account and without a league yet. */
  partners: { id: string; name: string; username: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [name, setName] = useState("");

  function act<T>(fn: () => Promise<{ success: true; data: T } | { success: false; error: string }>, done: (data: T) => string, after?: () => void) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) return toast.show(result.error, "error");
      toast.show(done(result.data), "success");
      after?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">Toutes les ligues. Ferme celles qui posent problème (nom, comportement).</p>
          <Button
            size="sm"
            className="shrink-0"
            disabled={partners.length === 0}
            title={partners.length === 0 ? "Relie d'abord un créateur à son compte" : undefined}
            onClick={() => {
              setPartnerId(partners[0]?.id ?? "");
              setName("");
              setOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Ligue partenaire
          </Button>
        </div>
        {clans.length === 0 ? (
          <p className="text-xs text-text-muted">Aucune ligue pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {clans.map((c) => (
              <li key={c.id} className="flex flex-col items-start gap-2 rounded-md border border-border-strong bg-card-elevated p-3 sm:flex-row sm:items-center">
                <ClanEmblem emblem={c.emblem} color={c.color} size={28} />
                <div className="min-w-0 flex-1">
                  <Link href={`/ligues/${c.slug}`} className="flex items-center gap-1.5 text-sm font-medium text-text-primary hover:text-gold">
                    {c.name} {c.isPartner && <BadgeCheck className="h-3.5 w-3.5 text-gold" />}
                  </Link>
                  <p className="text-xs text-text-muted">
                    {c.leader ? `@${c.leader}` : "sans chef"} · {c.memberCount} membres · {c.verifiedCount} vérifiés ·{" "}
                    <Trophy className="inline h-3 w-3 text-gold" /> {c.trophies}
                    {!c.isActive && " · fermée"}
                  </p>
                </div>
                <Button variant="secondary" size="sm" disabled={pending} onClick={() => act(() => setClanActiveAction(c.id, !c.isActive), () => (c.isActive ? "Ligue fermée." : "Ligue rouverte."))}>
                  <Power className="h-3.5 w-3.5" /> {c.isActive ? "Fermer" : "Rouvrir"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">
            Les chefs déclarent et acceptent les guerres eux-mêmes. Chaque nuit, un traitement les démarre, synchronise les combattants, enregistre le score du jour et clôt celles qui sont finies.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={pending}
            onClick={() => act(() => runWarJobsAction(), (r) => `${r.started} démarrée(s), ${r.recorded} score(s) du jour, ${r.closed} close(s), ${r.expired} expirée(s).`)}
          >
            <Play className="h-3.5 w-3.5" /> Lancer maintenant
          </Button>
        </div>
        {wars.length === 0 ? (
          <p className="text-xs text-text-muted">Aucune guerre pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {wars.map((w) => (
              <li key={w.id} className="rounded-md border border-border-strong bg-card-elevated p-3 text-sm">
                <p className="font-medium text-text-primary">
                  {w.a} <span className="tabular-nums text-gold">{formatPoints(w.totalA)}</span>
                  <span className="mx-1.5 text-text-muted">contre</span>
                  <span className="tabular-nums text-gold">{formatPoints(w.totalB)}</span> {w.b}
                </p>
                <p className="text-xs text-text-muted">
                  {PHASE[w.phase] ?? w.phase} · {day(w.startsAt)} → {day(w.endsAt)}
                  {w.phase === "closed" && ` · ${w.winner ? `gagnant : ${w.winner}` : "égalité"}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <p className="text-xs text-text-secondary">
          Gains d&apos;invitation à verser le 5 : disponibles après 30 jours, à partir de {euros(MIN_PAYOUT_CENTS)}. « Verser » envoie l&apos;argent sur le compte de
          versement Stripe du membre ; « Marquer versé » si tu l&apos;as payé autrement.
        </p>
        {payouts.length === 0 ? (
          <p className="text-xs text-text-muted">Aucun gain en cours.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payouts.map((p) => {
              const payable = p.availableCents >= MIN_PAYOUT_CENTS;
              return (
                <li key={p.userId} className="flex flex-col items-start gap-2 rounded-md border border-border-strong bg-card-elevated p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-text-primary">@{p.username}</p>
                    <p className="text-xs text-text-muted">
                      Disponible {euros(p.availableCents)} · en validation {euros(p.holdingCents)} · compte de versement{" "}
                      {p.payoutAccount === "ready" ? "actif" : p.payoutAccount === "pending" ? "en vérification" : "non créé"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending || !payable || p.payoutAccount !== "ready"}
                      onClick={() => confirm(`Verser ${euros(p.availableCents)} à @${p.username} via Stripe ?`) && act(() => payMemberRewardsAction(p.userId, false), (c) => `${euros(c)} versés.`)}
                    >
                      <Banknote className="h-3.5 w-3.5" /> Verser
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending || !payable}
                      onClick={() => confirm(`Marquer ${euros(p.availableCents)} comme versés à @${p.username} ?`) && act(() => payMemberRewardsAction(p.userId, true), () => "Marqué comme versé.")}
                    >
                      Marquer versé
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Ligue d'un créateur partenaire">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(
              () => createPartnerClanAction(partnerId, { name, tagline: "", emblem: "crown", color: "gold", access: "open" }),
              () => "Ligue partenaire ouverte.",
              () => setOpen(false),
            );
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Créateur (chef)">
            <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · @{p.username}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nom de la ligue" hint="S'il dirige déjà une ligue, c'est elle qui devient sa ligue partenaire.">
            <Input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="La ligue de Lucas" required autoFocus />
          </Field>
          <p className="text-xs text-text-muted">Il pourra changer l&apos;emblème, les couleurs et l&apos;accès depuis ses réglages.</p>
          <Button type="submit" disabled={pending || !partnerId || name.trim().length < 2} className="self-start">
            Ouvrir la ligue
          </Button>
        </form>
      </Modal>
    </div>
  );
}
