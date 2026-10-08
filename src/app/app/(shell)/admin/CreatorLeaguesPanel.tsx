"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Power, Swords, Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { leagueSlug } from "@/lib/creatorLeagues";
import { closeLeagueWarAction, createCreatorLeagueAction, createLeagueWarAction, setCreatorLeagueActiveAction } from "./actions";
import type { CreatorLeague, LeagueWar } from "@/services/creatorLeague.service";

const STATUS_LABEL: Record<LeagueWar["status"], string> = {
  upcoming: "À venir",
  live: "En cours",
  ended: "Terminée, à clore",
  closed: "Close",
};

const points = (n: number | null) => (n == null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

const day = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(new Date(iso));

/** "YYYY-MM-DD" of the 1st and last day of next month. */
function nextMonthRange(): [string, string] {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0));
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
}

export function CreatorLeaguesPanel({
  leagues,
  wars,
  creators,
}: {
  leagues: CreatorLeague[];
  wars: LeagueWar[];
  /** Creators linked to a member account, who can captain a league. */
  creators: { id: string; name: string; username: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [warOpen, setWarOpen] = useState(false);
  const available = creators.filter((c) => !leagues.some((l) => l.influencerId === c.id));
  const [creatorId, setCreatorId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [tagline, setTagline] = useState("");
  const [range] = useState(nextMonthRange);
  const [leagueA, setLeagueA] = useState("");
  const [leagueB, setLeagueB] = useState("");
  const [startDay, setStartDay] = useState(range[0]);
  const [endDay, setEndDay] = useState(range[1]);

  function run<T>(action: () => Promise<{ success: true; data: T } | { success: false; error: string }>, done: (data: T) => string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) return toast.show(result.error, "error");
      toast.show(done(result.data), "success");
      setLeagueOpen(false);
      setWarOpen(false);
      router.refresh();
    });
  }

  const active = leagues.filter((l) => l.isActive);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">
            Une ligue par créateur relié à son compte. Ses abonnés y entrent en s&apos;inscrivant avec son lien.
          </p>
          <Button
            size="sm"
            className="shrink-0"
            disabled={available.length === 0}
            title={available.length === 0 ? "Relie d'abord un créateur à son compte" : undefined}
            onClick={() => {
              setCreatorId(available[0]?.id ?? "");
              setLeagueOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Nouvelle ligue
          </Button>
        </div>
        {leagues.length === 0 ? (
          <p className="text-xs text-text-muted">Aucune ligue pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {leagues.map((l) => (
              <li key={l.id} className="flex flex-col items-start gap-2 rounded-md border border-border-strong bg-card-elevated p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/ligues/${l.slug}`} className="text-sm font-medium text-text-primary hover:text-gold">
                    {l.name}
                  </Link>
                  <p className="text-xs text-text-muted">
                    /ligues/{l.slug} · {l.captain ? `@${l.captain.username}` : "sans capitaine"} · {l.memberCount} membre
                    {l.memberCount > 1 ? "s" : ""}
                    {!l.isActive && " · fermée"}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => setCreatorLeagueActiveAction(l.id, !l.isActive), () => (l.isActive ? "Ligue fermée." : "Ligue rouverte."))}
                >
                  <Power className="h-3.5 w-3.5" /> {l.isActive ? "Fermer" : "Rouvrir"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">
            Une guerre par mois entre deux ligues. À la fin, clique sur « Clore » : les membres vérifiés de la ligue gagnante
            reçoivent le titre « Vainqueur · Guerre de ligues ».
          </p>
          <Button
            size="sm"
            className="shrink-0"
            disabled={active.length < 2}
            onClick={() => {
              setLeagueA(active[0]?.id ?? "");
              setLeagueB(active[1]?.id ?? "");
              setWarOpen(true);
            }}
          >
            <Swords className="h-3.5 w-3.5" /> Nouvelle guerre
          </Button>
        </div>
        {wars.length === 0 ? (
          <p className="text-xs text-text-muted">Aucune guerre pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {wars.map((w) => (
              <li key={w.id} className="flex flex-col items-start gap-2 rounded-md border border-border-strong bg-card-elevated p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-text-primary">
                    {w.a.league.name} <span className="tabular-nums text-gold">{points(w.a.total)}</span>
                    <span className="mx-1.5 text-text-muted">contre</span>
                    <span className="tabular-nums text-gold">{points(w.b.total)}</span> {w.b.league.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {day(w.startsAt)} → {day(w.endsAt)} · {STATUS_LABEL[w.status]}
                    {w.status === "closed" && ` · ${w.winner ? `gagnant : ${w.winner === "a" ? w.a.league.name : w.b.league.name}` : "pas de vainqueur"}`}
                  </p>
                </div>
                {w.status === "ended" && (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => closeLeagueWarAction(w.id),
                        (r) => (r.winner ? `${r.winner} gagne · ${r.titles} titre${r.titles > 1 ? "s" : ""} attribué${r.titles > 1 ? "s" : ""}.` : "Guerre close, sans vainqueur."),
                      )
                    }
                  >
                    <Flag className="h-3.5 w-3.5" /> Clore
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={leagueOpen} onClose={() => setLeagueOpen(false)} title="Nouvelle ligue de créateur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createCreatorLeagueAction({ influencerId: creatorId, name, slug, tagline }), () => "Ligue créée.");
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Créateur (capitaine)">
            <Select value={creatorId} onChange={(e) => setCreatorId(e.target.value)}>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · @{c.username}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nom de la ligue">
            <Input
              value={name}
              maxLength={40}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(leagueSlug(e.target.value));
              }}
              placeholder="La ligue de Lucas"
              required
              autoFocus
            />
          </Field>
          <Field label="Adresse" hint={`ascend…/ligues/${slug || "…"}`}>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value.toLowerCase());
              }}
              className="font-mono"
              required
            />
          </Field>
          <Field label="Accroche (facultatif)" hint="140 caractères au plus.">
            <Input value={tagline} maxLength={140} onChange={(e) => setTagline(e.target.value)} placeholder="Les e-commerçants TikTok Shop qui montent." />
          </Field>
          <Button type="submit" disabled={pending || !creatorId || !name.trim() || !slug} className="self-start">
            Créer la ligue
          </Button>
        </form>
      </Modal>

      <Modal open={warOpen} onClose={() => setWarOpen(false)} title="Nouvelle guerre de ligues">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createLeagueWarAction(leagueA, leagueB, startDay, endDay), () => "Guerre programmée.");
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ligue A">
              <Select value={leagueA} onChange={(e) => setLeagueA(e.target.value)}>
                {active.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ligue B">
              <Select value={leagueB} onChange={(e) => setLeagueB(e.target.value)}>
                {active.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Début">
              <Input type="date" value={startDay} onChange={(e) => setStartDay(e.target.value)} required />
            </Field>
            <Field label="Fin (incluse)">
              <Input type="date" value={endDay} onChange={(e) => setEndDay(e.target.value)} required />
            </Field>
          </div>
          <p className="text-xs text-text-muted">
            Seuls les membres déjà dans leur ligue au début comptent. Une ligue doit avoir 5 membres vérifiés pour pouvoir gagner.
          </p>
          <Button type="submit" disabled={pending || !leagueA || !leagueB || leagueA === leagueB} className="self-start">
            Programmer la guerre
          </Button>
        </form>
      </Modal>
    </div>
  );
}
