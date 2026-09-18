"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { BUSINESS_CATEGORIES, COUNTRIES } from "@/lib/constants";
import { track } from "@/lib/analytics";
import { saveProfileStepAction, saveBioStepAction, completeOnboardingAction } from "../(auth)/actions";
import type { OnboardingStep } from "@/types/database.types";

const ORDER: OnboardingStep[] = ["profile", "business", "bio", "revenue", "done"];

export function OnboardingWizard({
  startStep,
  initial,
}: {
  startStep: OnboardingStep;
  initial: {
    firstName: string;
    lastName: string;
    country: string;
    category: string;
    businessName: string;
    bio: string;
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState(() => Math.max(1, ORDER.indexOf(startStep)));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    firstName: initial.firstName,
    lastName: initial.lastName,
    country: initial.country || COUNTRIES[0].value,
    category: initial.category || BUSINESS_CATEGORIES[0].value,
    businessName: initial.businessName,
  });
  const [bio, setBio] = useState(initial.bio);

  function submitProfile() {
    setError(null);
    startTransition(async () => {
      const result = await saveProfileStepAction(profile);
      if (!result.success) return setError(result.error);
      setStep(2);
    });
  }

  function submitBio() {
    setError(null);
    startTransition(async () => {
      const result = await saveBioStepAction({ bio });
      if (!result.success) return setError(result.error);
      track("profile_completed");
      setStep(3);
    });
  }

  function skipOrConnect(connect: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboardingAction();
      if (!result.success) return setError(result.error);
      track("signup_completed");
      if (connect) {
        track("stripe_connection_started");
        router.push("/api/stripe/connect");
      } else {
        router.push("/app/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <div className="animate-fade-up">
      {error && (
        <div className="mb-4 border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-2xl font-medium text-text-primary">Que construis-tu ?</h1>
            <p className="mt-1 text-sm text-text-secondary">Cela façonne ton profil public de fondateur.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" htmlFor="firstName">
              <Input id="firstName" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            </Field>
            <Field label="Nom" htmlFor="lastName">
              <Input id="lastName" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
            </Field>
          </div>
          <Field label="Pays" htmlFor="country">
            <Select id="country" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })}>
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Catégorie d'activité" htmlFor="category">
            <Select id="category" value={profile.category} onChange={(e) => setProfile({ ...profile, category: e.target.value })}>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Nom de l'activité" htmlFor="businessName">
            <Input id="businessName" value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} placeholder="Acme Inc." />
          </Field>
          <Button onClick={submitProfile} disabled={pending} className="mt-2">
            Continuer <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-2xl font-medium text-text-primary">Ajoute une courte bio</h1>
            <p className="mt-1 text-sm text-text-secondary">Optionnel — tu pourras toujours l&apos;ajouter plus tard.</p>
          </div>
          <Field label="Bio" htmlFor="bio" hint={`${bio.length}/280`}>
            <Textarea id="bio" rows={4} maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Je construis..." />
          </Field>
          <Button onClick={submitBio} disabled={pending} className="mt-2">
            Continuer <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-2xl font-medium text-text-primary">Vérifie tes performances</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Connecte Stripe pour vérifier ton activité et apparaître au classement.
            </p>
          </div>
          <Button onClick={() => skipOrConnect(true)} disabled={pending}>
            Connecter Stripe <ArrowRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => skipOrConnect(false)} disabled={pending} variant="secondary">
            Passer cette étape
          </Button>
        </div>
      )}
    </div>
  );
}
