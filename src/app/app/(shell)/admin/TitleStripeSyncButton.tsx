"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { adminSyncTitleStripeProductsAction } from "./actions";

export function TitleStripeSyncButton() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function sync() {
    startTransition(async () => {
      const result = await adminSyncTitleStripeProductsAction();
      if (!result.success) return toast.show(result.error, "error");
      const { created, updated } = result.data;
      toast.show(
        created.length + updated.length > 0
          ? [created.length && `${created.length} titre(s) créé(s)`, updated.length && `${updated.length} prix mis à jour`]
              .filter(Boolean)
              .join(", ") + " dans Stripe."
          : "Tous les titres ont déjà le bon prix dans Stripe.",
        "success",
      );
    });
  }

  return (
    <Button variant="secondary" size="sm" onClick={sync} disabled={pending} className="shrink-0">
      <RefreshCw className="h-3.5 w-3.5" /> Synchroniser les titres avec Stripe
    </Button>
  );
}
