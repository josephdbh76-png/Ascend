"use client";

import { useState, useSyncExternalStore } from "react";
import { FlaskConical, X } from "lucide-react";

function subscribeNothing() {
  return () => {};
}

/** Welcome line of the beta, dismissed once per beta (remembered in this browser). */
export function BetaNotice({ since, contactEmail }: { since: string | null; contactEmail: string }) {
  const key = `ascend_beta_notice_${since ?? "on"}`;
  const storedHidden = useSyncExternalStore(
    subscribeNothing,
    () => {
      try {
        return localStorage.getItem(key) === "hidden";
      } catch {
        return false;
      }
    },
    () => true,
  );
  const [closed, setClosed] = useState(false);
  if (storedHidden || closed) return null;

  function dismiss() {
    setClosed(true);
    try {
      localStorage.setItem(key, "hidden");
    } catch {
      // Not remembered in private browsing: it simply shows again next time.
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3.5">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <p className="flex-1 text-sm text-text-primary">
        <span className="font-semibold">Bienvenue dans la bêta d&apos;ASCEND.</span> Toutes les fonctionnalités Elite te sont
        offertes, et aucun paiement ne passe par l&apos;application jusqu&apos;au lancement officiel. Un bug, une idée ? Écris-nous
        à{" "}
        <a href={`mailto:${contactEmail}`} className="font-medium text-gold hover:underline">
          {contactEmail}
        </a>
        .
      </p>
      <button type="button" onClick={dismiss} aria-label="Masquer" className="rounded-sm p-1 text-text-muted hover:text-text-primary">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
