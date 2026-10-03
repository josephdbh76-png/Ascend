import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBetaMode } from "@/services/platform.service";
import { isWhatsappInviteUrl, normalizeWhatsappNumber } from "@/lib/whatsapp";

// The Elite WhatsApp community lives on WhatsApp; ASCEND only decides who
// gets the invite link and keeps the number each member joins with, so the
// team can accept the right join requests and remove whoever stops being
// Elite. Writes use the admin client: the caller checks the plan first.

const SETTINGS_KEY = "whatsapp_community";

export async function getCommunityInviteUrl(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("platform_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  const url = (data?.value as { inviteUrl?: unknown } | null)?.inviteUrl;
  return typeof url === "string" && url ? url : null;
}

export async function setCommunityInviteUrl(url: string, adminUserId: string): Promise<void> {
  const inviteUrl = url.trim();
  if (inviteUrl && !isWhatsappInviteUrl(inviteUrl)) {
    throw new Error("Colle le lien d'invitation WhatsApp, il commence par https://chat.whatsapp.com/");
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_settings")
    .upsert({ key: SETTINGS_KEY, value: { inviteUrl: inviteUrl || null }, updated_at: new Date().toISOString(), updated_by: adminUserId });
  if (error) throw new Error(error.message);
}

export interface MyWhatsappMembership {
  phone: string;
  requestedAt: string;
  addedAt: string | null;
  leaveRequestedAt: string | null;
}

export async function getMyWhatsappMembership(userId: string): Promise<MyWhatsappMembership | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_members")
    .select("phone, requested_at, added_at, leave_requested_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { phone: data.phone, requestedAt: data.requested_at, addedAt: data.added_at, leaveRequestedAt: data.leave_requested_at };
}

/** Saves (or corrects, before the team has let them in) the number a member joins with. */
export async function saveMyWhatsappNumber(userId: string, rawPhone: string): Promise<string> {
  const phone = normalizeWhatsappNumber(rawPhone);
  if (!phone) throw new Error("Numéro invalide. Exemple : 06 12 34 56 78, ou +32 470 12 34 56 hors de France.");

  const admin = createAdminClient();
  const [{ data: existing }, { data: profile }, { data: taken }] = await Promise.all([
    admin.from("whatsapp_members").select("added_at, leave_requested_at").eq("user_id", userId).maybeSingle(),
    admin.from("profiles").select("username, first_name, last_name").eq("id", userId).maybeSingle(),
    admin.from("whatsapp_members").select("id").eq("phone", phone).neq("user_id", userId).limit(1),
  ]);
  if (existing?.added_at && !existing.leave_requested_at) {
    throw new Error("Tu es déjà dans la communauté. Pour changer de numéro, écris-nous sur WhatsApp.");
  }
  if (taken?.length) throw new Error("Ce numéro est déjà utilisé par un autre membre.");

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const displayName = `${name || profile?.username || "Membre"}${profile?.username ? ` (@${profile.username})` : ""}`;
  // A member who had asked to leave and comes back starts a new request.
  const { error } = await admin.from("whatsapp_members").upsert(
    { user_id: userId, display_name: displayName, phone, requested_at: new Date().toISOString(), added_at: null, leave_requested_at: null },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  return phone;
}

/** Not let in yet: the number is simply forgotten. Already in: the team removes them first. */
export async function leaveWhatsappCommunity(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.from("whatsapp_members").select("id, added_at").eq("user_id", userId).maybeSingle();
  if (!data) return;
  const { error } = data.added_at
    ? await admin.from("whatsapp_members").update({ leave_requested_at: new Date().toISOString() }).eq("id", data.id)
    : await admin.from("whatsapp_members").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
}

export interface WhatsappMemberRow {
  id: string;
  displayName: string;
  username: string | null;
  phone: string;
  requestedAt: string;
  addedAt: string | null;
  /** Why the team must remove this number from WhatsApp, if they must. */
  removeReason: "account_deleted" | "not_elite" | "left" | null;
  /** Elite plan right now (Elite for everyone during the beta). */
  isElite: boolean;
}

export async function listWhatsappMembers(): Promise<WhatsappMemberRow[]> {
  const admin = createAdminClient();
  const [{ data: rows, error }, beta] = await Promise.all([
    admin
      .from("whatsapp_members")
      .select("id, user_id, display_name, phone, requested_at, added_at, leave_requested_at, profiles(username)")
      .order("requested_at", { ascending: true }),
    getBetaMode(),
  ]);
  if (error) throw new Error(error.message);

  const userIds = (rows ?? []).map((r) => r.user_id).filter((id): id is string => !!id);
  const { data: subs } = userIds.length
    ? await admin.from("subscriptions").select("user_id, tier").in("user_id", userIds)
    : { data: [] as { user_id: string; tier: string }[] };
  const eliteIds = new Set((subs ?? []).filter((s) => s.tier === "elite").map((s) => s.user_id));

  return (rows ?? []).map((r) => {
    const isElite = !!r.user_id && (beta.enabled || eliteIds.has(r.user_id));
    const removeReason = !r.user_id ? "account_deleted" : r.leave_requested_at ? "left" : !isElite ? "not_elite" : null;
    return {
      id: r.id,
      displayName: r.display_name,
      username: (r.profiles as unknown as { username: string } | null)?.username ?? null,
      phone: r.phone,
      requestedAt: r.requested_at,
      addedAt: r.added_at,
      removeReason,
      isElite,
    };
  });
}

export async function markWhatsappMemberAdded(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("whatsapp_members").update({ added_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Removed from WhatsApp (or a request turned down): nothing of it is kept. */
export async function deleteWhatsappMember(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("whatsapp_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** For the admin tab badge: requests to accept plus numbers to remove. */
export async function countWhatsappTodo(): Promise<number> {
  const rows = await listWhatsappMembers();
  return rows.filter((r) => (r.addedAt ? r.removeReason != null : r.removeReason == null)).length;
}
