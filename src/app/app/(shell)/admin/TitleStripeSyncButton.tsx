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
      toast.show(
        result.data.created.length > 0
          ? `${result.data.created.length} titre(s) synchronisé(s) avec Stripe.`
          : "Tous les titres ont déjà un prix Stripe.",
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
