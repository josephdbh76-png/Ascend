"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { LEGAL } from "@/lib/legal";

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
      <span className="text-sm font-semibold uppercase tracking-wide text-error">Une erreur est survenue</span>
      <h1 className="text-2xl font-semibold text-text-primary">Impossible de charger cette page.</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        Réessaie dans un instant. Si le problème persiste, actualise la page ou reviens plus tard.
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>Réessayer</Button>
        <Button href="/app/dashboard" variant="secondary">
          Tableau de bord
        </Button>
      </div>
      <p className="text-xs text-text-muted">
        Toujours bloqué ? Écris-nous à{" "}
        <a href={`mailto:${LEGAL.contactEmail}`} className="underline hover:text-text-primary">
          {LEGAL.contactEmail}
        </a>
        {error.digest ? ` en indiquant le code ${error.digest}.` : "."}
      </p>
    </div>
  );
}
