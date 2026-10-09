import { BadgeCheck, Lock, Shield, Swords, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCESS_LABELS, ROLE_LABELS, clanColor } from "@/lib/clans";
import type { ClanSummary } from "@/services/clan.service";
import type { ClanRole } from "@/types/database.types";
import { ClanEmblem } from "./ClanEmblem";

/** A league's banner: crest, name, motto, and where it stands. */
export function ClanHero({ clan, rank, role, children }: { clan: ClanSummary; rank: number; role?: ClanRole | null; children?: React.ReactNode }) {
  const c = clanColor(clan.color);
  const wars = clan.warsWon + clan.warsLost + clan.warsDrawn;
  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(80% 140% at 0% 0%, ${c.to}55, transparent 60%)` }} />
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 opacity-[0.07]">
        <ClanEmblem emblem={clan.emblem} color={clan.color} size={220} />
      </div>
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
        <ClanEmblem emblem={clan.emblem} color={clan.color} size={88} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">{clan.name}</h1>
            {clan.isPartner && (
              <span className="flex items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
                <BadgeCheck className="h-3 w-3" /> Partenaire
              </span>
            )}
            {role && (
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", role === "leader" ? "border-gold/50 text-gold" : "border-border-strong text-text-secondary")}>
                {ROLE_LABELS[role]}
              </span>
            )}
          </div>
          {clan.tagline && <p className="mt-1 text-sm text-text-secondary">{clan.tagline}</p>}
          <dl className="mt-4 flex flex-wrap gap-2">
            <Chip icon={<Trophy className="h-3.5 w-3.5 text-gold" />} label="Trophées" value={`${clan.trophies}`} extra={`#${rank}`} />
            <Chip icon={<Swords className="h-3.5 w-3.5 text-text-muted" />} label="Bilan" value={wars ? `${clan.warsWon} V · ${clan.warsLost} D${clan.warsDrawn ? ` · ${clan.warsDrawn} N` : ""}` : "Aucune guerre jouée"} />
            <Chip icon={<Users className="h-3.5 w-3.5 text-text-muted" />} label="Membres" value={`${clan.memberCount}/${clan.maxMembers}`} extra={`${clan.verifiedCount} vérifiés`} />
            <Chip
              icon={clan.access === "open" ? <Shield className="h-3.5 w-3.5 text-text-muted" /> : <Lock className="h-3.5 w-3.5 text-text-muted" />}
              label="Accès"
              value={ACCESS_LABELS[clan.access].label}
            />
          </dl>
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </section>
  );
}

function Chip({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: string; extra?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-bg-primary/60 px-3 py-1.5">
      {icon}
      <dt className="sr-only">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-text-primary">{value}</dd>
      {extra && <span className="text-xs text-text-muted">{extra}</span>}
    </div>
  );
}
