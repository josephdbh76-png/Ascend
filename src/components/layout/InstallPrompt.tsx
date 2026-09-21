"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getStoredConsent } from "@/lib/consent";

const STORAGE_KEY = "ascend_install_prompt_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // localStorage unavailable — fall through and just don't persist dismissal.
    }
    // Deliberately staggered after the cookie banner: two bottom bars
    // fighting for the same space on a small screen is worse than
    // waiting for one decision at a time.
    if (getStoredConsent() === null) return;
    if (isStandalone()) return;

    // Dismissal state lives in localStorage, unreadable during SSR — the
    // banner renders hidden on the server and only reveals itself once
    // mounted client-side, same pattern as CookieBanner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIos()) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore — worst case the banner reappears next visit.
    }
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-[80] border-t border-border-strong bg-card-elevated/95 px-4 py-3.5 backdrop-blur-sm animate-fade-up lg:bottom-0 lg:left-60">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gold/10">
          <Download className="h-4 w-4 text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary">Installer ASCEND</p>
          <p className="text-xs text-text-secondary">
            {deferredPrompt
              ? "Ajoute ASCEND à ton écran d'accueil pour un accès plus rapide."
              : (
                <span className="inline-flex items-center gap-1">
                  Appuie sur <Share className="h-3 w-3" /> puis « Sur l&apos;écran d&apos;accueil ».
                </span>
              )}
          </p>
        </div>
        {deferredPrompt && (
          <Button size="sm" onClick={install} className="shrink-0">
            Installer
          </Button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 rounded-md p-1.5 text-text-muted hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
