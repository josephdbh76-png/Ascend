"use client";

import { Button } from "@/components/ui/Button";
import { clearConsent } from "@/lib/consent";

export function ManageCookiesButton() {
  function reset() {
    clearConsent();
    window.location.reload();
  }

  return (
    <Button variant="secondary" size="sm" onClick={reset} className="self-start">
      Modifier mes préférences de cookies
    </Button>
  );
}
