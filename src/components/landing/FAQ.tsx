"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { FAQ_ITEMS } from "@/lib/constants";

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="border-b border-border">
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="h2" className="text-center text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Questions fréquentes
        </Reveal>
        <Reveal as="div" delay={0.1} className="mt-10 divide-y divide-border rounded-lg border border-border">
          {FAQ_ITEMS.map((item, i) => (
            <div key={item.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={open === i}
              >
                <span className="text-sm font-medium text-text-primary">{item.q}</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", open === i && "rotate-180")}
                />
              </button>
              {open === i && <p className="px-5 pb-4 text-sm text-text-secondary">{item.a}</p>}
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
