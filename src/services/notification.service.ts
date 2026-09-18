import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendFromAddress } from "@/lib/resend";
import { renderEmailHtml } from "@/lib/emailRender";
import { transactionalEmailContent } from "@/lib/transactionalEmails";
import { getAppUrl } from "@/lib/utils";
import type { NotificationType } from "@/types/database.types";

/**
 * Best-effort — a failed email should never break the in-app notification
 * it rides along with, so every failure is swallowed after being logged.
 * Looks the recipient up by id regardless of which client created the
 * notification, since both createNotification (self) and
 * createNotificationForUser (someone else) need the same recipient
 * lookup — their email and first name live on auth.users/profiles, not on
 * the notification row itself.
 */
async function sendTransactionalEmail(userId: string, type: NotificationType, title: string, body: string) {
  try {
    const admin = createAdminClient();
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from("profiles").select("first_name, email_notifications_enabled").eq("id", userId).maybeSingle(),
    ]);
    const email = authUser?.user?.email;
    if (!email || profile?.email_notifications_enabled === false) return;

    const content = transactionalEmailContent(type, { title, body, firstName: profile?.first_name ?? null });
    if (!content) return;

    const appUrl = getAppUrl();
    await getResend().emails.send({
      from: resendFromAddress(),
      to: email,
      subject: content.subject,
      html: renderEmailHtml(content.body, {
        ctaLabel: content.ctaLabel,
        ctaUrl: content.ctaPath ? `${appUrl}${content.ctaPath}` : undefined,
      }),
    });
  } catch (err) {
    console.error("Transactional email failed:", err);
  }
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    metadata: input.metadata ?? {},
  });
  await sendTransactionalEmail(input.userId, input.type, input.title, input.body);
}

/**
 * Notifies a DIFFERENT user than the one currently authenticated (a new
 * follower, a new message) — RLS only lets a user insert a notification
 * for themselves, so this goes through the service-role client. Safe to
 * call only after the triggering action (the follow, the message) has
 * already been validated through the normal RLS-scoped client.
 */
export async function createNotificationForUser(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    metadata: input.metadata ?? {},
  });
  await sendTransactionalEmail(input.userId, input.type, input.title, input.body);
}

export async function getNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function getLatestUnreadOfType(
  userId: string,
  type: NotificationType,
): Promise<Notification | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    type: data.type,
    title: data.title,
    body: data.body,
    metadata: data.metadata,
    readAt: data.read_at,
    createdAt: data.created_at,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}
