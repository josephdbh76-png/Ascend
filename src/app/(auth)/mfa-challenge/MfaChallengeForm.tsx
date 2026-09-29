"use client";

import { useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function MfaChallengeForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  async function verify(value: string) {
    if (inFlight.current || value.length !== 6) return;
    inFlight.current = true;
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw new Error(factorsError.message);
      const factor = factors?.totp.find((f) => f.status === "verified");
      if (!factor) throw new Error("Aucune double authentification active sur ce compte.");

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: value,
      });
      if (verifyError) throw new Error("Code invalide ou expiré. Saisis le nouveau code affiché.");

      // Hard navigation: the dashboard is heavy to render, and a soft
      // router.push left this page idle (button re-enabled) until it
      // arrived, so people clicked again. Keeping `pending` on until the
      // page unloads makes the wait visible.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/app/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide.");
      setCode("");
      setPending(false);
      inFlight.current = false;
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        verify(code);
      }}
      className="animate-fade-up flex flex-col gap-4"
    >
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Vérification en deux étapes</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Saisis le code à 6 chiffres généré par ton application d&apos;authentification.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      <Field label="Code" htmlFor="code">
        <Input
          id="code"
          value={code}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(next);
            if (next.length === 6) verify(next);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          disabled={pending}
          placeholder="123456"
        />
      </Field>

      <Button type="submit" disabled={pending || code.length !== 6}>
        {pending ? (
          <>
            Vérification… <Loader2 className="h-4 w-4 animate-spin" />
          </>
        ) : (
          <>
            Vérifier <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
