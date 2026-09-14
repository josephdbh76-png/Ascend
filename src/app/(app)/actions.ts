"use server";

import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/services/notification.service";

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await markAllNotificationsRead(userData.user.id);
}
