import "server-only";
import { createElement, type ReactElement } from "react";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ICON_NODES } from "./icons";
import { SHARE_FORMATS, STICKER_SIZE, type ShareFormat, type ShareStyle } from "./params";
import type { CardRarity, ShareCardData, ShareCardMember } from "@/services/shareCard.service";

// Drawn by next/og (Satori): flexbox only, every element with several
// children needs display:flex, and helpers are called as plain functions.

type Weight = 400 | 500 | 600 | 800;
type FontEntry = { name: string; data: Buffer; weight: Weight; style: "normal" | "italic" };

let fontsPromise: Promise<FontEntry[]> | null = null;

async function font(file: string, name: string, weight: Weight, style: "normal" | "italic" = "normal"): Promise<FontEntry> {
  return { name, data: await readFile(join(process.cwd(), "assets/fonts", file)), weight, style };
}

export function loadShareFonts(): Promise<FontEntry[]> {
  fontsPromise ??= Promise.all([
    font("Inter-Regular.ttf", "Inter", 400),
    font("Inter-Medium.ttf", "Inter", 500),
    font("Inter-SemiBold.ttf", "Inter", 600),
    font("Inter-ExtraBold.ttf", "Inter", 800),
    font("InstrumentSerif-Regular.ttf", "Serif", 400),
    font("InstrumentSerif-Italic.ttf", "Serif", 400, "italic"),
  ]).catch((err) => {
    fontsPromise = null;
    throw err;
  });
  return fontsPromise;
}

/**
 * Avatars are drawn from our own storage only (the URL is a member-editable
 * column, so arbitrary hosts are never fetched), as an inline data URI.
 */
export async function fetchAvatar(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const storageHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
    if (parsed.protocol !== "https:" || parsed.host !== storageHost) return null;
    const res = await fetch(parsed, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (type !== "image/png" && type !== "image/jpeg") return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > 4_000_000) return null;
    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export interface RenderContext {
  avatar: string | null;
  host: string;
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const GOLD = "#d6a84f";
const IVORY = "#f6f1e7";

const RARITY: Record<CardRarity, { main: string; light: string; deep: string; ink: string; rgb: string }> = {
  common: { main: "#c7c9cf", light: "#eceef2", deep: "#17181c", ink: "#5d6069", rgb: "199,201,207" },
  rare: { main: "#7ea8ff", light: "#d7e4ff", deep: "#0c1630", ink: "#2d5bc2", rgb: "126,168,255" },
  epic: { main: "#b49cff", light: "#e6ddff", deep: "#160e2d", ink: "#6446cf", rgb: "180,156,255" },
  legendary: { main: "#e3b45e", light: "#fbe7bf", deep: "#1c1406", ink: "#94660f", rgb: "227,180,94" },
  exclusive: { main: "#f1d083", light: "#fff2cf", deep: "#211705", ink: "#8a6110", rgb: "241,208,131" },
};

// Three glows per rarity for the Aurore style.
const AURORA: Record<CardRarity, [string, string, string]> = {
  common: ["148,163,184", "99,102,241", "203,213,225"],
  rare: ["59,130,246", "34,211,238", "129,140,248"],
  epic: ["139,92,246", "236,72,153", "99,102,241"],
  legendary: ["227,180,94", "249,115,22", "236,72,153"],
  exclusive: ["241,208,131", "139,92,246", "227,180,94"],
};

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

function icon(name: string, size: number, color: string, strokeWidth = 1.6): ReactElement {
  const nodes = ICON_NODES[name] ?? ICON_NODES.award;
  return createElement(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: color,
      strokeWidth,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    ...nodes.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs })),
  );
}

function logoMark(size: number, color: string): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d="M32 10 L50 48 H40.5 L32 30.5 L23.5 48 H14 Z" fill={color} />
    </svg>
  );
}

function brand(size: number, color: string, markColor = color): ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.45 }}>
      {logoMark(size * 1.25, markColor)}
      <div style={{ display: "flex", fontSize: size, fontWeight: 600, letterSpacing: size * 0.3, color }}>ASCEND</div>
    </div>
  );
}

