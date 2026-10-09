"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function LigueTabs({ hasClan, warLive }: { hasClan: boolean; warLive: boolean }) {
  const pathname = usePathname();
  const tabs = hasClan
    ? [
        { href: "/app/ligue", label: "Ma ligue" },
        { href: "/app/ligue/guerre", label: "Guerre", live: warLive },
        { href: "/app/ligue/gains", label: "Gains" },
      ]
    : [
        { href: "/app/ligue", label: "Trouver une ligue" },
        { href: "/app/ligue/gains", label: "Gains" },
      ];
  return (
    <nav className="flex gap-1 border-b border-border" aria-label="Ligue">
      {tabs.map((t) => {
        const active = t.href === "/app/ligue" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "border-gold text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {t.label}
            {"live" in t && t.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-error" aria-label="en cours" />}
          </Link>
        );
      })}
    </nav>
  );
}
