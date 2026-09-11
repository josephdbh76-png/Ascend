import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  elevated,
  ...props
}: HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border",
        elevated ? "bg-card-elevated" : "bg-card",
        className,
      )}
      {...props}
    />
  );
}
