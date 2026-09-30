"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRange, Crown, Gem, Package, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { CONDITIONS, conditionDef, describeCondition, fromStoredTarget, toStoredTarget, type ConditionType } from "@/lib/conditions";
import type { ActionResult } from "@/app/(auth)/actions";
import type { Season, SeasonReward, AdminChallengeRow, AdminStandingRow, PhysicalRewardRow } from "@/services/season.service";
import type { SeasonRewardKind, PhysicalRewardStatus } from "@/types/database.types";
import {
  saveSeasonAction,
  activateSeasonAction,
  saveChallengeAction,
  deleteChallengeAction,
  addSeasonRewardAction,
  deleteSeasonRewardAction,
  closeSeasonAction,
  setPhysicalRewardStatusAction,
} from "../actions";
import { AdminSection } from "../AdminSection";

type Option = { id: string; name: string };

const CHALLENGE_CONDITIONS = CONDITIONS.filter((c) => c.forChallenges);
const REWARD_ICONS: Record<SeasonRewardKind, typeof Gem> = { title: Gem, trophy: Trophy, physical: Package };

function day(iso: string) {
  return iso.slice(0, 10);
}

function frDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function hasEnded(s: Season) {
  return Date.now() > new Date(s.endsAt).getTime();
}

function seasonStatus(s: Season): { label: string; variant: "gold" | "success" | "neutral" | "info" } {
  const now = Date.now();
  if (s.rewardsDistributedAt) return { label: "Récompenses distribuées", variant: "neutral" };
  if (now > new Date(s.endsAt).getTime()) return { label: "Terminée, à clôturer", variant: "gold" };
  if (s.isActive && now >= new Date(s.startsAt).getTime()) return { label: "En cours", variant: "success" };
  if (s.isActive) return { label: "Active, pas encore commencée", variant: "info" };
  return { label: "Brouillon", variant: "neutral" };
}

