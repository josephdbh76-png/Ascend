"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { BUSINESS_CATEGORIES, COUNTRIES } from "@/lib/constants";
import { OPPORTUNITY_TYPES, COMPENSATION_TYPES, LOCATION_TYPES, TARGET_STAGES } from "@/lib/opportunityDisplay";
import { createOpportunityAction } from "./actions";
import type { OpportunityType, CompensationType, OpportunityLocationType, OpportunityStage } from "@/types/database.types";

const EMPTY_FORM = {
  type: "cofounder" as OpportunityType,
  title: "",
  description: "",
  category: "",
  compensationType: "equity" as CompensationType,
  locationType: "remote" as OpportunityLocationType,
  city: "",
  country: "",
  skills: "",
  targetStage: "any" as OpportunityStage,
};

export function NewOpportunityModal({ isElite }: { isElite: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createOpportunityAction({
        ...form,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 10),
      });
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Ton opportunité a été publiée.", "success");
      setForm(EMPTY_FORM);
      setOpen(false);
      router.refresh();
    });
  }

  if (!isElite) {
    return (
      <Button href="/app/settings#abonnement">
        <Plus className="h-4 w-4" /> Publier une opportunité
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Publier une opportunité
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Publier une opportunité" className="max-w-lg!">
        <form onSubmit={submit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <Field label="Type de recherche">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as OpportunityType })}>
              {OPPORTUNITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Titre">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex : Cherche cofondateur technique pour SaaS B2B"
              required
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              placeholder="Décris le contexte, ce que tu proposes, ce que tu recherches..."
              required
            />
          </Field>

          <Field label="Activité concernée" hint="Optionnel — laisse vide si ça concerne toutes les activités.">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Toutes les activités</option>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rémunération">
              <Select
                value={form.compensationType}
                onChange={(e) => setForm({ ...form, compensationType: e.target.value as CompensationType })}
              >
                {COMPENSATION_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Lieu">
              <Select
                value={form.locationType}
                onChange={(e) => setForm({ ...form, locationType: e.target.value as OpportunityLocationType })}
              >
                {LOCATION_TYPES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {form.locationType !== "remote" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ville" hint="Optionnel">
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
              <Field label="Pays">
                <Select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                  <option value="">Sélectionner...</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          <Field label="Stade de business visé">
            <Select
              value={form.targetStage}
              onChange={(e) => setForm({ ...form, targetStage: e.target.value as OpportunityStage })}
            >
              {TARGET_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Compétences recherchées" hint="Séparées par des virgules, optionnel.">
            <Input
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="React, Growth marketing, Vente B2B..."
            />
          </Field>

          <Button type="submit" disabled={pending} className="self-start">
            Publier
          </Button>
        </form>
      </Modal>
    </>
  );
}
