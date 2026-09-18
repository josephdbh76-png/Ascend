import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  elevated,
  hover,
  ...props
}: HTMLAttributes<HTMLDivElement> & { elevated?: boolean; hover?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border",
        elevated ? "bg-card-elevated" : "bg-card",
        hover && "transition-colors duration-200 ease-out hover:border-gold/30",
        className,
      )}
      {...props}
    />
  );
}
