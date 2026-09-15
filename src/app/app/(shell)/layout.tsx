import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import { getNotifications, getUnreadCount } from "@/services/notification.service";
import { getUnreadMessageCount } from "@/services/message.service";
import { isCurrentUserAdmin } from "@/services/admin.service";
import { AppShell } from "@/components/layout/AppShell";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");

  const [notifications, unreadCount, isAdmin, unreadMessageCount] = await Promise.all([
    getNotifications(user.id, 8),
    getUnreadCount(user.id),
    isCurrentUserAdmin(),
    getUnreadMessageCount(user.id),
  ]);

  return (
    <AppShell
      username={profile.username}
      avatarUrl={profile.avatarUrl}
      firstName={profile.firstName}
      notifications={notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        readAt: n.readAt,
        metadata: n.metadata,
      }))}
      unreadCount={unreadCount}
      isAdmin={isAdmin}
      unreadMessageCount={unreadMessageCount}
    >
      {children}
    </AppShell>
  );
}
