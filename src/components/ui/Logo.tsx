import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl sm:text-7xl",
};

export function Logo({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span className={cn("font-display font-medium tracking-tight text-text-primary", SIZES[size], className)}>
      ASCEND
    </span>
  );
}
