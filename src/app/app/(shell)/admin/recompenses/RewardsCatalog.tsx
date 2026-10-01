"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { CONDITIONS, conditionDef, describeCondition, normalizeRequirement, toStoredTarget, type ConditionType } from "@/lib/conditions";
import { TITLE_ICONS, PICKABLE_ICONS, TITLE_RARITY_LABELS } from "@/lib/titleDisplay";
import type { ActionResult } from "@/app/(auth)/actions";
import type { CatalogTitle, CatalogTrophy, CatalogAchievement } from "@/services/catalog.service";
import type { AchievementRarity, TitleRarity } from "@/types/database.types";
import { createTitleAction, createTrophyAction, createAchievementAction, grantRewardAction } from "../actions";
import { AdminSection } from "../AdminSection";

type Kind = "title" | "trophy" | "achievement";

function conditionText(req: Record<string, unknown>) {
  const c = normalizeRequirement(req);
  return c ? describeCondition(c.type, c.target) : null;
}

export function RewardsCatalog({
  titles,
  trophies,
  achievements,
}: {
  titles: CatalogTitle[];
  trophies: CatalogTrophy[];
  achievements: CatalogAchievement[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState<Kind | null>(null);
  const [granting, setGranting] = useState(false);

  function run(action: () => Promise<ActionResult>, success: string, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) return toast.show(result.error, "error");
      toast.show(success, "success");
      after?.();
      router.refresh();
    });
  }

  const earnedTitles = titles.filter((t) => t.type === "earned");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setCreating("title")}>
          <Plus className="h-3.5 w-3.5" /> Nouveau titre
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setCreating("trophy")}>
          <Plus className="h-3.5 w-3.5" /> Nouveau trophée
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setCreating("achievement")}>
          <Plus className="h-3.5 w-3.5" /> Nouvel accomplissement
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setGranting(true)}>
          <Gift className="h-3.5 w-3.5" /> Attribuer à un membre
        </Button>
      </div>

      <AdminSection
        title={`Titres (${titles.length})`}
        description="Les titres « gagnés » avec une condition automatique sont attribués dès qu'un membre la remplit. Les titres payants se gèrent dans la boutique."
      >
        <CatalogList
          rows={titles.map((t) => {
            const Icon = TITLE_ICONS[t.icon] ?? TITLE_ICONS.gem;
            return {
              id: t.id,
              icon: <Icon className="h-4 w-4 text-gold" />,
              name: t.name,
              meta: t.type === "purchasable" ? "Titre payant" : (conditionText(t.requirement) ?? "Attribué à la main"),
              badge: TITLE_RARITY_LABELS[t.rarity],
              count: t.ownerCount,
            };
          })}
        />
      </AdminSection>

      <AdminSection title={`Trophées (${trophies.length})`} description="Remis à la main ou à la clôture d'une saison.">
        <CatalogList
          rows={trophies.map((t) => {
            const Icon = TITLE_ICONS[t.icon] ?? TITLE_ICONS.trophy;
            return { id: t.id, icon: <Icon className="h-4 w-4 text-gold" />, name: t.name, meta: t.description, count: t.ownerCount };
          })}
        />
      </AdminSection>

      <AdminSection title={`Accomplissements (${achievements.length})`} description="Débloqués automatiquement quand leur condition est remplie.">
        <CatalogList
          rows={achievements.map((a) => ({
            id: a.id,
            icon: <TITLE_ICONS.award className="h-4 w-4 text-gold" />,
            name: a.name,
            meta: conditionText(a.criteria) ?? a.description,
            badge: TITLE_RARITY_LABELS[a.rarity],
            count: a.ownerCount,
          }))}
        />
      </AdminSection>

      {creating && (
        <CreateForm
          kind={creating}
          pending={pending}
          onClose={() => setCreating(null)}
          onSubmit={(action, label) => run(action, `${label} créé.`, () => setCreating(null))}
        />
      )}

      {granting && (
        <GrantForm
          titles={earnedTitles}
          trophies={trophies}
          achievements={achievements}
          pending={pending}
          onClose={() => setGranting(false)}
          onSubmit={(input) => run(() => grantRewardAction(input), "Récompense attribuée.", () => setGranting(false))}
        />
      )}
    </div>
  );
}

