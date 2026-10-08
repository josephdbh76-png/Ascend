"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.show("Impossible de copier. Sélectionne le texte à la main.", "error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.target.select()}
        aria-label={label}
        className="w-full min-w-0 flex-1 rounded-md border border-border-strong bg-card px-3.5 py-2.5 font-mono text-[13px] text-text-primary"
      />
      <button
        type="button"
        onClick={copy}
        aria-label={`Copier : ${label}`}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-3 py-2.5 text-xs font-medium text-gold hover:border-gold/60 hover:bg-gold/20"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}
