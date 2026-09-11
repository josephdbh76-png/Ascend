"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Trophy, Flag, Award, User, Settings, Menu, X, LogOut } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/challenges", label: "Challenges", icon: Flag },
  { href: "/achievements", label: "Achievements", icon: Award },
];

export function Navbar({
  username,
  avatarUrl,
  firstName,
}: {
  username: string;
  avatarUrl: string | null;
  firstName: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg-primary/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-text-primary">
            ASCEND
          </Link>
          <div className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? "text-gold" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/settings") ? "text-gold" : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <Link href={`/profile/${username}`} className="flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-3 text-sm font-medium text-text-secondary hover:text-text-primary">
            <Avatar avatarUrl={avatarUrl} firstName={firstName} username={username} />
            <span>{firstName ?? username}</span>
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="rounded-md p-2 text-text-muted hover:text-error"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <button
          className="rounded-md p-2 text-text-secondary lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border bg-bg-primary px-4 pb-4 pt-2 lg:hidden">
          <div className="flex flex-col gap-1">
            {[...LINKS, { href: "/profile/" + username, label: "Profile", icon: User }, { href: "/settings", label: "Settings", icon: Settings }].map(
              (link) => {
                const active = pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium",
                      active ? "bg-card text-gold" : "text-text-secondary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              },
            )}
            <button
              onClick={handleLogout}
              className="mt-2 flex items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium text-error"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </header>
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
    return <img src={avatarUrl} alt={username} className="h-7 w-7 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card-elevated text-[11px] font-semibold text-gold">
      {initials(firstName, username.slice(1))}
    </span>
  );
}
