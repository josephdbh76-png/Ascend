"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Trophy, Flag, User, Menu, X, Gem, Users, Compass, Settings, LogOut, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell, type NotificationItem } from "./NotificationBell";

const TABS = [
  { href: "/app/dashboard", label: "Accueil", icon: LayoutGrid },
  { href: "/app/leaderboard", label: "Classement", icon: Trophy },
  { href: "/app/challenges", label: "Défis", icon: Flag },
];

const MENU_LINKS = [
  { href: "/app/titles", label: "Titres", icon: Gem },
  { href: "/app/network", label: "Réseau", icon: Users },
  { href: "/app/opportunities", label: "Opportunités", icon: Compass },
  { href: "/app/settings", label: "Réglages", icon: Settings },
];

export function AppMobileHeader({
  notifications,
  unreadCount,
  isAdmin,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  isAdmin?: boolean;
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
        <Link href="/app/dashboard" className="text-base font-semibold tracking-tight text-text-primary">
          ASCEND
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell initial={notifications} unreadCount={unreadCount} />
          <button
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            className="rounded-md p-2 text-text-secondary"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-bg-primary lg:hidden">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <span className="text-base font-semibold tracking-tight text-text-primary">ASCEND</span>
            <button onClick={() => setOpen(false)} aria-label="Fermer le menu" className="rounded-md p-2 text-text-secondary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            {menuLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-text-secondary hover:bg-card hover:text-text-primary"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="mt-2 flex items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium text-error"
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
              "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
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
