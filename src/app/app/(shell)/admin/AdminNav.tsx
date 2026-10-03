"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Flag, Gem, GraduationCap, Mail, Megaphone, CreditCard, SlidersHorizontal, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/app/admin", label: "Vue d'ensemble", icon: BarChart3 },
  { href: "/app/admin/membres", label: "Membres", icon: Users },
  { href: "/app/admin/saisons", label: "Saisons et défis", icon: Flag },
  { href: "/app/admin/recompenses", label: "Récompenses", icon: Gem },
  { href: "/app/admin/formations", label: "Formations", icon: GraduationCap },
  { href: "/app/admin/emails", label: "E-mails", icon: Mail },
  { href: "/app/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/app/admin/communaute", label: "Communauté", icon: MessagesSquare },
  { href: "/app/admin/facturation", label: "Facturation", icon: CreditCard },
  { href: "/app/admin/parametres", label: "Paramètres", icon: SlidersHorizontal },
];

export function AdminNav({ badges }: { badges?: Partial<Record<string, number>> }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections de l'administration" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 rounded-lg border border-border bg-card p-1">
        {SECTIONS.map((s) => {
          const active = s.href === "/app/admin" ? pathname === s.href : pathname.startsWith(s.href);
          const badge = badges?.[s.href];
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-card-active text-gold" : "text-text-secondary hover:bg-card-elevated hover:text-text-primary",
                )}
              >
                <s.icon className="h-4 w-4" />
                {s.label}
                {badge ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-semibold text-[#0a0a0a]">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
