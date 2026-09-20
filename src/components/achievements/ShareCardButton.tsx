"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { ShareCardModal } from "@/components/achievements/ShareCardModal";
import type { AchievementRarity } from "@/types/database.types";

export function ShareCardButton({
  title,
  name,
  rank,
  rarity,
  zIndexClassName,
}: {
  title: string;
  name: string;
  rank?: string | null;
  rarity?: AchievementRarity;
  zIndexClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold hover:border-gold/60 hover:bg-gold/20"
      >
        <Share2 className="h-3.5 w-3.5" />
        Partager
      </button>
      <ShareCardModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        name={name}
        rank={rank}
        rarity={rarity}
        zIndexClassName={zIndexClassName}
      />
    </>
  );
}
