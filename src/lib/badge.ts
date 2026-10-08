import { getAppUrl } from "@/lib/utils";

// The "Revenus vérifiés par ASCEND" badge members put on their site, their
// Linktree or their e-mail signature: each one is a link back to ASCEND.

export const BADGE_WIDTH = 248;
export const BADGE_HEIGHT = 64;

export function badgeImageUrl(username: string, format: "svg" | "png" = "svg"): string {
  return `${getAppUrl()}/api/badge/${encodeURIComponent(username)}${format === "png" ? "?format=png" : ""}`;
}

export function profileUrl(username: string): string {
  return `${getAppUrl()}/profile/${encodeURIComponent(username)}`;
}

/** Where the badge leads: the profile, tagged so badge traffic shows in the stats. */
export function badgeLinkUrl(username: string): string {
  return `${profileUrl(username)}?utm_source=badge`;
}

export function badgeHtml(username: string): string {
  return `<a href="${badgeLinkUrl(username)}" target="_blank" rel="noopener"><img src="${badgeImageUrl(username)}" alt="Revenus vérifiés par ASCEND" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}"></a>`;
}

export function badgeMarkdown(username: string): string {
  return `[![Revenus vérifiés par ASCEND](${badgeImageUrl(username)})](${badgeLinkUrl(username)})`;
}
