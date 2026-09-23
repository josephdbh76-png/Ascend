"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import type { DashboardBannerRow, BannerButton } from "@/services/banner.service";

// Both chip styles below share the exact same padding/height so a link
// button and a code chip sitting side by side on a banner read as one
// matched pair, not two mismatched controls.
const CHIP_SIZING = "px-3.5 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base";

// Styled to match the dashed voucher-chip look of the source banner
// designs — meant to sit directly on the artwork, not as generic UI chrome.
function CopyCodeChip({ button }: { button: BannerButton }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(button.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`flex items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-gold/55 bg-black/40 backdrop-blur-sm transition-colors hover:bg-black/55 ${CHIP_SIZING}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60 sm:text-[11px]">Code</span>
      <span className="font-mono font-extrabold tracking-wide text-white">{button.value}</span>
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-white/70" />}
    </button>
  );
}

function LinkChip({ button }: { button: BannerButton }) {
  const isExternal = button.value.startsWith("http://") || button.value.startsWith("https://");
  const className = `inline-flex items-center gap-2 rounded-lg bg-gold font-bold text-[#0a0a0a] transition-colors hover:bg-gold-light ${CHIP_SIZING}`;

  if (isExternal) {
    return (
      <a href={button.value} target="_blank" rel="noopener noreferrer" className={className}>
        {button.label}
      </a>
    );
  }
  return (
    <Link href={button.value} className={className}>
      {button.label}
    </Link>
  );
}

function BannerButtons({ buttons }: { buttons: BannerButton[] }) {
  if (buttons.length === 0) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-3 sm:gap-3 sm:p-5">
      {buttons.map((btn, i) => (btn.type === "copy_code" ? <CopyCodeChip key={i} button={btn} /> : <LinkChip key={i} button={btn} />))}
    </div>
  );
}

function Slide({ banner }: { banner: DashboardBannerRow }) {
  return (
    <div className="relative aspect-[3/1] w-full overflow-hidden rounded-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
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