function avatar(member: ShareCardMember, image: string | null, size: number, ring: string, bg: string, fg: string) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        width={size}
        height={size}
        alt=""
        style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover", border: `3px solid ${ring}` }}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        border: `3px solid ${ring}`,
        color: fg,
        fontSize: size * 0.36,
        fontWeight: 600,
        letterSpacing: 1,
      }}
    >
      {member.initials}
    </div>
  );
}

function headlineSize(text: string, sizes: [number, number, number]): number {
  if (text.length <= 14) return sizes[0];
  if (text.length <= 26) return sizes[1];
  return sizes[2];
}

function chip(text: string, color: string, border: string, size: number): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        padding: `${size * 0.35}px ${size * 0.8}px`,
        borderRadius: 999,
        border: `2px solid ${border}`,
        color,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: size * 0.14,
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
}

function footnote(text: string, size: number, color: string): ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.45, fontSize: size, fontWeight: 500, color }}>
      {icon("sparkles", size * 1.05, color, 1.8)}
      {text}
    </div>
  );
}

function memberSubline(m: ShareCardMember, max: number): string {
  return clip(m.business ? `@${m.username} · ${m.business}` : `@${m.username}`, max);
}

function memberBadges(m: ShareCardMember): string[] {
  const badges: string[] = [];
  if (m.foundingNumber) badges.push(`Membre fondateur n°${String(m.foundingNumber).padStart(3, "0")}`);
  if (m.activeTitle && m.activeTitle !== "Membre fondateur") badges.push(m.activeTitle);
  return badges.slice(0, 2);
}

function profileUrl(ctx: RenderContext, m: ShareCardMember) {
  return `${ctx.host}/profile/${m.username}`;
}

// ---------------------------------------------------------------------------
// Size scales. Stories keep ~200px clear at the top and bottom, where
// Instagram and TikTok draw their own interface.
// ---------------------------------------------------------------------------

const SCALE = {
  story: {
    padTop: 220,
    padBottom: 190,
    padX: 92,
    brand: 30,
    medal: 340,
    icon: 146,
    stat: 400,
    eyebrow: 28,
    headline: [150, 118, 94] as [number, number, number],
    desc: 36,
    descMax: 140,
    gap: 40,
    avatar: 116,
    name: 42,
    sub: 28,
    rank: 62,
    footer: 26,
  },
  square: {
    padTop: 70,
    padBottom: 52,
    padX: 64,
    brand: 22,
    medal: 196,
    icon: 86,
    stat: 230,
    eyebrow: 21,
    headline: [96, 78, 62] as [number, number, number],
    desc: 27,
    descMax: 92,
    gap: 22,
    avatar: 84,
    name: 32,
    sub: 21,
    rank: 46,
    footer: 19,
  },
};

type Scale = (typeof SCALE)["story"];

// ---------------------------------------------------------------------------
// Prestige & Aurore: centered compositions
// ---------------------------------------------------------------------------

type Theme = {
  background: string;
  decor: ReactElement | null;
  text: string;
  muted: string;
  accent: string;
  mark: string;
  headlineFont: "Serif" | "Inter";
  headlineWeight: 400 | 800;
  headlineSpacing: number;
  panel: string;
  panelBorder: string;
  medalOuter: string;
  medalInner: string;
  medalIcon: string;
  statGradient: string;
  chipBorder: string;
  glass: boolean;
};

