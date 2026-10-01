"use client";

import { useEffect } from "react";

/**
 * Takes the member straight to what a link points at (/app/settings#bio):
 * scrolls it to the middle of the screen, puts the cursor in it when it's a
 * field, and makes it glow for a moment so it's easy to spot.
 */
export function HashFocus() {
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      // Wait for the page (and any form opened by the link) to be drawn.
      setTimeout(() => {
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el instanceof HTMLButtonElement) {
          el.focus({ preventScroll: true });
        }
        el.animate?.(
          [
            { boxShadow: "0 0 0 3px rgba(245,196,81,0.75)" },
            { boxShadow: "0 0 0 3px rgba(245,196,81,0.75)", offset: 0.6 },
            { boxShadow: "0 0 0 0 rgba(245,196,81,0)" },
          ],
          { duration: 2200, easing: "ease-out" },
        );
      }, 250);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);
  return null;
}
