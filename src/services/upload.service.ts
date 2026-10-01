import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { EXTENSIONS, UPLOAD_RULES, megabytes, type UploadKind } from "@/lib/uploads";

// Files go straight from the browser to storage with a one-time signed
// upload: a server action is capped at 1 MB and Vercel refuses requests over
// 4.5 MB, so routing files through the server failed silently above that.

export interface UploadMeta {
  name: string;
  type: string;
  size: number;
}

function checkMeta(kind: UploadKind, meta: UploadMeta) {
  const rule = UPLOAD_RULES[kind];
  if (!rule.types.includes(meta.type)) throw new Error(`Format non supporté (${rule.typesLabel}).`);
  if (!(meta.size > 0)) throw new Error("Le fichier est vide.");
  if (meta.size > rule.maxBytes) throw new Error(`Fichier trop lourd (${megabytes(rule.maxBytes)} maximum).`);
}

/** Callers check who may upload this kind (admin, Pro...) before. */
export async function createUploadTicket(userId: string, kind: UploadKind, meta: UploadMeta) {
  checkMeta(kind, meta);
  const rule = UPLOAD_RULES[kind];
  const path = `${userId}/${randomUUID()}.${EXTENSIONS[meta.type] ?? "bin"}`;
  const { data, error } = await createAdminClient().storage.from(rule.bucket).createSignedUploadUrl(path);
  if (error || !data) throw new Error("L'envoi n'a pas pu démarrer. Réessaie.");
  return { path: data.path, token: data.token };
}

export interface VerifiedUpload {
  path: string;
  size: number;
  contentType: string;
  publicUrl: string | null;
}

/**
 * Checks a file the member says they uploaded: it must be in their own
 * folder and match the rules once stored. A file that doesn't is deleted.
 */
export async function verifyUpload(userId: string, kind: UploadKind, path: string): Promise<VerifiedUpload> {
  const rule = UPLOAD_RULES[kind];
  if (typeof path !== "string" || !path.startsWith(`${userId}/`) || path.includes("..") || path.split("/").length !== 2) {
    throw new Error("Fichier invalide.");
  }
  const bucket = createAdminClient().storage.from(rule.bucket);
  const { data, error } = await bucket.info(path);
  if (error || !data) throw new Error("Fichier introuvable : renvoie-le.");
  const size = Number(data.size ?? 0);
  const contentType = String(data.contentType ?? "");
  try {
    checkMeta(kind, { name: path, type: contentType, size });
  } catch (err) {
    await bucket.remove([path]);
    throw err;
  }
  return { path, size, contentType, publicUrl: rule.publicBucket ? bucket.getPublicUrl(path).data.publicUrl : null };
}

export async function removeUploads(kind: UploadKind, paths: string[]) {
  if (paths.length === 0) return;
  await createAdminClient().storage.from(UPLOAD_RULES[kind].bucket).remove(paths);
}
