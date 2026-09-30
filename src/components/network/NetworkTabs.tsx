import Link from "next/link";
import { GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function NetworkTabs({ active }: { active: "founders" | "trainings" }) {
  const tabs = [
    { key: "founders", href: "/app/network", label: "Fondateurs", icon: Users },
    { key: "trainings", href: "/formations", label: "Formations", icon: GraduationCap },
  ] as const;
  return (
    <nav aria-label="Réseau" className="flex w-fit gap-1 rounded-md border border-border bg-bg-secondary p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={cn(
            "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
            active === tab.key ? "bg-card-elevated text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary",
          )}
        >
          <tab.icon className="h-3.5 w-3.5" /> {tab.label}
        </Link>
      ))}
    </nav>
  );
}
