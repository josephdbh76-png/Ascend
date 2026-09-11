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
      <div className="animate-fade-up rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
          <MailCheck className="h-6 w-6 text-gold" />
        </div>
        <h1 className="text-lg font-semibold text-text-primary">Check your inbox</h1>
        <p className="mt-2 text-sm text-text-secondary">
          If an account exists for {email}, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="animate-fade-up flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Reset your password</h1>
        <p className="mt-1 text-sm text-text-secondary">We&apos;ll email you a reset link.</p>
      </div>
      {error && (
        <div className="rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Button type="submit" disabled={pending}>
        Send reset link <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
