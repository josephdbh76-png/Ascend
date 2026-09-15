"use server";

import { revalidatePath } from "next/cache";
import { isCurrentUserAdmin, adminSetTier, adminSetIsAdmin } from "@/services/admin.service";
import type { ActionResult } from "@/app/(auth)/actions";
import type { SubscriptionTier } from "@/types/database.types";

const TIERS: SubscriptionTier[] = ["free", "pro", "elite"];

export async function adminSetTierAction(targetUserId: string, tier: SubscriptionTier): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!TIERS.includes(tier)) return { success: false, error: "Formule invalide." };

  try {
    await adminSetTier(targetUserId, tier);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin");
  return { success: true, data: undefined };
}

export async function adminSetIsAdminAction(targetUserId: string, isAdmin: boolean): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };

  try {
    await adminSetIsAdmin(targetUserId, isAdmin);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin");
  return { success: true, data: undefined };
}
