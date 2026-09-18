import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendFromAddress } from "@/lib/resend";
import { renderEmailHtml } from "@/lib/emailRender";
import { getAppUrl } from "@/lib/utils";
import type { CampaignAudience, CampaignHistoryRow, EmailTemplateRow } from "@/lib/emailCampaignDisplay";

interface Recipient {
  id: string;
  email: string;
  firstName: string | null;
  unsubscribeToken: string;
}

/**
 * profiles carries no email column (that lives on auth.users) — the admin
 * API is the only way to resolve it in bulk, since Supabase doesn't expose
 * a join between the auth and public schemas through the query builder.
 * Paginates through every user once and keeps only the ones asked for.
 */
async function getEmailsByUserIds(ids: Set<string>): Promise<Map<string, string>> {
  const admin = createAdminClient();
  const emailById = new Map<string, string>();
  let page = 1;
  const perPage = 1000;
  while (emailById.size < ids.size) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      if (ids.has(u.id) && u.email) emailById.set(u.id, u.email);
    }
    if (data.users.length < perPage) break; // last page
    page++;
  }
  return emailById;
}

async function getConsentingProfileIds(audience: CampaignAudience): Promise<
  { id: string; firstName: string | null; unsubscribeToken: string }[]
> {
  const admin = createAdminClient();

  if (audience === "all" || audience === "verified") {
    let query = admin.from("profiles").select("id, first_name, unsubscribe_token").eq("marketing_consent", true);
    if (audience === "verified") query = query.eq("revenue_verified", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({ id: p.id, firstName: p.first_name, unsubscribeToken: p.unsubscribe_token }));
  }

  // free/pro/elite: join through subscriptions, since tier isn't on profiles.
  const { data: subs, error } = await admin.from("subscriptions").select("user_id, tier").eq("tier", audience);
  if (error) throw new Error(error.message);
  const tierUserIds = (subs ?? []).map((s) => s.user_id);
  if (audience !== "free" && tierUserIds.length === 0) return [];

  if (audience === "free") {
    // "Free" also covers members with no subscriptions row at all — fetch
    // everyone consenting, then drop anyone with a paid tier row.
    const { data: allConsenting } = await admin
      .from("profiles")
      .select("id, first_name, unsubscribe_token")
      .eq("marketing_consent", true);
    const { data: paidSubs } = await admin.from("subscriptions").select("user_id").neq("tier", "free");
    const paidIds = new Set((paidSubs ?? []).map((s) => s.user_id));
    return (allConsenting ?? [])
      .filter((p) => !paidIds.has(p.id))
      .map((p) => ({ id: p.id, firstName: p.first_name, unsubscribeToken: p.unsubscribe_token }));
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, first_name, unsubscribe_token")
    .in("id", tierUserIds)
    .eq("marketing_consent", true);
  if (profilesError) throw new Error(profilesError.message);
  return (profiles ?? []).map((p) => ({ id: p.id, firstName: p.first_name, unsubscribeToken: p.unsubscribe_token }));
}

async function resolveRecipients(audience: CampaignAudience): Promise<Recipient[]> {
  const profiles = await getConsentingProfileIds(audience);
  if (profiles.length === 0) return [];
  const emailById = await getEmailsByUserIds(new Set(profiles.map((p) => p.id)));
  return profiles
    .filter((p) => emailById.has(p.id))
    .map((p) => ({ id: p.id, email: emailById.get(p.id)!, firstName: p.firstName, unsubscribeToken: p.unsubscribeToken }));
}

export async function getAudienceCount(audience: CampaignAudience): Promise<number> {
  const recipients = await resolveRecipients(audience);
  return recipients.length;
}

/** Sends a preview to a single admin-chosen address — never counted as a campaign, never requires marketing_consent. */
export async function sendCampaignPreview(toEmail: string, subject: string, body: string) {
  const resend = getResend();
  const unsubscribeUrl = `${getAppUrl()}/api/email/unsubscribe?token=preview`;
  await resend.emails.send({
    from: resendFromAddress(),
    to: toEmail,
    subject: `[Aperçu] ${subject}`,
    html: renderEmailHtml(body, { unsubscribeUrl }),
  });
}

const SEND_BATCH_SIZE = 20;

export async function sendCampaign(input: {
  subject: string;
  body: string;
  audience: CampaignAudience;
  sentByUserId: string;
}): Promise<{ recipientCount: number }> {
  const recipients = await resolveRecipients(input.audience);
  const resend = getResend();
  const appUrl = getAppUrl();

  for (let i = 0; i < recipients.length; i += SEND_BATCH_SIZE) {
    const batch = recipients.slice(i, i + SEND_BATCH_SIZE);
    await Promise.all(
      batch.map((r) =>
        resend.emails.send({
          from: resendFromAddress(),
          to: r.email,
          subject: input.subject,
          html: renderEmailHtml(input.body, {
            unsubscribeUrl: `${appUrl}/api/email/unsubscribe?token=${r.unsubscribeToken}`,
          }),
        }),
      ),
    );
  }

  const supabase = await createClient();
  await supabase.from("email_campaigns").insert({
    subject: input.subject,
    body: input.body,
    audience: input.audience,
    recipient_count: recipients.length,
    sent_by: input.sentByUserId,
  });

  return { recipientCount: recipients.length };
}

export async function getCampaignHistory(): Promise<CampaignHistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("id, subject, audience, recipient_count, sent_at")
    .order("sent_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    subject: c.subject,
    audience: c.audience as CampaignAudience,
    recipientCount: c.recipient_count,
    sentAt: c.sent_at,
  }));
}

export async function listEmailTemplates(): Promise<EmailTemplateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("id, name, subject, body")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveEmailTemplate(input: { name: string; subject: string; body: string; createdBy: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").insert({
    name: input.name,
    subject: input.subject,
    body: input.body,
    created_by: input.createdBy,
  });
  if (error) throw new Error(error.message);
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Public — reachable from an email client with no session. Returns true only if a real, matching token was found and cleared. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ marketing_consent: false })
    .eq("unsubscribe_token", token)
    .select("id")
    .maybeSingle();
  return !error && !!data;
}
