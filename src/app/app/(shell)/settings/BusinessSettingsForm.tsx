"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { updateBusinessAction, verifySiretAction } from "./actions";

export function BusinessSettingsForm({
  initial,
}: {
  initial: {
    name: string;
    category: string;
    website: string;
    skills: string;
    siret: string;
    legalName: string | null;
  };
}) {
  const [form, setForm] = useState(initial);
  const [siret, setSiret] = useState(initial.siret);
  const [pending, startTransition] = useTransition();
  const [siretPending, startSiretTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateBusinessAction(form);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Activité mise à jour.", "success");
    });
  }

  function submitSiret(e: React.FormEvent) {
    e.preventDefault();
    startSiretTransition(async () => {
      const result = await verifySiretAction(siret);
      if (!result.success) return toast.show(result.error, "error");
      toast.show(`Entreprise vérifiée : ${result.data.legalName}`, "success");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nom de l'activité">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Catégorie">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Site web" hint="Optionnel">
          <Input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://"
          />
        </Field>
        <Field
          label="Compétences"
          hint="Séparées par des virgules — utilisées pour te suggérer les opportunités les plus pertinentes."
        >
          <Input
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
            placeholder="Growth marketing, React, Vente B2B..."
          />
        </Field>
        <Button type="submit" disabled={pending} className="self-start">
          Enregistrer
        </Button>
      </form>

      <div className="border-t border-border pt-6">
        {initial.legalName ? (
          <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3.5 py-2.5 text-sm text-success">
            <BadgeCheck className="h-4 w-4 shrink-0" />
            Entreprise vérifiée : <span className="font-medium">{initial.legalName}</span>
          </div>
        ) : (
          <form onSubmit={submitSiret} className="flex flex-col gap-3">
            <Field
              label="Numéro SIRET"
              hint="Vérification gratuite auprès du registre officiel français. Le prénom et le nom de ton profil doivent correspondre au dirigeant déclaré de l'entreprise."
            >
              <Input
                value={siret}
                onChange={(e) => setSiret(e.target.value.replace(/[^0-9]/g, "").slice(0, 14))}
                placeholder="14 chiffres"
                inputMode="numeric"
              />
            </Field>
            <Button type="submit" variant="secondary" disabled={siretPending || siret.length !== 14} className="self-start">
              Vérifier mon entreprise
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
