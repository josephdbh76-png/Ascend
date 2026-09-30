// Shared by the share modal (client) and the image route (server).

export const SHARE_KINDS = ["achievement", "title", "trophy", "season", "rank"] as const;
export type ShareKind = (typeof SHARE_KINDS)[number];

export const SHARE_FORMATS = {
  story: { width: 1080, height: 1920, label: "Story", hint: "Instagram, TikTok, WhatsApp" },
  square: { width: 1080, height: 1080, label: "Carré", hint: "Post Instagram, LinkedIn" },
  landscape: { width: 1200, height: 630, label: "Paysage", hint: "LinkedIn, X, Facebook" },
} as const;
export type ShareFormat = keyof typeof SHARE_FORMATS;

export const SHARE_STYLES = {
  prestige: { label: "Prestige", transparent: false },
  ivoire: { label: "Ivoire", transparent: false },
  aurore: { label: "Aurore", transparent: false },
  sticker: { label: "Sticker", transparent: true },
} as const;
export type ShareStyle = keyof typeof SHARE_STYLES;

/** The sticker is cropped tight so it can be pasted over a photo at any size. */
export const STICKER_SIZE = { width: 1000, height: 440 } as const;

export function shareCardSize(format: ShareFormat, style: ShareStyle): { width: number; height: number } {
  return style === "sticker" ? STICKER_SIZE : SHARE_FORMATS[format];
}

export interface ShareTarget {
  kind: ShareKind;
  username: string;
  id?: string | null;
}

export function isShareKind(value: string | null): value is ShareKind {
  return SHARE_KINDS.includes(value as ShareKind);
}

export function isShareFormat(value: string | null): value is ShareFormat {
  return value != null && value in SHARE_FORMATS;
}

export function isShareStyle(value: string | null): value is ShareStyle {
  return value != null && value in SHARE_STYLES;
}

export function seasonShortName(number: number): string {
  return `Saison ${String(number).padStart(2, "0")}`;
}

/** First line of the post; the link is added by the share modal. */
export function shareCaption(kind: ShareKind, itemName: string): string {
  switch (kind) {
    case "achievement":
      return `« ${itemName} » débloqué sur ASCEND.`;
    case "title":
      return `Je porte désormais le titre « ${itemName} » sur ASCEND.`;
    case "trophy":
      return `Trophée « ${itemName} » remporté sur ASCEND.`;
    case "season":
      return `${itemName} sur ASCEND.`;
    case "rank":
      return itemName.startsWith("#") ? `${itemName} au classement ASCEND.` : `${itemName} sur ASCEND.`;
  }
}

/** The PNG itself. */
export function shareCardPath(target: ShareTarget, format: ShareFormat = "story", style: ShareStyle = "prestige"): string {
  const params = new URLSearchParams({ kind: target.kind, u: target.username, format, style });
  if (target.id) params.set("id", target.id);
  return `/api/share/card?${params}`;
}

/** The public profile, with the card as its link preview (LinkedIn, X, WhatsApp...). */
export function sharePagePath(target: ShareTarget): string {
  const params = new URLSearchParams({ partage: target.kind });
  if (target.id) params.set("id", target.id);
  return `/profile/${target.username}?${params}`;
}
