import { clanColor } from "@/lib/clans";

/** Both leagues' score day after day: two lines on the same scale. */
export function WarChart({ days, colorA, colorB }: { days: { day: string; a: number; b: number }[]; colorA: string; colorB: string }) {
  if (days.length < 2) return null;
  const W = 600;
  const H = 120;
  const max = Math.max(10, ...days.flatMap((d) => [d.a, d.b])) * 1.1;
  const x = (i: number) => (i / (days.length - 1)) * (W - 16) + 8;
  const y = (v: number) => H - 8 - (v / max) * (H - 16);
  const line = (k: "a" | "b") => days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(" ");
  const a = clanColor(colorA).from;
  const b = clanColor(colorB).from;
  const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return (
    <figure className="mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" preserveAspectRatio="none" role="img" aria-label="Évolution du score jour après jour">
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} stroke="currentColor" strokeOpacity="0.08" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={line("b")} fill="none" stroke={b} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.9" />
        <path d={line("a")} fill="none" stroke={a} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] text-text-muted">
        <span>{fmt(days[0].day)}</span>
        <span>{fmt(days[days.length - 1].day)}</span>
      </figcaption>
    </figure>
  );
}
