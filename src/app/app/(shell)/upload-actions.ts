"use server";

import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/services/admin.service";
import { getSubscription, hasProAccess, hasEliteAccess } from "@/services/subscription.service";
import { createUploadTicket, type UploadMeta } from "@/services/upload.service";
import { UPLOAD_RULES, type UploadKind } from "@/lib/uploads";
import type { ActionResult } from "@/app/(auth)/actions";

/** Signs a one-time upload of one file, after checking the member may send it. */
export async function createUploadTicketAction(
  kind: UploadKind,
  meta: UploadMeta,
): Promise<ActionResult<{ path: string; token: string; bucket: string }>> {
  if (!(kind in UPLOAD_RULES)) return { success: false, error: "Envoi non autorisé." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };
  const userId = userData.user.id;

  if (kind === "admin-media" && !(await isCurrentUserAdmin())) return { success: false, error: "Accès refusé." };
  if (kind === "opportunity-attachment" && !hasProAccess((await getSubscription(userId)).tier)) {
    return { success: false, error: "Postuler aux opportunités est réservé aux membres Pro et Elite." };
  }
  if (kind === "training-cover" && !hasEliteAccess((await getSubscription(userId)).tier) && !(await isCurrentUserAdmin())) {
    return { success: false, error: "Proposer une formation est réservé aux membres Elite." };
  }

  try {
    const ticket = await createUploadTicket(userId, kind, {
      name: String(meta?.name ?? "").slice(0, 200),
      type: String(meta?.type ?? ""),
      size: Number(meta?.size ?? 0),
    });
    return { success: true, data: { ...ticket, bucket: UPLOAD_RULES[kind].bucket } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "L'envoi n'a pas pu démarrer." };
  }
}