function prestigeTheme(rarity: CardRarity, format: ShareFormat): Theme {
  const r = RARITY[rarity];
  const { width, height } = SHARE_FORMATS[format];
  const inset = format === "landscape" ? 24 : format === "square" ? 32 : 44;
  return {
    background: `radial-gradient(circle at 50% ${format === "landscape" ? "50%" : "36%"}, rgba(${r.rgb},0.24) 0%, rgba(${r.rgb},0.06) 36%, rgba(10,11,13,0) 62%), linear-gradient(180deg, #0e0f13 0%, #08090b 100%)`,
    decor: (
      <div
        style={{
          position: "absolute",
          top: inset,
          left: inset,
          width: width - inset * 2,
          height: height - inset * 2,
          borderRadius: format === "landscape" ? 22 : 36,
          border: `2px solid rgba(${r.rgb},0.26)`,
          display: "flex",
        }}
      />
    ),
    text: IVORY,
    muted: "#a39d93",
    accent: r.main,
    mark: GOLD,
    headlineFont: "Serif",
    headlineWeight: 400,
    headlineSpacing: -1,
    panel: "rgba(255,255,255,0.035)",
    panelBorder: "rgba(255,255,255,0.08)",
    medalOuter: `linear-gradient(150deg, ${r.light} 0%, ${r.main} 30%, ${r.deep} 62%, ${r.main} 100%)`,
    medalInner: `radial-gradient(circle at 50% 35%, ${r.deep} 0%, #0b0c0f 75%)`,
    medalIcon: r.main,
    statGradient: `linear-gradient(180deg, ${r.light} 10%, ${r.main} 70%, ${r.ink} 110%)`,
    chipBorder: `rgba(${r.rgb},0.45)`,
    glass: false,
  };
}

function auroreTheme(rarity: CardRarity): Theme {
  const [a, b, c] = AURORA[rarity];
  return {
    background: `radial-gradient(circle at 8% 4%, rgba(${a},0.95) 0%, rgba(${a},0) 46%), radial-gradient(circle at 96% 34%, rgba(${b},0.8) 0%, rgba(${b},0) 42%), radial-gradient(circle at 18% 98%, rgba(${c},0.75) 0%, rgba(${c},0) 48%), linear-gradient(160deg, #15111f 0%, #09080e 100%)`,
    decor: null,
    text: "#ffffff",
    muted: "rgba(255,255,255,0.7)",
    accent: "#ffffff",
    mark: "#ffffff",
    headlineFont: "Inter",
    headlineWeight: 800,
    headlineSpacing: -3,
    panel: "rgba(255,255,255,0.08)",
    panelBorder: "rgba(255,255,255,0.16)",
    medalOuter: "linear-gradient(150deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 55%, rgba(255,255,255,0.45) 100%)",
    medalInner: "linear-gradient(160deg, rgba(22,19,33,0.94) 0%, rgba(12,11,19,0.94) 100%)",
    medalIcon: "#ffffff",
    statGradient: `linear-gradient(180deg, #ffffff 25%, rgba(${a},1) 110%)`,
    chipBorder: "rgba(255,255,255,0.38)",
    glass: true,
  };
}

function medallion(d: ShareCardData, t: Theme, size: number, iconSize: number): ReactElement {
  const inner = Math.round(size * 0.88);
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundImage: t.medalOuter,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 ${Math.round(size * 0.08)}px ${Math.round(size * 0.3)}px rgba(0,0,0,0.45)`,
      }}
    >
      <div
        style={{
          display: "flex",
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundImage: t.medalInner,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon(d.icon, iconSize, t.medalIcon, 1.4)}
      </div>
    </div>
  );
}

function bigStat(d: ShareCardData, t: Theme, size: number, align: "center" | "flex-start" = "center"): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align }}>
      <div
        style={{
          display: "flex",
          fontFamily: "Serif",
          fontSize: size,
          lineHeight: 0.9,
          letterSpacing: -size * 0.02,
          backgroundImage: t.statGradient,
          backgroundClip: "text",
          color: "transparent",
          paddingBottom: size * 0.04,
        }}
      >
        {d.bigStat}
      </div>
      {d.statCaption && (
        <div style={{ display: "flex", marginTop: size * 0.04, fontSize: Math.max(18, size * 0.09), fontWeight: 500, color: t.muted }}>
          {d.statCaption}
        </div>
      )}
    </div>
  );
}

function memberPanel(d: ShareCardData, t: Theme, ctx: RenderContext, s: Scale): ReactElement {
  const m = d.member;
  const badges = memberBadges(m);
  const showRank = Boolean(m.globalRank) && d.kind !== "rank";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        gap: s.gap * 0.7,
        padding: `${s.padX * 0.34}px ${s.padX * 0.4}px`,
        borderRadius: s.padX * 0.36,
        background: t.panel,
        border: `2px solid ${t.panelBorder}`,
      }}
    >
      {avatar(m, ctx.avatar, s.avatar, t.glass ? "rgba(255,255,255,0.5)" : t.chipBorder, "#15161a", t.accent)}
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: s.name * 0.3 }}>
          <div style={{ display: "flex", fontSize: s.name, fontWeight: 600, color: t.text }}>{clip(m.name, 24)}</div>
          {m.verified && icon("badge-check", s.name * 0.95, t.glass ? "#ffffff" : GOLD, 2)}
        </div>
        <div style={{ display: "flex", marginTop: 6, fontSize: s.sub, color: t.muted }}>{memberSubline(m, showRank ? 38 : 48)}</div>
        {badges.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginTop: s.sub * 0.6 }}>
            {badges.map((b) => chip(clip(b, 30), t.glass ? "#ffffff" : t.accent, t.chipBorder, s.sub * 0.62))}
          </div>
        )}
      </div>
      {showRank && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: s.rank, fontWeight: 800, color: t.glass ? "#ffffff" : GOLD, letterSpacing: -2 }}>
            {`#${m.globalRank}`}
          </div>
          <div style={{ display: "flex", fontSize: s.sub * 0.72, fontWeight: 600, color: t.muted, letterSpacing: 3, textTransform: "uppercase" }}>
            mondial
          </div>
        </div>
      )}
    </div>
  );
}

