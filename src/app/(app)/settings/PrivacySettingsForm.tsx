"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Minus } from "lucide-react";
import { cn, formatCurrencyRange } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { updatePrivacyAction } from "./actions";
import type { RevenueVisibility } from "@/types/database.types";

const OPTIONS: { value: RevenueVisibility; label: string; description: string; icon: typeof Eye; preview: string }[] = [
  {
    value: "exact",
    label: "Exact",
    description: "Show your precise monthly revenue.",
    icon: Eye,
    preview: "€24,820 / month",
  },
  {
    value: "range",
    label: "Range",
    description: "Show a €1M-wide range instead of the exact figure.",
    icon: Minus,
    preview: formatCurrencyRange(2000000, 3000000),
  },
  {
    value: "private",
    label: "Private",
    description: "Never expose your revenue. Rank still shows.",
    icon: EyeOff,
    preview: "Hidden",
  },
];

export function PrivacySettingsForm({
  initial,
}: {
  initial: { revenueVisibility: RevenueVisibility; showCountry: boolean };
}) {
  const [visibility, setVisibility] = useState(initial.revenueVisibility);
  const [showCountry, setShowCountry] = useState(initial.showCountry);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function save(next: { revenueVisibility: RevenueVisibility; showCountry: boolean }) {
    startTransition(async () => {
      const result = await updatePrivacyAction(next);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Privacy settings updated.", "success");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = visibility === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setVisibility(opt.value);
                save({ revenueVisibility: opt.value, showCountry });
              }}
              disabled={pending}
              className={cn(
                "flex flex-col gap-2 rounded-md border p-4 text-left transition-colors",
                active ? "border-gold/50 bg-gold/5" : "border-border-strong bg-card-elevated hover:border-border-strong/80",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-gold" : "text-text-muted")} />
              <span className={cn("text-sm font-medium", active ? "text-gold" : "text-text-primary")}>
                {opt.label}
              </span>
              <span className="text-xs text-text-secondary">{opt.description}</span>
              <span className="mt-1 text-xs font-medium tabular-nums text-text-muted">{opt.preview}</span>
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-3 rounded-md border border-border-strong bg-card-elevated p-4 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={showCountry}
          onChange={(e) => {
            setShowCountry(e.target.checked);
            save({ revenueVisibility: visibility, showCountry: e.target.checked });
          }}
          className="h-4 w-4 accent-[#f5c451]"
        />
        Show my country on my public profile
      </label>
    </div>
  );
}
