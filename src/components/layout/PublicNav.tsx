"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#produit", label: "Produit" },
  { href: "#classement", label: "Classement" },
  { href: "#recompenses", label: "Récompenses" },
  { href: "#communaute", label: "Communauté" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300",
        scrolled ? "border-border bg-bg-primary/95 backdrop-blur-md" : "border-transparent bg-bg-primary/70 backdrop-blur",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-base font-semibold tracking-tight text-text-primary">
          ASCEND
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-text-secondary hover:text-text-primary">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button href="/login" variant="ghost" size="sm">
            Se connecter
          </Button>
          <Button href="/signup" variant="primary" size="sm">
            Rejoindre ASCEND
          </Button>
        </div>

        <button className="p-2 text-text-secondary lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Ouvrir le menu" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-bg-primary px-4 pb-6 pt-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-sm font-medium text-text-secondary"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button href="/login" variant="secondary">
              Se connecter
            </Button>
            <Button href="/signup" variant="primary">
              Rejoindre ASCEND
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
