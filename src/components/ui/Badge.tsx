import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const variants = {
  gold: "bg-gold/10 text-gold border-gold/30",
  success: "bg-success/10 text-success border-success/30",
  error: "bg-error/10 text-error border-error/30",
  info: "bg-info/10 text-info border-info/30",
  exclusive: "bg-exclusive/10 text-exclusive border-exclusive/30",
  neutral: "bg-card-elevated text-text-secondary border-border-strong",
  demo: "bg-transparent text-text-muted border-border-strong border-dashed",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