function CatalogList({
  rows,
}: {
  rows: { id: string; icon: React.ReactNode; name: string; meta: string; badge?: string; count: number }[];
}) {
  return (
    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 rounded-md border border-border p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/10">{r.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">{r.name}</p>
            <p className="truncate text-xs text-text-muted">{r.meta}</p>
          </div>
          {r.badge && <Badge>{r.badge}</Badge>}
          <span className="shrink-0 text-xs tabular-nums text-text-secondary" title="Membres qui le possèdent">
            {r.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

const TITLE_RARITIES: TitleRarity[] = ["common", "rare", "epic", "legendary"];
const ACH_RARITIES: AchievementRarity[] = ["common", "rare", "epic", "legendary"];
const LABELS: Record<Kind, string> = { title: "Titre", trophy: "Trophée", achievement: "Accomplissement" };

function CreateForm({
  kind,
  pending,
  onClose,
  onSubmit,
}: {
  kind: Kind;
  pending: boolean;
  onClose: () => void;
  onSubmit: (action: () => Promise<ActionResult>, label: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(kind === "trophy" ? "trophy" : "crown");
  const [rarity, setRarity] = useState<TitleRarity>("rare");
  const [condition, setCondition] = useState<ConditionType>(kind === "achievement" ? "revenue_threshold" : "manual");
  const [target, setTarget] = useState("");

  // Growth on the season's reference month only exists inside a season.
  const options = CONDITIONS.filter((c) => c.type !== "base_growth" && (kind === "achievement" ? c.automatic : true));
  const def = conditionDef(condition);
  const needsTarget = !!def?.unit;

  return (
    <Modal open onClose={onClose} title={`Nouveau ${LABELS[kind].toLowerCase()}`}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const value = needsTarget ? toStoredTarget(condition, Number(target)) : null;
          if (kind === "title") {
            onSubmit(() => createTitleAction({ name: name.trim(), description: description.trim(), icon, rarity, condition, target: value }), LABELS[kind]);
          } else if (kind === "trophy") {
            onSubmit(() => createTrophyAction({ name: name.trim(), description: description.trim(), icon }), LABELS[kind]);
          } else {
            onSubmit(
              () =>
                createAchievementAction({
                  name: name.trim(),
                  description: description.trim(),
                  rarity: rarity as AchievementRarity,
                  condition,
                  target: value,
                }),
              LABELS[kind],
            );
          }
        }}
      >
        <Field label="Nom" htmlFor="cat-name">
          <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
        </Field>
        <Field label="Description" htmlFor="cat-desc">
          <Textarea id="cat-desc" rows={2} maxLength={140} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </Field>
        {kind !== "achievement" && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-secondary">Icône</p>
            <div className="flex flex-wrap gap-2">
              {PICKABLE_ICONS.map((key) => {
                const Icon = TITLE_ICONS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    aria-label={key}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md border",
                      icon === key ? "border-gold bg-gold/10 text-gold" : "border-border text-text-secondary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {kind !== "trophy" && (
          <>
            <Field label="Rareté" htmlFor="cat-rarity">
              <Select id="cat-rarity" value={rarity} onChange={(e) => setRarity(e.target.value as TitleRarity)}>
                {(kind === "title" ? TITLE_RARITIES : ACH_RARITIES).map((r) => (
                  <option key={r} value={r}>
                    {TITLE_RARITY_LABELS[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Comment l'obtenir" htmlFor="cat-cond">
              <Select id="cat-cond" value={condition} onChange={(e) => setCondition(e.target.value as ConditionType)}>
                {options.map((c) => (
                  <option key={c.type} value={c.type}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            {needsTarget && (
              <Field label={`Valeur (${def?.unit})`} htmlFor="cat-target">
                <Input id="cat-target" type="number" min={0} step="any" value={target} onChange={(e) => setTarget(e.target.value)} required />
              </Field>
            )}
          </>
        )}
        <Button type="submit" disabled={pending} className="self-start">
          Créer
        </Button>
      </form>
    </Modal>
  );
}

function GrantForm({
  titles,
  trophies,
  achievements,
  pending,
  onClose,
  onSubmit,
}: {
  titles: CatalogTitle[];
  trophies: CatalogTrophy[];
  achievements: CatalogAchievement[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: { username: string; kind: Kind; id: string }) => void;
}) {
  const [username, setUsername] = useState("");
  const [kind, setKind] = useState<Kind>("title");
  const list = kind === "title" ? titles : kind === "trophy" ? trophies : achievements;
  const [id, setId] = useState(list[0]?.id ?? "");

  return (
    <Modal open onClose={onClose} title="Attribuer une récompense">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ username, kind, id });
        }}
      >
        <Field label="Nom d'utilisateur du membre" htmlFor="grant-user">
          <Input id="grant-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@pseudo" required />
        </Field>
        <Field label="Type" htmlFor="grant-kind">
          <Select
            id="grant-kind"
            value={kind}
            onChange={(e) => {
              const k = e.target.value as Kind;
              setKind(k);
              const next = k === "title" ? titles : k === "trophy" ? trophies : achievements;
              setId(next[0]?.id ?? "");
            }}
          >
            <option value="title">Titre</option>
            <option value="trophy">Trophée</option>
            <option value="achievement">Accomplissement</option>
          </Select>
        </Field>
        <Field label={LABELS[kind]} htmlFor="grant-id">
          <Select id="grant-id" value={id} onChange={(e) => setId(e.target.value)}>
            {list.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-xs text-text-muted">Le membre reçoit une notification.</p>
        <Button type="submit" disabled={pending} className="self-start">
          Attribuer
        </Button>
      </form>
    </Modal>
  );
}
