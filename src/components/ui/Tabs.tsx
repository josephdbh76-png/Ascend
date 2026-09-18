"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
}

export function Tabs({
  items,
  defaultValue,
  onChange,
  className,
}: {
  items: TabItem[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);

  function select(value: string) {
    setActive(value);
    onChange?.(value);
  }

  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full gap-1 overflow-x-auto border border-border bg-card p-1",
        className,
      )}
    >
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={active === item.value}
          onClick={() => select(item.value)}
          className={cn(
            "shrink-0 px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
            active === item.value
              ? "bg-card-active text-gold"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return null;
  return <div className="animate-fade-up">{children}</div>;
}
