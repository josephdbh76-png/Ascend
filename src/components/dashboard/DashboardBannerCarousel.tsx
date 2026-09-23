"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DashboardBannerRow } from "@/services/banner.service";

function isExternal(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function Slide({ banner }: { banner: DashboardBannerRow }) {
  const content = (
    <div className="relative h-32 w-full overflow-hidden rounded-xl sm:h-40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-4">
        <p className="text-sm font-semibold text-white sm:text-base">{banner.title}</p>
        {banner.subtitle && <p className="text-xs text-white/80">{banner.subtitle}</p>}
      </div>
    </div>
  );

  if (!banner.linkUrl) return content;
  if (isExternal(banner.linkUrl)) {
    return (
      <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }
  return (
    <Link href={banner.linkUrl} className="block">
      {content}
    </Link>
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
