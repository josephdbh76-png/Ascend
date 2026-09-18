import "server-only";
import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured.");
    _resend = new Resend(key);
  }
  return _resend;
}

/**
 * Falls back to Resend's own shared test address so the feature doesn't
 * hard-fail before a custom domain is verified — real campaigns to real
 * members need RESEND_FROM_EMAIL set to a verified sending domain, or
 * Resend will reject anything but the account owner's own inbox.
 */
export function resendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "ASCEND <onboarding@resend.dev>";
}
