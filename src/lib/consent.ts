"use client";

const STORAGE_KEY = "ascend_cookie_consent";

export type ConsentChoice = "accepted" | "rejected";

/** Wrapped in try/catch — localStorage can throw in private browsing or
 * with blocked site data, and consent must never crash the page. */
export function getStoredConsent(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export function storeConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Ignore — the banner still closes, it just may reappear next visit.
  }
}

export function clearConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — worst case the banner just doesn't reappear.
  }
}
