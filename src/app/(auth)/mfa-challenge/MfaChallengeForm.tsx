"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function MfaChallengeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw new Error(factorsError.message);
      const factor = factors?.totp.find((f) => f.status === "verified");
      if (!factor) throw new Error("Aucune double authentification active sur ce compte.");

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challengeError || !challenge) throw new Error(challengeError?.message ?? "Erreur inconnue.");

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw new Error("Code invalide.");

      router.push("/app/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="animate-fade-up flex flex-col gap-4">
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
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoFocus
          placeholder="123456"
        />
      </Field>

      <Button type="submit" disabled={pending || code.length !== 6}>
        Vérifier <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
