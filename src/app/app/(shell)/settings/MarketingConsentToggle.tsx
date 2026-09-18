"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { updateMarketingConsentAction } from "./actions";

export function MarketingConsentToggle({ initial }: { initial: boolean }) {
  const [consent, setConsent] = useState(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggle(checked: boolean) {
    setConsent(checked);
    startTransition(async () => {
      const result = await updateMarketingConsentAction(checked);
      if (!result.success) {
        setConsent(!checked);
        return toast.show(result.error, "error");
      }
    });
  }

  return (
    <label className="flex items-center gap-3 rounded-md border border-border-strong bg-card-elevated p-4 text-sm text-text-secondary">
      <input
        type="checkbox"
        checked={consent}
        disabled={pending}
        onChange={(e) => toggle(e.target.checked)}
        className="h-4 w-4 accent-[#f5c451]"
      />
      Recevoir les actualités et opportunités d&apos;ASCEND par email
    </label>
  );
}
