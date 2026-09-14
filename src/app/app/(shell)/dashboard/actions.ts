"use server";

import { createClient } from "@/lib/supabase/server";
import { markNotificationRead } from "@/services/notification.service";

export async function markNotificationReadAction(notificationId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await markNotificationRead(userData.user.id, notificationId);
}
