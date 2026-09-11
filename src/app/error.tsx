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
      <span className="text-sm font-semibold uppercase tracking-wide text-error">Something went wrong</span>
      <h1 className="text-2xl font-semibold text-text-primary">We couldn&apos;t load this page.</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        Try again in a moment. If this keeps happening, please refresh or come back later.
      </p>
      <Button onClick={reset} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
