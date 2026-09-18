"use client";

import { useState, useTransition } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { requestPasswordResetAction } from "../actions";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordResetAction(email);
      if (!result.success) return setError(result.error);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="animate-fade-up border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-gold/30 bg-gold/10">
          <MailCheck className="h-6 w-6 text-gold" />
        </div>
        <h1 className="font-display text-xl font-medium text-text-primary">Vérifie ta boîte mail</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Si un compte existe pour {email}, un lien de réinitialisation vient de partir.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="animate-fade-up flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary">Réinitialise ton mot de passe</h1>
        <p className="mt-1 text-sm text-text-secondary">Nous t&apos;enverrons un lien par e-mail.</p>
      </div>
      {error && (
        <div className="border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}
      <Field label="E-mail" htmlFor="email">
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Button type="submit" disabled={pending}>
        Envoyer le lien <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
