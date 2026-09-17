"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { opportunitySchema, opportunityApplicationSchema } from "@/lib/validations";
import { getSubscription, hasEliteAccess } from "@/services/subscription.service";
import {
  createOpportunity,
  closeOpportunity,
  applyToOpportunity,
  updateApplicationStatus,
  type CreateOpportunityInput,
} from "@/services/opportunity.service";
import type { ActionResult } from "@/app/(auth)/actions";
import type { ApplicationStatus } from "@/types/database.types";

export async function createOpportunityAction(input: CreateOpportunityInput): Promise<ActionResult> {
  const parsed = opportunitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const subscription = await getSubscription(userData.user.id);
  if (!hasEliteAccess(subscription.tier)) {
    return { success: false, error: "Publier une opportunité est réservé aux membres Elite." };
  }

  try {
    await createOpportunity(userData.user.id, parsed.data);
    revalidatePath("/app/opportunities");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function closeOpportunityAction(opportunityId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await closeOpportunity(userData.user.id, opportunityId);
    revalidatePath("/app/opportunities");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function applyToOpportunityAction(opportunityId: string, message: string): Promise<ActionResult> {
  const parsed = opportunityApplicationSchema.safeParse({ message });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Message invalide." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  const subscription = await getSubscription(userData.user.id);
  if (!hasEliteAccess(subscription.tier)) {
    return { success: false, error: "Postuler aux opportunités est réservé aux membres Elite." };
  }

  try {
    await applyToOpportunity(userData.user.id, opportunityId, parsed.data.message);
    revalidatePath("/app/opportunities");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function updateApplicationStatusAction(
  applicationId: string,
  status: Extract<ApplicationStatus, "viewed" | "accepted" | "declined">,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };

  try {
    await updateApplicationStatus(userData.user.id, applicationId, status);
    revalidatePath("/app/opportunities");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}
