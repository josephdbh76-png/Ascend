"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { updateBusinessAction, verifySiretAction } from "./actions";
import { BusinessFields, type BusinessFormValues } from "./BusinessFields";

export function BusinessSettingsForm({
  initial,
}: {
  initial: BusinessFormValues & {
    skills: string;
    siret: string;
    legalName: string | null;
  };
}) {
  const [business, setBusiness] = useState<BusinessFormValues>({
    name: initial.name,
    category: initial.category,
    customCategory: initial.customCategory,
    description: initial.description,
    website: initial.website,
  });
  const [skills, setSkills] = useState(initial.skills);
  const [siret, setSiret] = useState(initial.siret);
  const [pending, startTransition] = useTransition();
  const [siretPending, startSiretTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateBusinessAction({ ...business, skills });
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
        <BusinessFields values={business} onChange={setBusiness} idPrefix="main-business" />
        <Field
          label="Compétences"
          htmlFor="main-business-skills"
          hint="Séparées par des virgules. Elles servent à te proposer les opportunités qui te correspondent."
        >
          <Input
            id="main-business-skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Growth marketing, React, Vente B2B..."
          />
        </Field>
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Enregistrement..." : "Enregistrer"}
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
