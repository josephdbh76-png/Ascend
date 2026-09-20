"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { ShareCardModal } from "@/components/achievements/ShareCardModal";

export function ShareCardButton({
  title,
  name,
  rank,
  zIndexClassName,
}: {
  title: string;
  name: string;
  rank?: string | null;
  zIndexClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-gold hover:text-gold-light"
      >
        <Share2 className="h-3 w-3" />
        Partager
      </button>
      <ShareCardModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        name={name}
        rank={rank}
        zIndexClassName={zIndexClassName}
      />
    </>
  );
}
