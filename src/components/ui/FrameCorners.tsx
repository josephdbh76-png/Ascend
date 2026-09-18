import { cn } from "@/lib/utils";

/**
 * Four corner brackets, like a museum label or a viewfinder — the site's
 * recurring signature for "this panel is a framed artifact", used instead
 * of the generic blurred glow halo around floating cards.
 */
export function FrameCorners({ className }: { className?: string }) {
  const corner = "absolute h-4 w-4 border-gold/60";
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={cn(corner, "-left-px -top-px border-l border-t")} />
      <span className={cn(corner, "-right-px -top-px border-r border-t")} />
      <span className={cn(corner, "-bottom-px -left-px border-b border-l")} />
      <span className={cn(corner, "-bottom-px -right-px border-b border-r")} />
    </div>
  );
}
