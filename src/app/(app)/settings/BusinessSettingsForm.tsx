"use client";

import { useState, useTransition } from "react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { updateBusinessAction } from "./actions";

export function BusinessSettingsForm({
  initial,
}: {
  initial: { name: string; category: string; website: string };
}) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateBusinessAction(form);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Business updated.", "success");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Business name">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Category">
        <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Website" hint="Optional">
        <Input
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://"
        />
      </Field>
      <Button type="submit" disabled={pending} className="self-start">
        Save changes
      </Button>
    </form>
  );
}
