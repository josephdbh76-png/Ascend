import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// API keys members paste in (Shopify, PayPal, Qonto...) are encrypted before
// they reach the database (AES-256-GCM). The key is derived from a server
// secret that never touches the database, so a leaked dump or backup alone
// reveals nothing. CREDENTIALS_ENCRYPTION_KEY wins if set; otherwise the
// Supabase service role key is used (rotating it means members reconnect).

const PREFIX = "enc:v1:";

function key(): Buffer {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Server secret missing for credential encryption.");
  return Buffer.from(hkdfSync("sha256", secret, "ascend-credentials", "provider_credentials:v1", 32));
}

export function encryptSecret(plain: string): string {
  if (!plain) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${PREFIX}${Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url")}`;
}

/** Also reads values stored before encryption existed (returned as is). */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return stored ?? null;
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
