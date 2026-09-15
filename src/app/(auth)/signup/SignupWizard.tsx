"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { BUSINESS_CATEGORIES, COUNTRIES } from "@/lib/constants";
import { track } from "@/lib/analytics";
import {
  createAccountAction,
  saveProfileStepAction,
  saveBioStepAction,
  completeOnboardingAction,
} from "../actions";

const STEPS = ["Compte", "Activité", "Bio", "Connexion"] as const;

export function SignupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const [account, setAccount] = useState({ email: "", password: "", username: "" });
  const [profile, setProfile] = useState<{
    firstName: string;
    lastName: string;
    country: string;
    category: string;
    businessName: string;
  }>({
    firstName: "",
    lastName: "",
    country: COUNTRIES[0].value,
    category: BUSINESS_CATEGORIES[0].value,
    businessName: "",
  });
  const [bio, setBio] = useState("");

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function submitAccount() {
    setError(null);
    track("signup_started");
    startTransition(async () => {
      const result = await createAccountAction(account);
      if (!result.success) return setError(result.error);
      if (result.data.needsEmailConfirmation) {
        setNeedsConfirmation(true);
        return;
      }
      next();
    });
  }

  function submitProfile() {
    setError(null);
    startTransition(async () => {
      const result = await saveProfileStepAction(profile);
      if (!result.success) return setError(result.error);
      next();
    });
  }

  function submitBio() {
    setError(null);
    startTransition(async () => {
      const result = await saveBioStepAction({ bio });
      if (!result.success) return setError(result.error);
      track("profile_completed");
      next();
    });
  }

  function skipOrConnect(connect: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboardingAction();
      if (!result.success) return setError(result.error);
      track("signup_completed");
      if (plan === "pro" || plan === "elite") {
        router.push(`/api/stripe/checkout?tier=${plan}`);
      } else if (connect) {
        track("stripe_connection_started");
        router.push("/api/stripe/connect");
      } else {
        router.push("/app/dashboard");
        router.refresh();
      }
    });
  }

  if (needsConfirmation) {
    return (
      <div className="animate-fade-up rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
          <Check className="h-6 w-6 text-gold" />
        </div>
        <h1 className="text-lg font-semibold text-text-primary">Vérifie ta boîte mail</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Nous avons envoyé un lien de confirmation à <span className="text-text-primary">{account.email}</span>.
          Confirme ton adresse, puis connecte-toi pour terminer ton profil.
        </p>
        <Button href="/login" className="mt-6 w-full">
          Aller à la connexion
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div className={`h-1 rounded-full transition-colors ${i <= step ? "bg-gold" : "bg-border"}`} />
            <span className={`text-[11px] font-medium ${i === step ? "text-gold" : "text-text-muted"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-xl font-semibold text-text-primary">Crée ton compte</h1>
                <p className="mt-1 text-sm text-text-secondary">Gratuit pendant la bêta. Aucune carte bancaire.</p>
              </div>
              <Field label="E-mail" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={account.email}
                  onChange={(e) => setAccount({ ...account, email: e.target.value })}
                  placeholder="toi@entreprise.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Mot de passe" htmlFor="password" hint="Au moins 8 caractères.">
                <Input
                  id="password"
                  type="password"
                  value={account.password}
                  onChange={(e) => setAccount({ ...account, password: e.target.value })}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Nom d'utilisateur" htmlFor="username" hint="Ton profil public : ascend.app/profile/pseudo">
                <Input
                  id="username"
                  value={account.username}
                  onChange={(e) =>
                    setAccount({ ...account, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })
                  }
                  placeholder="janedoe"
                  autoComplete="off"
                />
              </Field>
              <Button onClick={submitAccount} disabled={pending} className="mt-2">
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-sm text-text-muted">
                Déjà un compte ?{" "}
                <a href="/login" className="text-gold hover:text-gold-light">
                  Se connecter
                </a>
              </p>
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
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </Field>
                <Field label="Nom" htmlFor="lastName">
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Pays" htmlFor="country">
                <Select
                  id="country"
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Catégorie d'activité" htmlFor="category">
                <Select
                  id="category"
                  value={profile.category}
                  onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nom de l'activité" htmlFor="businessName">
                <Input
                  id="businessName"
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  placeholder="Acme Inc."
                />
              </Field>
              <Button onClick={submitProfile} disabled={pending} className="mt-2">
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-xl font-semibold text-text-primary">Ajoute une courte bio</h1>
                <p className="mt-1 text-sm text-text-secondary">Optionnel — tu pourras toujours l&apos;ajouter plus tard.</p>
              </div>
              <Field label="Bio" htmlFor="bio" hint={`${bio.length}/280`}>
                <Textarea
                  id="bio"
                  rows={4}
                  maxLength={280}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Je construis..."
                />
              </Field>
              <Button onClick={submitBio} disabled={pending} className="mt-2">
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-xl font-semibold text-text-primary">Vérifie tes performances</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Connecte Stripe (mode test) pour vérifier ton activité et apparaître au classement. Tu peux
                  passer cette étape et te connecter plus tard depuis ton tableau de bord.
                </p>
              </div>
              <Button onClick={() => skipOrConnect(true)} disabled={pending}>
                Connecter Stripe (mode test) <ArrowRight className="h-4 w-4" />
              </Button>
              <Button onClick={() => skipOrConnect(false)} disabled={pending} variant="secondary">
                Passer cette étape
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
