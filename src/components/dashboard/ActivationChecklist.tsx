import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  label: string;
  done: boolean;
  href: string;
}

export function ActivationChecklist({ items }: { items: ChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;

  return (
    <Card className="flex flex-col gap-4 p-5" elevated>
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Complète ton profil</h2>
          <span className="text-xs text-text-muted">
            {doneCount}/{items.length}
          </span>
        </div>
        <ProgressBar percent={(doneCount / items.length) * 100} className="mt-2" />
      </div>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
              item.done ? "text-text-muted" : "text-text-secondary hover:bg-card-active hover:text-text-primary",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                item.done ? "border-success bg-success/10 text-success" : "border-border-strong text-transparent",
              )}
            >
              <Check className="h-3 w-3" />
            </span>
            <span className={item.done ? "line-through" : undefined}>{item.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
