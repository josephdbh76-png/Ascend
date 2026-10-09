"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Flame, Gem, Mountain, Rocket, Shield, Star, Swords, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { ACCESS_LABELS, CLAN_COLORS, CLAN_EMBLEMS, type ClanColorId, type ClanEmblemId } from "@/lib/clans";
import { createClanAction, updateClanAction } from "@/app/app/(shell)/ligue/actions";
import type { ClanAccess } from "@/types/database.types";
import { ClanEmblem } from "./ClanEmblem";

const ICONS = { shield: Shield, swords: Swords, crown: Crown, flame: Flame, rocket: Rocket, zap: Zap, gem: Gem, target: Target, mountain: Mountain, star: Star };

export interface ClanFormValues {
  name: string;
  tagline: string;
  emblem: ClanEmblemId;
  color: ClanColorId;
  access: ClanAccess;
}

/** Creating a league, or its settings for the chief, with the crest previewed live. */
export function ClanForm({ clanId, initial, disabled }: { clanId?: string; initial?: ClanFormValues; disabled?: boolean }) {
  const [values, setValues] = useState<ClanFormValues>(initial ?? { name: "", tagline: "", emblem: "shield", color: "gold", access: "open" });
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const set = <K extends keyof ClanFormValues>(key: K, value: ClanFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = clanId ? await updateClanAction(clanId, values) : await createClanAction(values);
      if (!result.success) return toast.show(result.error, "error");
      toast.show(clanId ? "Ligue mise à jour." : "Ta ligue est ouverte !", "success");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4 rounded-lg border border-border bg-bg-secondary p-4">
        <ClanEmblem emblem={values.emblem} color={values.color} size={64} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-text-primary">{values.name.trim() || "Nom de ta ligue"}</p>
          <p className="line-clamp-2 text-sm text-text-secondary">{values.tagline.trim() || "Ta devise, en une phrase."}</p>
        </div>
      </div>

      <Field label="Nom" hint="2 à 30 caractères.">
        <Input value={values.name} maxLength={30} onChange={(e) => set("name", e.target.value)} placeholder="Les Bâtisseurs" required disabled={disabled} />
      </Field>
      <Field label="Devise (facultatif)">
        <Input value={values.tagline} maxLength={140} onChange={(e) => set("tagline", e.target.value)} placeholder="On construit, on prouve, on gagne." disabled={disabled} />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Emblème</p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {CLAN_EMBLEMS.map((id) => {
            const Icon = ICONS[id];
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => set("emblem", id)}
                aria-label={`Emblème ${id}`}
                aria-pressed={values.emblem === id}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md border transition-colors",
                  values.emblem === id ? "border-gold bg-gold/10 text-gold" : "border-border-strong text-text-secondary hover:border-gold/40",
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Couleurs</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CLAN_COLORS) as ClanColorId[]).map((id) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => set("color", id)}
              aria-label={CLAN_COLORS[id].label}
              aria-pressed={values.color === id}
              title={CLAN_COLORS[id].label}
              className={cn("h-9 w-9 rounded-full border-2 transition-transform", values.color === id ? "scale-110 border-text-primary" : "border-transparent hover:scale-105")}
              style={{ background: `linear-gradient(135deg, ${CLAN_COLORS[id].from}, ${CLAN_COLORS[id].to})` }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Qui peut entrer</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(ACCESS_LABELS) as ClanAccess[]).map((id) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => set("access", id)}
              aria-pressed={values.access === id}
              className={cn(
                "rounded-md border p-3 text-left transition-colors",
                values.access === id ? "border-gold bg-gold/10" : "border-border-strong hover:border-gold/40",
              )}
            >
              <span className={cn("block text-sm font-medium", values.access === id ? "text-gold" : "text-text-primary")}>{ACCESS_LABELS[id].label}</span>
              <span className="mt-0.5 block text-xs text-text-muted">{ACCESS_LABELS[id].detail}</span>
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={disabled || pending || values.name.trim().length < 2} className="self-start">
        {clanId ? "Enregistrer" : "Ouvrir ma ligue"}
      </Button>
    </form>
  );
}
