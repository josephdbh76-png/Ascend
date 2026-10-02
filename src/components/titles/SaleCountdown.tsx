"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeLeft } from "@/lib/titleSale";

/** Live "Fin de la vente dans 2 j 4 h"; refreshes the page when the sale closes. */
export function SaleCountdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const router = useRouter();
  const end = Date.parse(endsAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= end) {
        clearInterval(tick);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [end, router]);

  const left = end - now;
  const urgent = left < 24 * 60 * 60 * 1000;
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium tabular-nums", urgent ? "text-error" : "text-gold", className)}>
      <Timer className="h-3.5 w-3.5 shrink-0" />
      {/* Server and browser clocks differ by a second or two. */}
      <span suppressHydrationWarning>{left > 0 ? `Fin de la vente dans ${formatTimeLeft(left)}` : "Vente terminée"}</span>
    </span>
  );
}
