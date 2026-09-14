"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { loginAction } from "../actions";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginAction({ email, password });
      if (!result.success) return setError(result.error);
      router.push(searchParams.get("next") ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="animate-fade-up flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Ravi de te revoir</h1>
        <p className="mt-1 text-sm text-text-secondary">Connecte-toi pour voir où tu en es.</p>
      </div>

      {error && (
        <div className="rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      <Field label="E-mail" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <div className="flex justify-end">
        <a href="/reset-password" className="text-xs text-text-muted hover:text-text-primary">
          Mot de passe oublié ?
        </a>
      </div>
      <Button type="submit" disabled={pending}>
        Se connecter <ArrowRight className="h-4 w-4" />
      </Button>
      <p className="text-center text-sm text-text-muted">
        Nouveau sur ASCEND ?{" "}
        <a href="/signup" className="text-gold hover:text-gold-light">
          Rejoindre la bêta
        </a>
      </p>
    </form>
  );
}
