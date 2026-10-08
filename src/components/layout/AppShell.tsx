import { AppSidebar } from "./AppSidebar";
import { AppMobileHeader, AppBottomNav } from "./AppMobileNav";
import { AppDataRefresher } from "./AppDataRefresher";
import { InstallPrompt } from "./InstallPrompt";
import type { NotificationItem } from "./NotificationBell";
import { getBetaMode } from "@/services/platform.service";
import { getCommunitySettings } from "@/services/community.service";

export async function AppShell({
  username,
  avatarUrl,
  firstName,
  notifications,
  unreadCount,
  isAdmin,
  isCreator,
  unreadMessageCount,
  children,
}: {
  username: string;
  avatarUrl: string | null;
  firstName: string | null;
  notifications: NotificationItem[];
  unreadCount: number;
  isAdmin?: boolean;
  isCreator?: boolean;
  unreadMessageCount?: number;
  children: React.ReactNode;
}) {
  const [beta, community] = await Promise.all([getBetaMode(), getCommunitySettings()]);
  // Hidden from members until the team opens it; admins keep it to prepare it.
  const showCommunity = community.enabled || !!isAdmin;
  return (
    <div className="min-h-screen bg-bg-primary">
      <AppDataRefresher />
      <AppSidebar
        beta={beta.enabled}
        username={username}
        avatarUrl={avatarUrl}
        firstName={firstName}
        notifications={notifications}
        unreadCount={unreadCount}
        isAdmin={isAdmin}
        isCreator={isCreator}
        unreadMessageCount={unreadMessageCount}
        showCommunity={showCommunity}
      />
      <AppMobileHeader
        beta={beta.enabled}
        notifications={notifications}
        unreadCount={unreadCount}
        isAdmin={isAdmin}
        isCreator={isCreator}
        unreadMessageCount={unreadMessageCount}
        showCommunity={showCommunity}
      />

      <main id="main-content" className="pb-20 lg:ml-60 lg:pb-0">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </main>

      <AppBottomNav username={username} />
      <InstallPrompt />
    </div>
  );
}
