import { BUSINESS_CATEGORIES } from "./constants";

export function categoryLabel(value: string): string {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function isKnownCategory(value: string): boolean {
  return BUSINESS_CATEGORIES.some((c) => c.value === value);
}

/** The member's own wording wins over the generic category. */
export function activityLabel(category: string, customCategory?: string | null): string {
  const custom = customCategory?.trim();
  return custom || categoryLabel(category);
}

/**
 * Accepts "monsite.fr" as well as a full URL. Anything that is not a plain
 * http(s) address comes back as null, so it is also used before rendering a
 * link: the column can be written directly through the API.
 */
export function normalizeWebsite(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function websiteHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "de Maison Lumière", "d'Ascend": French elision before a vowel or a mute h. */
export function ofName(name: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(name.trim()) ? `d'${name.trim()}` : `de ${name.trim()}`;
}