function centeredBody(d: ShareCardData, format: "story" | "square", t: Theme): ReactElement {
  const s = SCALE[format];
  const { width } = SHARE_FORMATS[format];
  const headline = clip(d.headline, 60);
  const hSize = headlineSize(headline, s.headline) * (d.bigStat ? 0.6 : 1);
  const showDescription = Boolean(d.description) && (format === "story" || !d.bigStat);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: s.gap * 0.7 }}>
      {d.bigStat ? bigStat(d, t, s.stat) : medallion(d, t, s.medal, s.icon)}
      <div
        style={{
          display: "flex",
          marginTop: s.gap * 0.5,
          fontSize: s.eyebrow,
          fontWeight: 600,
          letterSpacing: s.eyebrow * 0.28,
          textTransform: "uppercase",
          color: t.glass ? "rgba(255,255,255,0.82)" : t.accent,
        }}
      >
        {d.eyebrow}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          textAlign: "center",
          maxWidth: width - s.padX * 2.4,
          fontFamily: t.headlineFont,
          fontWeight: t.headlineWeight,
          fontSize: hSize,
          lineHeight: t.headlineFont === "Serif" ? 1.0 : 1.04,
          letterSpacing: t.headlineSpacing * (hSize / 60),
          color: t.text,
          textWrap: "balance",
        }}
      >
        {headline}
      </div>
      {(d.rarityLabel || d.dateLabel) && (
        <div style={{ display: "flex", alignItems: "center", gap: s.eyebrow * 0.8 }}>
          {d.rarityLabel && chip(d.rarityLabel, t.glass ? "#ffffff" : t.accent, t.chipBorder, s.eyebrow * 0.82)}
          {d.dateLabel && <div style={{ display: "flex", fontSize: s.eyebrow * 0.95, color: t.muted, fontWeight: 500 }}>{d.dateLabel}</div>}
        </div>
      )}
      {showDescription && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            textAlign: "center",
            maxWidth: width - s.padX * 3,
            fontSize: s.desc,
            lineHeight: 1.42,
            color: t.muted,
            textWrap: "balance",
          }}
        >
          {clip(d.description!, s.descMax)}
        </div>
      )}
      {d.footnote && footnote(d.footnote, s.eyebrow * 0.95, t.glass ? "#ffffff" : t.accent)}
    </div>
  );
}

