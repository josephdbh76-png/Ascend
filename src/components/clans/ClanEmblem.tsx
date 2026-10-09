import { Crown, Flame, Gem, Mountain, Rocket, Shield, Star, Swords, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { clanColor, isClanColor } from "@/lib/clans";

const ICONS = { shield: Shield, swords: Swords, crown: Crown, flame: Flame, rocket: Rocket, zap: Zap, gem: Gem, target: Target, mountain: Mountain, star: Star };

/** A league's crest: a shield in the league's colors, with its emblem. */
export function ClanEmblem({ emblem, color, size = 48, className }: { emblem: string; color: string; size?: number; className?: string }) {
  const c = clanColor(color);
  const Icon = ICONS[emblem as keyof typeof ICONS] ?? Shield;
  const id = `clan-${isClanColor(color) ? color : "gold"}`;
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size * 1.12 }} aria-hidden>
      <svg viewBox="0 0 100 112" width={size} height={size * 1.12} className="absolute inset-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor={c.from} />
            <stop offset="1" stopColor={c.to} />
          </linearGradient>
          <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M50 3 L93 17 V55 C93 82 74 99 50 109 C26 99 7 82 7 55 V17 Z" fill={`url(#${id}-fill)`} />
        <path d="M50 3 L93 17 V55 C93 82 74 99 50 109 C26 99 7 82 7 55 V17 Z" fill={`url(#${id}-shine)`} />
        <path d="M50 11 L86 23 V55 C86 77 70 92 50 101 C30 92 14 77 14 55 V23 Z" fill="none" stroke="#0a0b0d" strokeOpacity="0.22" strokeWidth="2.5" />
      </svg>
      <Icon className="relative text-[#0a0b0d]/85" style={{ width: size * 0.42, height: size * 0.42, marginTop: -size * 0.04 }} strokeWidth={2.2} />
    </span>
  );
}
