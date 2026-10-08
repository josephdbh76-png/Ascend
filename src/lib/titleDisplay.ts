import { Gem, Medal, Flame, Trophy, Hammer, Settings, Crown, Users, Target, Rocket, Shield, Star, Zap, Award, Swords } from "lucide-react";
import type { TitleRarity } from "@/types/database.types";

export const TITLE_ICONS: Record<string, typeof Gem> = {
  gem: Gem,
  medal: Medal,
  flame: Flame,
  trophy: Trophy,
  hammer: Hammer,
  settings: Settings,
  crown: Crown,
  users: Users,
  target: Target,
  rocket: Rocket,
  shield: Shield,
  star: Star,
  zap: Zap,
  award: Award,
  swords: Swords,
};

/** Icons offered when an admin creates a title or trophy. */
export const PICKABLE_ICONS = ["crown", "trophy", "medal", "gem", "star", "rocket", "flame", "target", "shield", "zap", "users", "hammer", "swords"];

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
