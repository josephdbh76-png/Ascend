import type { CSSProperties } from "react";
import { BRAND_COLORS, LOGOTYPE, MARK } from "./brandPaths";

// The brand for server-drawn images (icons, link previews, share cards):
// plain <svg> elements, which the image renderer draws as is.

const MARK_ASPECT = 60 / 64;

/** The mark, `height` px tall. */
export function brandMark(height: number, style?: CSSProperties) {
  return (
    <svg width={height * MARK_ASPECT} height={height} viewBox={MARK.viewBox} style={style}>
      <path d={MARK.high} fill={BRAND_COLORS.high} />
      <path d={MARK.mid} fill={BRAND_COLORS.mid} />
      <path d={MARK.low} fill={BRAND_COLORS.low} />
    </svg>
  );
}

/**
 * The logotype (mark as the A, then SCEND), `height` px tall, letters in
 * `color`. `markColor` draws the mark in one colour instead of its golds
 * (on a coloured card, where the three golds would clash).
 */
export function brandLogotype(height: number, color: string, markColor?: string, style?: CSSProperties) {
  return (
    <svg width={height * LOGOTYPE.aspect} height={height} viewBox={LOGOTYPE.viewBox} style={style}>
      <path d={LOGOTYPE.high} fill={markColor ?? BRAND_COLORS.high} />
      <path d={LOGOTYPE.mid} fill={markColor ?? BRAND_COLORS.mid} />
      <path d={LOGOTYPE.low} fill={markColor ?? BRAND_COLORS.low} />
      <path d={LOGOTYPE.letters} fill={color} />
    </svg>
  );
}

/** A square icon: the mark centred on night black, `markShare` of the side tall. */
export function brandIcon(size: number, markShare: number) {
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0b0d" }}>
      {brandMark(size * markShare)}
    </div>
  );
}
