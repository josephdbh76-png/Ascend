import { cn } from "@/lib/utils";

export function ProgressBar({
  percent,
  className,
  goldFill = true,
}: {
  percent: number;
  className?: string;
  goldFill?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("h-1 w-full overflow-hidden bg-border", className)}>
      <div
        className={cn(
          "h-full transition-[width] duration-700 ease-out",
          goldFill ? "bg-gradient-to-r from-gold-dark to-gold" : "bg-info",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
