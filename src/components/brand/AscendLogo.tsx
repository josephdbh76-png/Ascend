import { cn } from "@/lib/utils";
import { BRAND_COLORS, LOGOTYPE, MARK } from "./brandPaths";

/** The "Paliers" mark alone: icons, avatars, anywhere there's no room for the name. */
export function AscendMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={MARK.viewBox}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={MARK.high} fill={BRAND_COLORS.high} />
      <path d={MARK.mid} fill={BRAND_COLORS.mid} />
      <path d={MARK.low} fill={BRAND_COLORS.low} />
    </svg>
  );
}

/**
 * The name, its A drawn as the mark. Size it by height (h-4, h-6…); the
 * letters take the text colour, the mark keeps its golds.
 */
export function AscendLogotype({ className, title = "ASCEND" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={LOGOTYPE.viewBox}
      className={cn("w-auto shrink-0", className)}
      style={{ aspectRatio: String(LOGOTYPE.aspect) }}
      role="img"
      aria-label={title}
    >
      <path d={LOGOTYPE.high} fill={BRAND_COLORS.high} />
      <path d={LOGOTYPE.mid} fill={BRAND_COLORS.mid} />
      <path d={LOGOTYPE.low} fill={BRAND_COLORS.low} />
      <path d={LOGOTYPE.letters} fill="currentColor" />
    </svg>
  );
}
