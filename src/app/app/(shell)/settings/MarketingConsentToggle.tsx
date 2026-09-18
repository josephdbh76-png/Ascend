"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { updateMarketingConsentAction, updateEmailNotificationsAction } from "./actions";

function ToggleRow({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-border-strong bg-card-elevated p-4 text-sm text-text-secondary">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#f5c451]"
      />
      {children}
    </label>
  );
}

export function MarketingConsentToggle({
  initialMarketing,
  initialTransactional,
}: {
  initialMarketing: boolean;
  initialTransactional: boolean;
}) {
  const [consent, setConsent] = useState(initialMarketing);
  const [transactional, setTransactional] = useState(initialTransactional);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggleMarketing(checked: boolean) {
    setConsent(checked);
    startTransition(async () => {
      const result = await updateMarketingConsentAction(checked);
      if (!result.success) {
        setConsent(!checked);
        toast.show(result.error, "error");
      }
    });
  }

  function toggleTransactional(checked: boolean) {
    setTransactional(checked);
    startTransition(async () => {
      const result = await updateEmailNotificationsAction(checked);
      if (!result.success) {
        setTransactional(!checked);
        toast.show(result.error, "error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ToggleRow checked={transactional} onChange={toggleTransactional} disabled={pending}>
        Recevoir un email pour les événements de mon compte (nouveau message, candidature, vérification...)
      </ToggleRow>
      <ToggleRow checked={consent} onChange={toggleMarketing} disabled={pending}>
        Recevoir les actualités et opportunités d&apos;ASCEND par email
      </ToggleRow>
    </div>
  );
}
