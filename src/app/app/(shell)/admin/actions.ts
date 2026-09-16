"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin, adminSetTier, adminSetIsAdmin } from "@/services/admin.service";
import { syncPurchasableTitleStripeProducts } from "@/services/title.service";
import { approveRevenueDeclaration, rejectRevenueDeclaration } from "@/services/revenue.service";
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

export async function adminSyncTitleStripeProductsAction(): Promise<ActionResult<{ created: string[] }>> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };

  try {
    const result = await syncPurchasableTitleStripeProducts();
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function adminApproveRevenueDeclarationAction(snapshotId: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await approveRevenueDeclaration(snapshotId, userData.user.id);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin");
  return { success: true, data: undefined };
}

export async function adminRejectRevenueDeclarationAction(snapshotId: string, reason: string): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (!reason.trim()) return { success: false, error: "Indique une raison pour le refus." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await rejectRevenueDeclaration(snapshotId, userData.user.id, reason.trim());
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
  revalidatePath("/app/admin");
  return { success: true, data: undefined };
}
