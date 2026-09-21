import { AppSidebar } from "./AppSidebar";
import { AppMobileHeader, AppBottomNav } from "./AppMobileNav";
import { AppDataRefresher } from "./AppDataRefresher";
import { InstallPrompt } from "./InstallPrompt";
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
      <AppDataRefresher />
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

      <main id="main-content" className="pb-20 lg:ml-60 lg:pb-0">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </main>

      <AppBottomNav username={username} />
      <InstallPrompt />
    </div>
  );
}
