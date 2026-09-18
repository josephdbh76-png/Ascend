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
  type UploadedAttachment,
} from "@/services/opportunity.service";
import type { ActionResult } from "@/app/(auth)/actions";
import type { ApplicationStatus } from "@/types/database.types";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

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

export async function applyToOpportunityAction(opportunityId: string, formData: FormData): Promise<ActionResult> {
  const message = String(formData.get("message") ?? "");
  const parsed = opportunityApplicationSchema.safeParse({ message });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Message invalide." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, error: "Tu n'es pas connecté." };
  const userId = userData.user.id;

  const subscription = await getSubscription(userId);
  if (!hasEliteAccess(subscription.tier)) {
    return { success: false, error: "Postuler aux opportunités est réservé aux membres Elite." };
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_ATTACHMENTS) {
    return { success: false, error: `Maximum ${MAX_ATTACHMENTS} documents par candidature.` };
  }
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_BYTES) return { success: false, error: `« ${file.name} » dépasse 10 Mo.` };
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return { success: false, error: `« ${file.name} » : format non pris en charge (PDF, Word, ou image).` };
    }
  }

  const uploaded: UploadedAttachment[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("opportunity-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return { success: false, error: `Le téléversement de « ${file.name} » a échoué.` };
    uploaded.push({ filePath: path, fileName: file.name, fileSize: file.size, contentType: file.type });
  }

  try {
    await applyToOpportunity(userId, opportunityId, parsed.data.message, uploaded);
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
