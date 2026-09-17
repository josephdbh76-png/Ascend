"use server";

import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/services/notification.service";

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await markAllNotificationsRead(userData.user.id);
}

export async function markTutorialSeenAction() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await supabase.from("profiles").update({ has_seen_tutorial: true }).eq("id", userData.user.id);
}
