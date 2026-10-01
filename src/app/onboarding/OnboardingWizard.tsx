"use client";

import { hardNavigate } from "@/lib/hardNavigate";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { BUSINESS_CATEGORIES, COUNTRIES } from "@/lib/constants";
import { track } from "@/lib/analytics";
import { suggestedVerification, VERIFICATION_OPTIONS } from "@/lib/verificationOptions";
import { SignupSurvey } from "@/components/onboarding/SignupSurvey";
import { saveProfileStepAction, saveBioStepAction, completeOnboardingAction } from "../(auth)/actions";
import type { OnboardingStep } from "@/types/database.types";

const SCREEN_FOR_STEP: Record<OnboardingStep, number> = { profile: 1, business: 1, bio: 3, revenue: 4, done: 4 };

export function OnboardingWizard({
  startStep,
  hasSurvey,
  platforms: surveyPlatforms,
  initial,
}: {
  startStep: OnboardingStep;
  hasSurvey: boolean;
  platforms: string[];
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
  const resumeAt = SCREEN_FOR_STEP[startStep];
  const [step, setStep] = useState(() => (!hasSurvey && resumeAt > 2 ? 2 : resumeAt));
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
  const [platforms, setPlatforms] = useState(surveyPlatforms);
  const suggestions = suggestedVerification(platforms);

  function submitProfile() {
    setError(null);
    startTransition(async () => {
      const result = await saveProfileStepAction(profile);
      if (!result.success) return setError(result.error);
      setStep(hasSurvey ? 3 : 2);
    });
  }

  function submitBio() {
    setError(null);
    startTransition(async () => {
      const result = await saveBioStepAction({ bio });
      if (!result.success) return setError(result.error);
      track("profile_completed");
      setStep(4);
    });
  }

  /** Ends onboarding, then goes to the chosen way of verifying (or the dashboard). */
  function finish(href: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboardingAction();
      if (!result.success) return setError(result.error);
      track("signup_completed");
      if (href?.startsWith("/api/")) {
        track("stripe_connection_started");
        hardNavigate(href);
      } else {
        router.push(href ?? "/app/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <div className="animate-fade-up">
      {error && (
        <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Que construis-tu ?</h1>
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
        <SignupSurvey
          onDone={(picked) => {
            setPlatforms(picked);
            setStep(Math.max(3, resumeAt));
          }}
        />
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Ajoute une courte bio</h1>
            <p className="mt-1 text-sm text-text-secondary">Optionnel, tu pourras l&apos;ajouter plus tard.</p>
          </div>
          <Field label="Bio" htmlFor="bio" hint={`${bio.length}/280`}>
            <Textarea id="bio" rows={4} maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Je construis..." />
          </Field>
          <Button onClick={submitBio} disabled={pending} className="mt-2">
            Continuer <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Vérifie tes revenus</h1>
            <p className="mt-1 text-sm text-text-secondary">
              C&apos;est ce qui te fait entrer au classement. Lecture seule : ASCEND ne peut ni payer ni rien modifier.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {suggestions.map((o, i) => (
              <button
                key={o.id}
                type="button"
                onClick={() => finish(o.href)}
                disabled={pending}
                className={
                  i === 0
                    ? "flex items-center justify-between gap-3 rounded-md border border-gold bg-gold/10 px-4 py-3 text-left transition-colors hover:bg-gold/15 disabled:opacity-60"
                    : "flex items-center justify-between gap-3 rounded-md border border-border-strong bg-card px-4 py-3 text-left transition-colors hover:border-gold/50 disabled:opacity-60"
                }
              >
                <span>
                  <span className="block text-sm font-medium text-text-primary">Connecter {o.name}</span>
                  <span className="block text-xs text-text-muted">{o.hint}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-gold" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => finish("/app/settings#comptes-connectes")}
              disabled={pending}
              className="flex items-center justify-between gap-3 rounded-md border border-border-strong bg-card px-4 py-3 text-left transition-colors hover:border-gold/50 disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-medium text-text-primary">Une autre plateforme</span>
                <span className="block text-xs text-text-muted">Stripe, Whop, Gumroad, Shopify, PayPal, Qonto...</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-text-muted" />
            </button>
            <button
              type="button"
              onClick={() => finish(VERIFICATION_OPTIONS.manuel.href)}
              disabled={pending}
              className="flex items-center justify-between gap-3 rounded-md border border-border-strong bg-card px-4 py-3 text-left transition-colors hover:border-gold/50 disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-medium text-text-primary">Déclarer avec un justificatif</span>
                <span className="block text-xs text-text-muted">Sans rien connecter, vérifié par l&apos;équipe</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-text-muted" />
            </button>
          </div>
          <Button onClick={() => finish(null)} disabled={pending} variant="ghost">
            Plus tard
          </Button>
        </div>
      )}
    </div>
  );
}
