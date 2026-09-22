"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { updateMarketingConsentAction, updateEmailNotificationsAction, updateNotificationEmailPrefAction } from "./actions";

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

const GRANULAR_TYPES: { type: string; label: string }[] = [
  { type: "new_message", label: "Nouveau message" },
  { type: "new_follower", label: "Nouvel abonné" },
  { type: "new_application", label: "Nouvelle candidature" },
  { type: "application_status_changed", label: "Statut de mes candidatures" },
  { type: "verification_completed", label: "Vérification de mes revenus" },
  { type: "revenue_review_completed", label: "Déclaration de revenu (validée/refusée)" },
];

export function MarketingConsentToggle({
  initialMarketing,
  initialTransactional,
  initialPrefs,
}: {
  initialMarketing: boolean;
  initialTransactional: boolean;
  initialPrefs: Record<string, boolean>;
}) {
  const [consent, setConsent] = useState(initialMarketing);
  const [transactional, setTransactional] = useState(initialTransactional);
  const [prefs, setPrefs] = useState(initialPrefs);
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

  function togglePref(type: string, checked: boolean) {
    setPrefs((prev) => ({ ...prev, [type]: checked }));
    startTransition(async () => {
      const result = await updateNotificationEmailPrefAction(type, checked);
      if (!result.success) {
        setPrefs((prev) => ({ ...prev, [type]: !checked }));
        toast.show(result.error, "error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ToggleRow checked={transactional} onChange={toggleTransactional} disabled={pending}>
        Recevoir un email pour les événements de mon compte (nouveau message, candidature, vérification...)
      </ToggleRow>

      {transactional && (
        <div className="ml-1 flex flex-col gap-1.5 border-l-2 border-border pl-4">
          {GRANULAR_TYPES.map((g) => (
            <label key={g.type} className="flex items-center gap-2.5 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={prefs[g.type] !== false}
                disabled={pending}
                onChange={(e) => togglePref(g.type, e.target.checked)}
                className="h-3.5 w-3.5 accent-[#f5c451]"
              />
              {g.label}
            </label>
          ))}
        </div>
      )}

      <ToggleRow checked={consent} onChange={toggleMarketing} disabled={pending}>
        Recevoir les actualités et opportunités d&apos;ASCEND par email
      </ToggleRow>
    </div>
  );
}