function centered(d: ShareCardData, format: "story" | "square", t: Theme, ctx: RenderContext): ReactElement {
  const s = SCALE[format];
  const { width, height } = SHARE_FORMATS[format];
  const body = centeredBody(d, format, t);
  const panel = memberPanel(d, t, ctx, s);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width,
        height,
        position: "relative",
        padding: `${s.padTop}px ${s.padX}px ${s.padBottom}px`,
        backgroundImage: t.background,
        fontFamily: "Inter",
        color: t.text,
      }}
    >
      {t.decor}
      {brand(s.brand, t.text, t.mark)}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexGrow: 1,
          width: "100%",
          paddingTop: s.gap * 0.6,
          paddingBottom: s.gap * 0.6,
        }}
      >
        {t.glass ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              gap: s.gap * 1.3,
              padding: `${s.padX * 0.7}px ${s.padX * 0.5}px ${s.padX * 0.5}px`,
              borderRadius: s.padX * 0.6,
              background: "rgba(14,12,22,0.52)",
              border: "2px solid rgba(255,255,255,0.18)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.35)",
            }}
          >
            {body}
            {panel}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", flexGrow: 1, width: "100%" }}>
            <div style={{ display: "flex", flexGrow: 1, alignItems: "center", width: "100%" }}>{body}</div>
            {panel}
          </div>
        )}
      </div>
      <div style={{ display: "flex", fontSize: s.footer, color: t.muted, letterSpacing: 1 }}>{profileUrl(ctx, d.member)}</div>
    </div>
  );
}

function horizontal(d: ShareCardData, t: Theme, ctx: RenderContext): ReactElement {
  const { width, height } = SHARE_FORMATS.landscape;
  const m = d.member;
  const headline = clip(d.headline, 52);
  const hSize = headlineSize(headline, [84, 68, 54]) * (d.bigStat ? 0.72 : 1);
  const badges = memberBadges(m);
  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        position: "relative",
        padding: "58px 68px",
        backgroundImage: t.background,
        fontFamily: "Inter",
        color: t.text,
        alignItems: "center",
        gap: 60,
      }}
    >
      {t.decor}
      <div style={{ display: "flex", width: 340, justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
        {d.bigStat ? bigStat(d, t, 230) : medallion(d, t, 290, 128)}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          flexShrink: 1,
          minWidth: 0,
          height: "100%",
          justifyContent: "space-between",
        }}
      >
        {brand(20, t.text, t.mark)}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: t.glass ? "rgba(255,255,255,0.82)" : t.accent,
            }}
          >
            {d.eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: t.headlineFont,
              fontWeight: t.headlineWeight,
              fontSize: hSize,
              lineHeight: 1.0,
              letterSpacing: t.headlineSpacing * (hSize / 60),
              color: t.text,
            }}
          >
            {headline}
          </div>
          {(d.rarityLabel || d.dateLabel || d.footnote) && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {d.rarityLabel && chip(d.rarityLabel, t.glass ? "#ffffff" : t.accent, t.chipBorder, 16)}
              {d.footnote
                ? footnote(d.footnote, 19, t.glass ? "#ffffff" : t.accent)
                : d.dateLabel && <div style={{ display: "flex", fontSize: 19, color: t.muted }}>{d.dateLabel}</div>}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {avatar(m, ctx.avatar, 66, t.glass ? "rgba(255,255,255,0.5)" : t.chipBorder, "#15161a", t.accent)}
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: t.text }}>{clip(m.name, 26)}</div>
              {m.verified && icon("badge-check", 24, t.glass ? "#ffffff" : GOLD, 2)}
            </div>
            <div style={{ display: "flex", fontSize: 18, color: t.muted, marginTop: 2 }}>
              {clip(badges[0] ? `@${m.username} · ${badges[0]}` : memberSubline(m, 48), 52)}
            </div>
          </div>
          {m.globalRank && d.kind !== "rank" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: t.glass ? "#ffffff" : GOLD, letterSpacing: -1 }}>
                {`#${m.globalRank}`}
              </div>
              <div style={{ display: "flex", fontSize: 12, fontWeight: 600, letterSpacing: 3, color: t.muted, textTransform: "uppercase" }}>
                mondial
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ivoire: light, editorial, left-aligned
// ---------------------------------------------------------------------------

