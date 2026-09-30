"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { ShareCardModal } from "@/components/achievements/ShareCardModal";
import type { ShareTarget } from "@/lib/share/params";

export function ShareCardButton({
  target,
  itemName,
  label = "Partager",
  zIndexClassName,
}: {
  target: ShareTarget;
  itemName: string;
  label?: string;
  zIndexClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold transition-colors hover:border-gold/60 hover:bg-gold/20"
      >
        <Share2 className="h-3.5 w-3.5" />
        {label}
      </button>
      <ShareCardModal
        open={open}
        onClose={() => setOpen(false)}
        target={target}
        itemName={itemName}
        zIndexClassName={zIndexClassName}
      />
    </>
  );
}
