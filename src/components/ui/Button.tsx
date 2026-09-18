import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";

const variants = {
  primary: "bg-gold text-[#0a0a0a] hover:bg-gold-light",
  secondary: "bg-card-elevated text-text-primary border border-border-strong hover:border-gold/40",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-card",
  outline: "border border-border-strong text-text-primary hover:border-gold/50 hover:text-gold",
  danger: "bg-error/10 text-error border border-error/30 hover:bg-error/20",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4",
  lg: "h-12 px-6 text-base",
};

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: ReactNode;
  href?: string;
}

export function Button({ variant = "primary", size = "md", className, children, href, disabled, ...rest }: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
