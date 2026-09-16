import { Gem, Medal, Flame, Trophy, Hammer, Settings, Crown } from "lucide-react";
import type { TitleRarity } from "@/types/database.types";

export const TITLE_ICONS: Record<string, typeof Gem> = {
  gem: Gem,
  medal: Medal,
  flame: Flame,
  trophy: Trophy,
  hammer: Hammer,
  settings: Settings,
  crown: Crown,
};

export const TITLE_RARITY_STYLES: Record<TitleRarity, string> = {
  common: "border-border-strong text-text-secondary",
  rare: "border-info/40 text-info",
  epic: "border-exclusive/40 text-exclusive",
  legendary: "border-gold/50 text-gold",
  exclusive: "border-gold/60 text-gold",
};

export const TITLE_RARITY_LABELS: Record<TitleRarity, string> = {
  common: "commun",
  rare: "rare",
  epic: "épique",
  legendary: "légendaire",
  exclusive: "exclusif",
};
