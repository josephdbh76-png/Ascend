"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    q: "Is ASCEND free during the beta?",
    a: "Yes. All core features — profile, verification, leaderboard, achievements and challenges — are free during the private beta. No credit card required.",
  },
  {
    q: "How does revenue verification work?",
    a: "You connect a revenue source (Stripe, in test mode for the beta) and ASCEND retrieves your actual transaction data server-side. Nothing is verified until real data is successfully pulled.",
  },
  {
    q: "Can I hide my exact revenue?",
    a: "Yes. In Settings, choose to show your exact revenue, a €1M-wide range, or keep it fully private. Your rank can still show without exposing the number.",
  },
  {
    q: "Is my financial data safe?",
    a: "Revenue data is protected by database-level row security — only you can access your connection details and raw figures. Public pages only ever show what your privacy settings allow.",
  },
  {
    q: "What happens after the beta?",
    a: "Free features will remain free. Pro and Elite paid tiers are planned for the future, but beta members will never be charged retroactively.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="border-b border-border">
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10 divide-y divide-border rounded-lg border border-border">
          {ITEMS.map((item, i) => (
            <div key={item.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-text-primary">{item.q}</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", open === i && "rotate-180")}
                />
              </button>
              {open === i && <p className="px-5 pb-4 text-sm text-text-secondary">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
