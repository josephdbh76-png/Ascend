"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DashboardBannerRow, BannerButton } from "@/services/banner.service";

function CopyCodeButton({ button }: { button: BannerButton }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(button.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={copy}>
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copié !" : `${button.label} — ${button.value}`}
    </Button>
  );
}

function BannerButtons({ buttons }: { buttons: BannerButton[] }) {
  if (buttons.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {buttons.map((btn, i) =>
        btn.type === "copy_code" ? (
          <CopyCodeButton key={i} button={btn} />
        ) : (
          <Button key={i} href={btn.value} size="sm">
            {btn.label}
          </Button>
        ),
      )}
    </div>
  );
}

function Slide({ banner }: { banner: DashboardBannerRow }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[3/1] w-full overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
      </div>
      <BannerButtons buttons={banner.buttons} />
    </div>
  );
}

export function DashboardBannerCarousel({ banners }: { banners: DashboardBannerRow[] }) {
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (banners.length < 2) return;
    const interval = setInterval(() => {
      setActive((i) => (i + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[active] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [active]);

  if (banners.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div ref={scrollerRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden">
        {banners.map((b) => (
          <div key={b.id} className="w-full shrink-0 snap-center">
            <Slide banner={b} />
          </div>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Aller à la bannière ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${i === active ? "w-4 bg-gold" : "w-1.5 bg-border-strong"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
