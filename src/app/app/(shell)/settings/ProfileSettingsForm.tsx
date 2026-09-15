"use client";

import { useState, useTransition } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { COUNTRIES } from "@/lib/constants";
import { updateProfileAction } from "./actions";

export function ProfileSettingsForm({
  initial,
}: {
  initial: { firstName: string; lastName: string; bio: string; country: string; city: string };
}) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProfileAction(form);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Profil mis à jour.", "success");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom">
          <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </Field>
        <Field label="Nom">
          <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pays">
          <Select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ville" hint="Utilisée pour te trouver dans le Réseau.">
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
      </div>
      <Field label="Bio" hint={`${form.bio.length}/280`}>
        <Textarea
          rows={3}
          maxLength={280}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
      </Field>
      <Button type="submit" disabled={pending} className="self-start">
        Enregistrer
      </Button>
    </form>
  );
}
