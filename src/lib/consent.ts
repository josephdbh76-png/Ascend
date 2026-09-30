"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "ascend_cookie_consent";
const CONSENT_EVENT = "ascend:consent";

// Set when the visitor answers, even if storage is blocked and the choice
// cannot be saved: the rest of the session still treats it as answered.
let answeredThisSession = false;

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
  answeredThisSession = true;
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Ignore — the banner still closes, it just may reappear next visit.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

function subscribeConsent(callback: () => void) {
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}

/** True once the cookie banner has been answered (false on the server). */
export function useConsentAnswered(): boolean {
  return useSyncExternalStore(
    subscribeConsent,
    () => answeredThisSession || getStoredConsent() !== null,
    () => false,
  );
}

export function clearConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — worst case the banner just doesn't reappear.
  }
}
