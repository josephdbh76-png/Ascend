import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export const FOUNDING_MEMBER_SLOTS = 500;

/** Counted from real members (not the stored counter, which tests and deleted accounts used to skew). */
export const getFoundingSpotsLeft = cache(async (): Promise<number | null> => {
  const { count, error } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("founding_member_number", "is", null)
    .eq("is_demo", false);
  if (error || count == null) return null;
  return Math.max(0, FOUNDING_MEMBER_SLOTS - count);
});
