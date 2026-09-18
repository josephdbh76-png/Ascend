"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Trophy, Flag, User, Menu, X, Gem, Users, Compass, MessageCircle, Settings, LogOut, ShieldCheck, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell, type NotificationItem } from "./NotificationBell";

const TABS = [
  { href: "/app/dashboard", label: "Accueil", icon: LayoutGrid },
  { href: "/app/leaderboard", label: "Classement", icon: Trophy },
  { href: "/app/challenges", label: "Défis", icon: Flag },
];

const MENU_LINKS = [
  { href: "/app/analytics", label: "Analyses", icon: LineChart },
  { href: "/app/titles", label: "Titres", icon: Gem },
  { href: "/app/network", label: "Réseau", icon: Users },
  { href: "/app/messages", label: "Messages", icon: MessageCircle },
  { href: "/app/opportunities", label: "Opportunités", icon: Compass },
  { href: "/app/settings", label: "Réglages", icon: Settings },
];

export function AppMobileHeader({
  notifications,
  unreadCount,
  isAdmin,
  unreadMessageCount = 0,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  isAdmin?: boolean;
  unreadMessageCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuLinks = isAdmin
    ? [...MENU_LINKS, { href: "/app/admin", label: "Administration", icon: ShieldCheck }]
    : MENU_LINKS;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg-primary/95 px-4 backdrop-blur lg:hidden">
        <Link href="/app/dashboard" className="font-display text-lg font-medium tracking-tight text-text-primary">
          ASCEND
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell initial={notifications} unreadCount={unreadCount} />
          <button
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            className="relative rounded-md p-2 text-text-secondary"
          >
            <Menu className="h-5 w-5" />
            {unreadMessageCount > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold" />
            )}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-bg-primary lg:hidden">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <span className="font-display text-lg font-medium tracking-tight text-text-primary">ASCEND</span>
            <button onClick={() => setOpen(false)} aria-label="Fermer le menu" className="rounded-md p-2 text-text-secondary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col divide-y divide-border p-4">
            {menuLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 py-3.5 text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.href === "/app/messages" && unreadMessageCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 font-mono text-[10px] font-bold text-[#0a0a0a]">
                    {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                  </span>
                )}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 py-3.5 text-left text-sm font-medium text-error"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </nav>
        </div>
      )}
    </>
  );
}

export function AppBottomNav({ username }: { username: string }) {
  const pathname = usePathname();
  const items = [...TABS, { href: `/profile/${username}`, label: "Profil", icon: User }];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border bg-bg-secondary/95 backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 font-mono text-[10px] font-medium uppercase tracking-wide",
              active ? "text-gold" : "text-text-muted",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
