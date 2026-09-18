import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "./Card";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendPositive,
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)} elevated hover>
      <div className="flex items-start justify-between">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
          {label}
        </span>
        {Icon && <Icon className={cn("h-4 w-4", accent ? "text-gold" : "text-text-muted")} />}
      </div>
      <div
        className={cn(
          "mt-2 font-display text-2xl font-medium tabular-nums tracking-tight",
          accent ? "text-gold" : "text-text-primary",
        )}
      >
        {value}
      </div>
      {trend && (
        <div
          className={cn(
            "mt-1 font-mono text-[11px] font-medium tabular-nums",
            trendPositive === false ? "text-error" : trendPositive === true ? "text-success" : "text-text-muted",
          )}
        >
          {trend}
        </div>
      )}
    </Card>
  );
}
