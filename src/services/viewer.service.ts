import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/services/subscription.service";
import { isCurrentUserAdmin } from "@/services/admin.service";
import type { SubscriptionTier } from "@/types/database.types";

export interface CurrentViewer {
  userId: string | null;
  tier: SubscriptionTier | null;
  isAdmin: boolean;
}

/** Who is looking at a public page (nobody, a member, an admin), once per request. */
export const getCurrentViewer = cache(async (): Promise<CurrentViewer> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, tier: null, isAdmin: false };
  const [subscription, isAdmin] = await Promise.all([getSubscription(user.id), isCurrentUserAdmin()]);
  return { userId: user.id, tier: subscription.tier, isAdmin };
});
