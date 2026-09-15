"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Trophy, Flag, Gem, Users, Compass, MessageCircle, Settings, LogOut, ShieldCheck } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell, type NotificationItem } from "./NotificationBell";

const NAV = [
  { href: "/app/dashboard", label: "Vue d'ensemble", icon: LayoutGrid },
  { href: "/app/leaderboard", label: "Classement", icon: Trophy },
  { href: "/app/challenges", label: "Défis", icon: Flag },
  { href: "/app/titles", label: "Titres", icon: Gem },
  { href: "/app/network", label: "Réseau", icon: Users },
  { href: "/app/messages", label: "Messages", icon: MessageCircle },
  { href: "/app/opportunities", label: "Opportunités", icon: Compass },
];

export function AppSidebar({
  username,
  avatarUrl,
  firstName,
  notifications,
  unreadCount,
  isAdmin,
  unreadMessageCount = 0,
}: {
  username: string;
  avatarUrl: string | null;
  firstName: string | null;
  notifications: NotificationItem[];
  unreadCount: number;
  isAdmin?: boolean;
  unreadMessageCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = isAdmin ? [...NAV, { href: "/app/admin", label: "Administration", icon: ShieldCheck }] : NAV;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-bg-secondary lg:flex">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/app/dashboard" className="text-base font-semibold tracking-tight text-text-primary">
          ASCEND
        </Link>
        <NotificationBell initial={notifications} unreadCount={unreadCount} align="left" />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-card-elevated text-gold" : "text-text-secondary hover:bg-card hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.href === "/app/messages" && unreadMessageCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-[#0a0a0a]">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <Link
          href="/app/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/app/settings")
              ? "bg-card-elevated text-gold"
              : "text-text-secondary hover:bg-card hover:text-text-primary",
          )}
        >
          <Settings className="h-4 w-4" />
          Réglages
        </Link>
        <div className="mt-1 flex items-center gap-2 rounded-md px-3 py-2">
          <Link href={`/profile/${username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
            <Avatar avatarUrl={avatarUrl} firstName={firstName} username={username} />
            <span className="truncate text-sm font-medium text-text-secondary hover:text-text-primary">
              {firstName ?? username}
            </span>
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Se déconnecter"
            className="shrink-0 rounded-sm p-1.5 text-text-muted hover:text-error"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Avatar({
  avatarUrl,
  firstName,
  username,
}: {
  avatarUrl: string | null;
  firstName: string | null;
  username: string;
}) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={username} className="h-7 w-7 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card-elevated text-[11px] font-semibold text-gold">
      {initials(firstName, username.slice(1))}
    </span>
  );
}