function ivoire(d: ShareCardData, format: ShareFormat, ctx: RenderContext): ReactElement {
  const r = RARITY[d.rarity];
  const { width, height } = SHARE_FORMATS[format];
  const land = format === "landscape";
  const story = format === "story";
  const padX = story ? 88 : land ? 60 : 64;
  const padTop = story ? 200 : land ? 48 : 60;
  const padBottom = story ? 180 : land ? 44 : 52;
  const ink = "#141312";
  const soft = "#6f695e";
  const rule = "rgba(20,19,18,0.14)";
  const headline = clip(d.headline, 60);
  const hSize = headlineSize(headline, story ? [176, 138, 104] : land ? [92, 74, 58] : [118, 94, 74]) * (d.bigStat ? 0.5 : 1);
  const statSize = story ? 540 : land ? 240 : 360;
  const m = d.member;
  const seal = story ? 230 : land ? 176 : 170;
  const badges = memberBadges(m);
  const detail = d.bigStat ? d.statCaption : d.description;

  const sealEl = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        width: seal,
        height: seal,
        borderRadius: seal / 2,
        border: `3px solid ${r.ink}`,
        alignItems: "center",
        justifyContent: "center",
        gap: seal * 0.04,
        transform: "rotate(-8deg)",
        background: `radial-gradient(circle at 50% 40%, rgba(${r.rgb},0.24) 0%, rgba(${r.rgb},0) 70%)`,
      }}
    >
      {icon(d.icon, seal * 0.4, r.ink, 1.5)}
      {d.rarityLabel && (
        <div style={{ display: "flex", fontSize: seal * 0.085, fontWeight: 600, letterSpacing: seal * 0.02, color: r.ink, textTransform: "uppercase" }}>
          {d.rarityLabel}
        </div>
      )}
    </div>
  );

  const text = (
    <div style={{ display: "flex", flexDirection: "column", flexGrow: land ? 1 : 0, flexShrink: 1, minWidth: 0, gap: story ? 26 : 14 }}>
      <div style={{ display: "flex", fontFamily: "Serif", fontStyle: "italic", fontSize: story ? 60 : land ? 36 : 42, color: r.ink }}>
        {d.eyebrow}
      </div>
      {d.bigStat && (
        <div style={{ display: "flex", fontFamily: "Serif", fontSize: statSize, lineHeight: 0.84, letterSpacing: -statSize * 0.03, color: ink }}>
          {d.bigStat}
        </div>
      )}
      <div
        style={{
          display: "flex",
          fontFamily: "Serif",
          fontSize: hSize,
          lineHeight: 0.96,
          letterSpacing: -hSize * 0.015,
          color: ink,
          maxWidth: land ? 720 : width - padX * 2,
        }}
      >
        {headline}
      </div>
      {detail && (
        <div
          style={{
            display: "flex",
            marginTop: story ? 6 : 2,
            fontSize: story ? 36 : land ? 21 : 26,
            lineHeight: 1.45,
            color: "#4a463f",
            maxWidth: land ? 660 : width - padX * 2.4,
          }}
        >
          {clip(detail, story ? 140 : 96)}
        </div>
      )}
      {d.footnote && footnote(d.footnote, story ? 28 : land ? 18 : 21, r.ink)}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        padding: `${padTop}px ${padX}px ${padBottom}px`,
        fontFamily: "Inter",
        color: ink,
        backgroundImage: `radial-gradient(circle at 90% 8%, rgba(${r.rgb},0.3) 0%, rgba(${r.rgb},0) 42%), radial-gradient(circle at 0% 100%, rgba(214,168,79,0.16) 0%, rgba(214,168,79,0) 45%), linear-gradient(180deg, #f6f2ea 0%, #eee8dc 100%)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: story ? 30 : 18, borderBottom: `2px solid ${rule}` }}>
        {brand(story ? 26 : 19, ink, ink)}
        <div style={{ display: "flex", fontSize: story ? 26 : 18, color: soft, fontWeight: 500 }}>{d.dateLabel ?? ""}</div>
      </div>

      {land ? (
        <div style={{ display: "flex", flexGrow: 1, alignItems: "center", gap: 40 }}>
          {text}
          {!d.bigStat && sealEl}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", gap: story ? 40 : 18 }}>
          {!d.bigStat && <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: story ? 20 : 8 }}>{sealEl}</div>}
          {text}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: story ? 26 : 16, paddingTop: story ? 32 : 18, borderTop: `2px solid ${rule}` }}>
        {avatar(m, ctx.avatar, story ? 104 : land ? 58 : 74, "rgba(20,19,18,0.18)", "#e7dfcf", r.ink)}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", fontFamily: "Serif", fontSize: story ? 56 : land ? 32 : 40, lineHeight: 1, color: ink }}>{clip(m.name, 26)}</div>
            {m.verified && icon("badge-check", story ? 40 : 26, r.ink, 2)}
          </div>
          <div style={{ display: "flex", marginTop: 6, fontSize: story ? 26 : land ? 16 : 19, color: soft }}>
            {clip(badges[0] ? `@${m.username} · ${badges[0]}` : memberSubline(m, 50), 56)}
          </div>
        </div>
        {m.globalRank && d.kind !== "rank" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontFamily: "Serif", fontSize: story ? 92 : land ? 50 : 62, lineHeight: 1, color: ink }}>{`#${m.globalRank}`}</div>
            <div style={{ display: "flex", fontSize: story ? 20 : 13, letterSpacing: 3, fontWeight: 600, color: soft, textTransform: "uppercase" }}>
              mondial
            </div>
          </div>
        )}
      </div>
      {!land && (
        <div style={{ display: "flex", marginTop: story ? 26 : 16, fontSize: story ? 24 : 17, color: soft, letterSpacing: 1 }}>{profileUrl(ctx, m)}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sticker: tight, transparent around the card, to paste over a photo
// ---------------------------------------------------------------------------

function sticker(d: ShareCardData, ctx: RenderContext): ReactElement {
  const r = RARITY[d.rarity];
  const { width, height } = STICKER_SIZE;
  const headline = clip(d.headline, 40);
  const hSize = headlineSize(headline, [76, 62, 50]);
  const m = d.member;
  const medal = 156;

  return (
    <div style={{ display: "flex", width, height, padding: 22, fontFamily: "Inter" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "38px 44px 32px",
          borderRadius: 46,
          background: "rgba(11,12,15,0.94)",
          border: `3px solid rgba(${r.rgb},0.6)`,
          boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {d.bigStat ? (
            <div
              style={{
                display: "flex",
                fontFamily: "Serif",
                fontSize: 160,
                lineHeight: 0.9,
                backgroundImage: `linear-gradient(180deg, ${r.light} 10%, ${r.main} 80%)`,
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {d.bigStat}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexShrink: 0,
                width: medal,
                height: medal,
                borderRadius: medal / 2,
                alignItems: "center",
                justifyContent: "center",
                backgroundImage: `linear-gradient(150deg, ${r.light} 0%, ${r.main} 35%, ${r.deep} 70%, ${r.main} 100%)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: medal * 0.86,
                  height: medal * 0.86,
                  borderRadius: medal * 0.43,
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#0d0e12",
                }}
              >
                {icon(d.icon, medal * 0.46, r.main, 1.5)}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flexShrink: 1, minWidth: 0, gap: 10 }}>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: 5, textTransform: "uppercase", color: r.main }}>
              {d.eyebrow}
            </div>
            <div style={{ display: "flex", fontSize: hSize, fontWeight: 800, letterSpacing: -hSize * 0.03, lineHeight: 1.02 }}>{headline}</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 22,
            borderTop: "2px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {avatar(m, ctx.avatar, 62, `rgba(${r.rgb},0.6)`, "#17181c", r.main)}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", fontSize: 29, fontWeight: 600 }}>{clip(m.name, 22)}</div>
                {m.verified && icon("badge-check", 27, GOLD, 2)}
              </div>
              <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.6)" }}>{`@${m.username}`}</div>
            </div>
          </div>
          {brand(20, "#ffffff", GOLD)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function renderShareCard(d: ShareCardData, format: ShareFormat, style: ShareStyle, ctx: RenderContext): ReactElement {
  if (style === "sticker") return sticker(d, ctx);
  if (style === "ivoire") return ivoire(d, format, ctx);
  const theme = style === "aurore" ? auroreTheme(d.rarity) : prestigeTheme(d.rarity, format);
  if (format === "landscape") return horizontal(d, theme, ctx);
  return centered(d, format, theme, ctx);
}
