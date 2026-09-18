"use client";

import { useState, useTransition } from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENT_THEMES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { updateAccentThemeAction } from "./actions";
import type { AccentTheme } from "@/types/database.types";

export function AccentThemeForm({ initial, locked }: { initial: AccentTheme; locked: boolean }) {
  const [theme, setTheme] = useState(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function select(next: AccentTheme) {
    if (locked || next === theme) return;
    setTheme(next);
    startTransition(async () => {
      const result = await updateAccentThemeAction(next);
      if (!result.success) {
        setTheme(theme);
        return toast.show(result.error, "error");
      }
      toast.show("Couleur d'accent mise à jour.", "success");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Choisis la couleur d&apos;accent affichée sur ton profil public.
      </p>
      <div className={cn("flex flex-wrap gap-3", locked && "opacity-50")}>
        {ACCENT_THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={locked || pending}
              onClick={() => select(t.id)}
              title={t.label}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-150",
                t.swatchClass,
                !locked && "hover:scale-110",
                active && "ring-2 ring-offset-2 ring-offset-card ring-text-primary",
              )}
            >
              {active && <Check className="h-4 w-4 text-[#0a0a0a]" />}
            </button>
          );
        })}
      </div>
      {locked && (
        <div className="flex flex-col items-start gap-2 border border-border-strong bg-card-elevated p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Lock className="h-3.5 w-3.5" /> Réservé aux abonnés Pro et Elite.
          </p>
          <Button href="/app/settings#abonnement" size="sm" variant="secondary" className="shrink-0">
            Débloquer avec Pro
          </Button>
        </div>
      )}
    </div>
  );
}
