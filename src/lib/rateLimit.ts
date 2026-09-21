import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fails open, deliberately: if the rate-limit check itself errors (DB
 * hiccup, etc.), the caller proceeds rather than locking everyone out of
 * login/signup because of an unrelated outage. This is abuse mitigation,
 * not a security boundary the rest of the app depends on.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  { maxAttempts, windowMinutes }: { maxAttempts: number; windowMinutes: number },
): Promise<{ allowed: boolean }> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { count, error } = await admin
      .from("rate_limit_attempts")
      .select("id", { count: "exact", head: true })
      .eq("identifier", identifier)
      .eq("action", action)
      .gte("created_at", since);
    if (error) throw new Error(error.message);

    if ((count ?? 0) >= maxAttempts) return { allowed: false };

    await admin.from("rate_limit_attempts").insert({ identifier, action });

    // Opportunistic cleanup so the table doesn't grow forever — cheap at
    // this volume, no separate cron needed.
    if (Math.random() < 0.05) {
      const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await admin.from("rate_limit_attempts").delete().lt("created_at", staleCutoff);
    }

    return { allowed: true };
  } catch (err) {
    console.error("checkRateLimit failed, failing open:", err);
    return { allowed: true };
  }
}

/** Best-effort client IP — trusts the platform's edge to set this correctly (Vercel does), not a raw client-supplied header on its own merits. */
export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return hdrs.get("x-real-ip") ?? "unknown";
}
