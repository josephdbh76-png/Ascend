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
        "rounded-lg border border-border",
        elevated ? "bg-card-elevated" : "bg-card",
        hover &&
          "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
        className,
      )}
      {...props}
    />
  );
}
