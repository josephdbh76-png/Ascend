"use client";

import { createClient } from "@/lib/supabase/client";
import { createUploadTicketAction } from "@/app/app/(shell)/upload-actions";
import { UPLOAD_RULES, megabytes, type UploadKind } from "@/lib/uploads";
import type { ActionResult } from "@/app/(auth)/actions";

const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * Scales a large photo down before sending (a 12 MP phone picture becomes a
 * few hundred KB), lowering quality then size until it fits `maxBytes`.
 * Keeps the original when it's already small, when the browser can't
 * decode it, or when the result wouldn't be lighter.
 */
export async function shrinkImage(file: File, maxSide: number, maxBytes = Infinity): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap === "undefined") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  let side = Math.min(maxSide, Math.max(bitmap.width, bitmap.height));
  if (side === Math.max(bitmap.width, bitmap.height) && file.size <= Math.min(1.5 * 1024 * 1024, maxBytes)) return file;

  const canvas = document.createElement("canvas");
  const encode = async (quality: number) => {
    const scale = side / Math.max(bitmap.width, bitmap.height);
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    // WebP keeps transparency; Safari can't encode it and falls back.
    const webp = await toBlob("image/webp");
    if (webp && webp.type === "image/webp") return webp;
    return toBlob(file.type === "image/png" && quality >= 0.86 ? "image/png" : "image/jpeg");
  };

  let blob: Blob | null = null;
  for (const quality of [0.86, 0.75, 0.62, 0.62, 0.62]) {
    blob = await encode(quality);
    if (!blob || blob.size <= maxBytes) break;
    if (quality === 0.62) side = Math.round(side * 0.75);
  }
  if (!blob || blob.size >= file.size) return file;
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + `.${ext}`, { type: blob.type });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/** Sends one file straight to storage. Never throws: errors come back as text for a toast. */
export async function uploadFile(kind: UploadKind, original: File): Promise<ActionResult<{ path: string; name: string }>> {
  const rule = UPLOAD_RULES[kind];
  try {
    const file = rule.imageMaxSide ? await shrinkImage(original, rule.imageMaxSide, rule.maxBytes * 0.9) : original;
    if (!rule.types.includes(file.type)) return { success: false, error: `« ${original.name} » : format non supporté (${rule.typesLabel}).` };
    if (file.size > rule.maxBytes) return { success: false, error: `« ${original.name} » dépasse ${megabytes(rule.maxBytes)}.` };

    const ticket = await createUploadTicketAction(kind, { name: file.name, type: file.type, size: file.size });
    if (!ticket.success) return ticket;
    const { error } = await withTimeout(
      createClient().storage.from(ticket.data.bucket).uploadToSignedUrl(ticket.data.path, ticket.data.token, file, { contentType: file.type }),
      UPLOAD_TIMEOUT_MS,
    );
    if (error) return { success: false, error: `L'envoi de « ${original.name} » a échoué. Réessaie.` };
    return { success: true, data: { path: ticket.data.path, name: original.name } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error && err.message === "timeout"
          ? "L'envoi prend trop de temps. Vérifie ta connexion et réessaie."
          : `L'envoi de « ${original.name} » a échoué. Réessaie.`,
    };
  }
}

/** Upload, then let a server action check and use the stored file. */
export async function uploadThen<T>(
  kind: UploadKind,
  file: File,
  finalize: (path: string) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const sent = await uploadFile(kind, file);
  if (!sent.success) return sent;
  try {
    return await finalize(sent.data.path);
  } catch {
    return { success: false, error: "L'enregistrement du fichier a échoué. Réessaie." };
  }
}
