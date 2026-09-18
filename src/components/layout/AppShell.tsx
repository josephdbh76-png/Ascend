import { AppSidebar } from "./AppSidebar";
import { AppMobileHeader, AppBottomNav } from "./AppMobileNav";
import type { NotificationItem } from "./NotificationBell";

export function AppShell({
  username,
  avatarUrl,
  firstName,
  notifications,
  unreadCount,
  isAdmin,
  unreadMessageCount,
  children,
}: {
  username: string;
  avatarUrl: string | null;
  firstName: string | null;
  notifications: NotificationItem[];
  unreadCount: number;
  isAdmin?: boolean;
  unreadMessageCount?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <AppSidebar
        username={username}
        avatarUrl={avatarUrl}
        firstName={firstName}
        notifications={notifications}
        unreadCount={unreadCount}
        isAdmin={isAdmin}
        unreadMessageCount={unreadMessageCount}
      />
      <AppMobileHeader
        notifications={notifications}
        unreadCount={unreadCount}
        isAdmin={isAdmin}
        unreadMessageCount={unreadMessageCount}
      />

      <main className="pb-20 lg:ml-60 lg:pb-0">
        <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">{children}</div>
      </main>

      <AppBottomNav username={username} />
    </div>
  );
}
