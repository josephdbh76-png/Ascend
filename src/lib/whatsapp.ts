// WhatsApp numbers and invite links for the Elite community. Client-safe:
// the form checks the number the same way the server does.

/** "+33612345678" from "06 12 34 56 78", "0033 6…" or "+33 6…"; null when not a phone number. */
export function normalizeWhatsappNumber(raw: string): string | null {
  let n = raw.trim().replace(/[\s.\-()]/g, "");
  if (n.startsWith("00")) n = `+${n.slice(2)}`;
  if (/^0[1-9]\d{8}$/.test(n)) n = `+33${n.slice(1)}`; // French national format
  n = n.replace(/^\+330(\d{9})$/, "+33$1"); // "+33 06…": the 0 typed twice
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null;
}

/** "+33 6 12 34 56 78": the way WhatsApp shows it in a join request. */
export function formatWhatsappNumber(e164: string): string {
  const fr = e164.match(/^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return fr ? `+33 ${fr.slice(1).join(" ")}` : e164;
}

/** A community or group invite link: https://chat.whatsapp.com/… */
export function isWhatsappInviteUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && u.hostname === "chat.whatsapp.com" && u.pathname.length > 1;
  } catch {
    return false;
  }
}
