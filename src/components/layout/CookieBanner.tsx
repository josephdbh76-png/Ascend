"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getStoredConsent, storeConsent } from "@/lib/consent";
import { initAnalytics } from "@/lib/analytics";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (consent === "accepted") {
      initAnalytics();
    } else if (consent === null) {
      // Consent lives in localStorage, unreadable during SSR — the banner
      // must render hidden on the server and only reveal itself once
      // mounted client-side, or hydration would mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, []);

  function accept() {
    storeConsent("accepted");
    initAnalytics();
    setVisible(false);
  }

  function reject() {
    storeConsent("rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-border-strong bg-card-elevated/95 px-4 py-4 backdrop-blur-sm animate-fade-up sm:px-6">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-xs text-text-secondary sm:text-sm">
          ASCEND utilise des cookies strictement nécessaires au fonctionnement du site, et, avec ton accord,
          des cookies d&apos;analyse anonymes pour améliorer le produit.{" "}
          <Link href="/legal/cookies" className="underline hover:text-text-primary">
            En savoir plus
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={reject}>
            Refuser
          </Button>
          <Button size="sm" onClick={accept}>
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
}
