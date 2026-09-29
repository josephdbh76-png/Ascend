/**
 * Full page load instead of a client-side transition. For API routes that
 * redirect off-site (Stripe), which a soft navigation can't follow, and for
 * right after an auth change, where the client router could reuse stale state.
 */
export function hardNavigate(path: string): void {
  window.location.assign(path);
}