export function SeasonsAdmin({
  seasons,
  selected,
  challenges,
  rewards,
  standings,
  participants,
  physical,
  titles,
  trophies,
}: {
  seasons: Season[];
  selected: Season | null;
  challenges: AdminChallengeRow[];
  rewards: SeasonReward[];
  standings: AdminStandingRow[];
  participants: number;
  physical: PhysicalRewardRow[];
  titles: Option[];
  trophies: Option[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [seasonForm, setSeasonForm] = useState<Season | "new" | null>(null);
  const [challengeForm, setChallengeForm] = useState<AdminChallengeRow | "new" | null>(null);
  const [rewardFormOpen, setRewardFormOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [deletingChallenge, setDeletingChallenge] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult<unknown>>, success: string, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) return toast.show(result.error, "error");
      toast.show(success, "success");
      after?.();
      router.refresh();
    });
  }

  const totalPoints = challenges.filter((c) => c.isPublished).reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {seasons.map((s) => (
          <Link
            key={s.id}
            href={`/app/admin/saisons?saison=${s.id}`}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              s.id === selected?.id ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-text-secondary hover:text-text-primary",
            )}
          >
            {s.name}
          </Link>
        ))}
        <Button size="sm" variant="secondary" onClick={() => setSeasonForm("new")}>
          <Plus className="h-3.5 w-3.5" /> Nouvelle saison
        </Button>
      </div>

      {!selected ? (
        <AdminSection title="Aucune saison" description="Crée la première saison pour lancer le classement de saison.">
          <span />
        </AdminSection>
      ) : (
        <>
          <AdminSection
            title={selected.name}
            description={`${frDate(selected.startsAt)} → ${frDate(selected.endsAt)} · ${selected.label}`}
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setSeasonForm(selected)} disabled={!!selected.rewardsDistributedAt}>
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
                {!selected.isActive && !selected.rewardsDistributedAt && (
                  <Button size="sm" onClick={() => run(() => activateSeasonAction(selected.id), "Saison activée.")} disabled={pending}>
                    Activer
                  </Button>
                )}
                {!selected.rewardsDistributedAt && (
                  <Button size="sm" variant="danger" onClick={() => setCloseOpen(true)} disabled={pending}>
                    <Crown className="h-3.5 w-3.5" /> Clôturer et récompenser
                  </Button>
                )}
              </div>
            }
          >
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant={seasonStatus(selected).variant}>{seasonStatus(selected).label}</Badge>
              <span className="text-text-secondary">
                {participants} participant{participants > 1 ? "s" : ""} · {challenges.filter((c) => c.isPublished).length} défis ·{" "}
                {totalPoints} points à gagner
              </span>
            </div>
            {selected.description && <p className="text-sm text-text-secondary">{selected.description}</p>}
          </AdminSection>

          <AdminSection
            title="Défis de la saison"
            description="Chaque défi réussi pendant la saison rapporte ses points. La progression est calculée automatiquement."
            action={
              <Button size="sm" onClick={() => setChallengeForm("new")} disabled={!!selected.rewardsDistributedAt}>
                <Plus className="h-3.5 w-3.5" /> Ajouter un défi
              </Button>
            }
          >
            {challenges.length === 0 ? (
              <p className="text-xs text-text-muted">Aucun défi pour l&apos;instant.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {challenges.map((c) => (
                  <li key={c.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium", c.isPublished ? "text-text-primary" : "text-text-muted line-through")}>
                        {c.title}
                      </p>
                      <p className="text-xs text-text-muted">
                        {describeCondition(c.type, c.target)} · réussi par {c.completedCount} membre{c.completedCount > 1 ? "s" : ""}
                        {!c.isPublished && " · masqué"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="gold">{c.points} pts</Badge>
                      <button
                        type="button"
                        onClick={() => setChallengeForm(c)}
                        aria-label={`Modifier ${c.title}`}
                        className="rounded-md p-1.5 text-text-muted hover:bg-card hover:text-text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {deletingChallenge === c.id ? (
                        <span className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => run(() => deleteChallengeAction(c.id), "Défi supprimé.", () => setDeletingChallenge(null))}
                            disabled={pending}
                            title="Les points déjà gagnés sur ce défi seront perdus."
                          >
                            Supprimer
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingChallenge(null)} disabled={pending}>
                            Garder
                          </Button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingChallenge(c.id)}
                          aria-label={`Supprimer ${c.title}`}
                          className="rounded-md p-1.5 text-text-muted hover:bg-error/10 hover:text-error"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>

          <AdminSection
            title="Récompenses de fin de saison"
            description="Distribuées automatiquement à la clôture, selon le rang final. Un trophée physique est à envoyer par vos soins."
            action={
              <Button size="sm" onClick={() => setRewardFormOpen(true)} disabled={!!selected.rewardsDistributedAt}>
                <Plus className="h-3.5 w-3.5" /> Ajouter une récompense
              </Button>
            }
          >
            {rewards.length === 0 ? (
              <p className="text-xs text-text-muted">Aucune récompense. Ajoute au moins un titre ou un trophée pour le podium.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {rewards.map((r) => {
                  const Icon = REWARD_ICONS[r.kind];
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                      <span className="flex items-center gap-3">
                        <span className="w-20 shrink-0 font-semibold tabular-nums text-gold">
                          {r.rankFrom === r.rankTo ? `#${r.rankFrom}` : `#${r.rankFrom} à #${r.rankTo}`}
                        </span>
                        <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                        <span className="text-text-primary">{r.label}</span>
                      </span>
                      {!selected.rewardsDistributedAt && (
                        <button
                          type="button"
                          onClick={() => run(() => deleteSeasonRewardAction(r.id), "Récompense retirée.")}
                          aria-label="Retirer"
                          className="rounded-md p-1.5 text-text-muted hover:bg-error/10 hover:text-error"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminSection>

          <AdminSection
            title={selected.rewardsDistributedAt ? "Classement final" : "Classement en direct"}
            description="Démo et comptes de test exclus. Vérifie les gagnants avant de clôturer."
          >
            {standings.length === 0 ? (
              <p className="text-xs text-text-muted">Personne n&apos;a encore marqué de points.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-muted">
                      <th className="pb-2 font-medium">Rang</th>
                      <th className="pb-2 font-medium">Membre</th>
                      <th className="pb-2 text-right font-medium">Points</th>
                      <th className="pb-2 text-right font-medium">Défis</th>
                      <th className="pb-2 pl-4 font-medium">Récompenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => (
                      <tr key={s.user_id} className="border-t border-border">
                        <td className="py-2 font-semibold tabular-nums text-gold">#{s.rank}</td>
                        <td className="py-2">
                          <Link href={`/profile/${s.username}`} className="hover:underline">
                            <span className="text-text-primary">
                              {s.first_name} {s.last_name}
                            </span>{" "}
                            <span className="text-xs text-text-muted">@{s.username}</span>
                          </Link>
                        </td>
                        <td className="py-2 text-right tabular-nums text-text-primary">{s.points}</td>
                        <td className="py-2 text-right tabular-nums text-text-secondary">{s.completed_count}</td>
                        <td className="py-2 pl-4 text-xs text-text-secondary">{s.rewards.join(" · ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>

          {physical.length > 0 && (
            <AdminSection title="Récompenses physiques à envoyer" description="Contacte chaque gagnant par e-mail pour son adresse, puis marque l'envoi.">
              <ul className="flex flex-col gap-2">
                {physical.map((p) => (
                  <li key={p.userId} className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-text-primary">
                        #{p.rank} · {p.firstName} {p.lastName} <span className="text-text-muted">@{p.username}</span>
                      </p>
                      <p className="text-xs text-text-muted">
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="underline hover:text-text-primary">
                            {p.email}
                          </a>
                        ) : (
                          "E-mail introuvable"
                        )}{" "}
                        · {p.rewards.join(", ")}
                      </p>
                    </div>
                    <select
                      value={p.status}
                      disabled={pending}
                      onChange={(e) =>
                        run(
                          () => setPhysicalRewardStatusAction(selected.id, p.userId, e.target.value as PhysicalRewardStatus),
                          "Statut mis à jour.",
                        )
                      }
                      className="rounded-md border border-border-strong bg-card-elevated px-2 py-1.5 text-xs text-text-primary"
                    >
                      <option value="to_send">À envoyer</option>
                      <option value="sent">Envoyé</option>
                    </select>
                  </li>
                ))}
              </ul>
            </AdminSection>
          )}
        </>
      )}

      {seasonForm && (
        <SeasonForm
          season={seasonForm === "new" ? null : seasonForm}
          nextNumber={Math.max(0, ...seasons.map((s) => s.number)) + 1}
          pending={pending}
          onClose={() => setSeasonForm(null)}
          onSubmit={(input) => run(() => saveSeasonAction(input), "Saison enregistrée.", () => setSeasonForm(null))}
        />
      )}

      {challengeForm && selected && (
        <ChallengeForm
          challenge={challengeForm === "new" ? null : challengeForm}
          seasonId={selected.id}
          titles={titles}
          pending={pending}
          onClose={() => setChallengeForm(null)}
          onSubmit={(input) => run(() => saveChallengeAction(input), "Défi enregistré.", () => setChallengeForm(null))}
        />
      )}

      {rewardFormOpen && selected && (
        <RewardForm
          seasonId={selected.id}
          titles={titles}
          trophies={trophies}
          pending={pending}
          onClose={() => setRewardFormOpen(false)}
          onSubmit={(input) => run(() => addSeasonRewardAction(input), "Récompense ajoutée.", () => setRewardFormOpen(false))}
        />
      )}

      {closeOpen && selected && (
        <Modal open onClose={() => setCloseOpen(false)} title={`Clôturer ${selected.name} ?`}>
          <div className="flex flex-col gap-3 text-sm text-text-secondary">
            <p>
              Le classement est figé et les récompenses sont distribuées immédiatement à {standings.filter((s) => s.rewards.length > 0).length}{" "}
              membre(s), avec une notification pour chacun. La saison est désactivée. Action irréversible.
            </p>
            {!hasEnded(selected) && (
              <p className="rounded-md border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
                La saison n&apos;est pas terminée (fin prévue le {frDate(selected.endsAt)}). Clôturer maintenant arrête le classement plus tôt.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCloseOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={() => run(() => closeSeasonAction(selected.id), "Saison clôturée, récompenses distribuées.", () => setCloseOpen(false))}
              >
                Clôturer et distribuer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SeasonForm({
  season,
  nextNumber,
  pending,
  onClose,
  onSubmit,
}: {
  season: Season | null;
  nextNumber: number;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: Parameters<typeof saveSeasonAction>[0]) => void;
}) {
  const number = season?.number ?? nextNumber;
  const [name, setName] = useState(season?.name ?? `ASCEND SAISON ${String(number).padStart(2, "0")}`);
  const [label, setLabel] = useState(season?.label ?? "");
  const [startsAt, setStartsAt] = useState(season ? day(season.startsAt) : "");
  const [endsAt, setEndsAt] = useState(season ? day(season.endsAt) : "");
  const [description, setDescription] = useState(season?.description ?? "");

  return (
    <Modal open onClose={onClose} title={season ? "Modifier la saison" : "Nouvelle saison"}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            id: season?.id,
            number,
            name: name.trim(),
            label: label.trim(),
            description: description.trim() || null,
            startsAt: `${startsAt}T00:00:00Z`,
            endsAt: `${endsAt}T23:59:59Z`,
          });
        }}
      >
        <Field label="Nom" htmlFor="season-name">
          <Input id="season-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
        </Field>
        <Field label="Période affichée" htmlFor="season-label" hint="Par exemple « Hiver 2026 » ou « Décembre à février ».">
          <Input id="season-label" value={label} onChange={(e) => setLabel(e.target.value)} required maxLength={40} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début" htmlFor="season-start">
            <Input id="season-start" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </Field>
          <Field label="Fin" htmlFor="season-end">
            <Input id="season-end" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
          </Field>
        </div>
        <Field label="Description" htmlFor="season-desc" hint="Affichée en haut de la page Saison des membres.">
          <Textarea id="season-desc" rows={3} maxLength={280} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <CalendarRange className="h-3.5 w-3.5" /> Les défis de la saison suivent ces dates automatiquement.
        </p>
        <Button type="submit" disabled={pending} className="self-start">
          Enregistrer
        </Button>
      </form>
    </Modal>
  );
}

function ChallengeForm({
  challenge,
  seasonId,
  titles,
  pending,
  onClose,
  onSubmit,
}: {
  challenge: AdminChallengeRow | null;
  seasonId: string;
  titles: Option[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: Parameters<typeof saveChallengeAction>[0]) => void;
}) {
  const [title, setTitle] = useState(challenge?.title ?? "");
  const [description, setDescription] = useState(challenge?.description ?? "");
  const [type, setType] = useState<ConditionType>((challenge?.type as ConditionType) ?? "revenue_threshold");
  const [target, setTarget] = useState(challenge ? String(fromStoredTarget(challenge.type as ConditionType, challenge.target)) : "");
  const [points, setPoints] = useState(String(challenge?.points ?? 20));
  const [rewardTitleId, setRewardTitleId] = useState(challenge?.rewardTitleId ?? "");
  const [isPublished, setIsPublished] = useState(challenge?.isPublished ?? true);
  const def = conditionDef(type);
  const needsTarget = !!def?.unit;

  return (
    <Modal open onClose={onClose} title={challenge ? "Modifier le défi" : "Nouveau défi"}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const value = needsTarget ? Number(target) : type === "profile_complete" ? 100 : 1;
          onSubmit({
            id: challenge?.id,
            seasonId,
            title: title.trim(),
            description: description.trim(),
            type,
            target: toStoredTarget(type, value),
            points: Math.round(Number(points)),
            rewardTitleId: rewardTitleId || null,
            isPublished,
          });
        }}
      >
        <Field label="Titre" htmlFor="ch-title">
          <Input id="ch-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={60} placeholder="10 clients dans le mois" />
        </Field>
        <Field label="Description" htmlFor="ch-desc">
          <Textarea id="ch-desc" rows={2} maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </Field>
        <Field label="Condition" htmlFor="ch-type">
          <Select id="ch-type" value={type} onChange={(e) => setType(e.target.value as ConditionType)}>
            {CHALLENGE_CONDITIONS.map((c) => (
              <option key={c.type} value={c.type}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {needsTarget && (
            <Field label={`Valeur (${def?.unit})`} htmlFor="ch-target">
              <Input id="ch-target" type="number" min={0} step="any" value={target} onChange={(e) => setTarget(e.target.value)} required />
            </Field>
          )}
          <Field label="Points" htmlFor="ch-points">
            <Input id="ch-points" type="number" min={0} step={1} value={points} onChange={(e) => setPoints(e.target.value)} required />
          </Field>
        </div>
        <Field label="Titre offert en plus (facultatif)" htmlFor="ch-reward">
          <Select id="ch-reward" value={rewardTitleId} onChange={(e) => setRewardTitleId(e.target.value)}>
            <option value="">Aucun</option>
            {titles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 accent-[#d6a84f]" />
          Visible par les membres
        </label>
        <Button type="submit" disabled={pending} className="self-start">
          Enregistrer
        </Button>
      </form>
    </Modal>
  );
}

function RewardForm({
  seasonId,
  titles,
  trophies,
  pending,
  onClose,
  onSubmit,
}: {
  seasonId: string;
  titles: Option[];
  trophies: Option[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: Parameters<typeof addSeasonRewardAction>[0]) => void;
}) {
  const [rankFrom, setRankFrom] = useState("1");
  const [rankTo, setRankTo] = useState("1");
  const [kind, setKind] = useState<SeasonRewardKind>("title");
  const [titleId, setTitleId] = useState(titles[0]?.id ?? "");
  const [trophyId, setTrophyId] = useState(trophies[0]?.id ?? "");
  const [physicalLabel, setPhysicalLabel] = useState("Trophée physique ASCEND gravé à ton nom");

  const label =
    kind === "title"
      ? `Titre « ${titles.find((t) => t.id === titleId)?.name ?? ""} »`
      : kind === "trophy"
        ? `Trophée « ${trophies.find((t) => t.id === trophyId)?.name ?? ""} »`
        : physicalLabel;

  return (
    <Modal open onClose={onClose} title="Nouvelle récompense">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            seasonId,
            rankFrom: Number(rankFrom),
            rankTo: Number(rankTo),
            kind,
            titleId: kind === "title" ? titleId : null,
            trophyId: kind === "trophy" ? trophyId : null,
            label: label.trim(),
          });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Du rang" htmlFor="rw-from">
            <Input id="rw-from" type="number" min={1} value={rankFrom} onChange={(e) => setRankFrom(e.target.value)} required />
          </Field>
          <Field label="Au rang" htmlFor="rw-to">
            <Input id="rw-to" type="number" min={1} value={rankTo} onChange={(e) => setRankTo(e.target.value)} required />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["title", "trophy", "physical"] as SeasonRewardKind[]).map((k) => {
            const Icon = REWARD_ICONS[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border p-3 text-xs",
                  kind === k ? "border-gold bg-gold/10 text-text-primary" : "border-border text-text-secondary",
                )}
              >
                <Icon className="h-4 w-4" />
                {k === "title" ? "Titre" : k === "trophy" ? "Trophée" : "Physique"}
              </button>
            );
          })}
        </div>
        {kind === "title" && (
          <Field label="Titre" htmlFor="rw-title" hint="Crée un nouveau titre de saison dans Récompenses si besoin.">
            <Select id="rw-title" value={titleId} onChange={(e) => setTitleId(e.target.value)}>
              {titles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {kind === "trophy" && (
          <Field label="Trophée" htmlFor="rw-trophy">
            <Select id="rw-trophy" value={trophyId} onChange={(e) => setTrophyId(e.target.value)}>
              {trophies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {kind === "physical" && (
          <Field label="Récompense physique" htmlFor="rw-physical" hint="Affichée aux membres. À envoyer par vos soins après la clôture.">
            <Input id="rw-physical" value={physicalLabel} onChange={(e) => setPhysicalLabel(e.target.value)} required maxLength={80} />
          </Field>
        )}
        <p className="text-xs text-text-muted">Affiché : {label}</p>
        <Button type="submit" disabled={pending} className="self-start">
          Ajouter
        </Button>
      </form>
    </Modal>
  );
}
