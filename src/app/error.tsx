"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-primary px-4 text-center">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-error">Une erreur est survenue</span>
      <h1 className="font-display text-2xl font-medium text-text-primary">Impossible de charger cette page.</h1>
      <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
        Réessaie dans un instant. Si le problème persiste, actualise la page ou reviens plus tard.
      </p>
      <Button onClick={reset} className="mt-2">
        Réessayer
      </Button>
    </div>
  );
}
