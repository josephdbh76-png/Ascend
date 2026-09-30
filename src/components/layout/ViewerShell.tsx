import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import { getNotifications, getUnreadCount } from "@/services/notification.service";
import { getUnreadMessageCount } from "@/services/message.service";
import { isCurrentUserAdmin } from "@/services/admin.service";
import { AppShell } from "./AppShell";
import { PublicNav } from "./PublicNav";
import { Footer } from "./Footer";

/**
 * For public pages that members browse too (formations): the app shell
 * when signed in, the public header and footer otherwise.
 */
export async function ViewerShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel !== aal.nextLevel) redirect("/mfa-challenge");
  }

  const profile = user ? await getProfile(user.id) : null;
  if (!user || !profile) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-primary">
        <PublicNav />
        <main id="main-content" className="flex-1">
          <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">{children}</div>
        </main>
        <Footer />
      </div>
    );
  }

  const [notifications, unreadCount, isAdmin, unreadMessages] = await Promise.all([
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
      unreadMessageCount={unreadMessages}
    >
      {children}
    </AppShell>
  );
}
