"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { markTutorialSeenAction } from "@/app/app/(shell)/actions";
import { useConsentAnswered } from "@/lib/consent";

/**
 * Guided tour that lights up the real interface, one element at a time.
 * Targets are `data-tour` attributes; on phones the bottom bar and the menu
 * button stand in for the sidebar. A step whose target is missing is shown
 * centered instead of pointing at nothing.
 */

interface TourStep {
  key: string;
  /** data-tour value on screens ≥ lg; null = step skipped on desktop. */
  desktop: string | null | undefined;
  /** data-tour value on phones; null = step skipped on mobile. */
  mobile: string | null | undefined;
  badge?: string;
  title: string;
  body: string;
}

type Rect = { top: number; left: number; width: number; height: number };

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeMedia(callback: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function subscribeNothing() {
  return () => {};
}

function findVisible(key: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`);
  for (const node of nodes) {
    const r = node.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return node;
  }
  return null;
}

function useTargetRect(key: string | null | undefined): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = key ? findVisible(key) : null;
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [key]);
  return rect;
}

const MARGIN = 16;
const GAP = 14;

function placeTooltip(rect: Rect | null, size: { w: number; h: number }, vw: number, vh: number) {
  const clampLeft = (x: number) => Math.min(Math.max(x, MARGIN), vw - size.w - MARGIN);
  const clampTop = (y: number) => Math.min(Math.max(y, MARGIN), vh - size.h - MARGIN);
  if (!rect) return { left: (vw - size.w) / 2, top: Math.max(MARGIN, (vh - size.h) / 2) };
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  if (right + GAP + size.w <= vw - MARGIN) {
    return { left: right + GAP, top: clampTop(rect.top + rect.height / 2 - size.h / 2) };
  }
  if (bottom + GAP + size.h <= vh - MARGIN) {
    return { left: clampLeft(rect.left + rect.width / 2 - size.w / 2), top: bottom + GAP };
  }
  if (rect.top - GAP - size.h >= MARGIN) {
    return { left: clampLeft(rect.left + rect.width / 2 - size.w / 2), top: rect.top - GAP - size.h };
  }
  return { left: clampLeft(rect.left - GAP - size.w), top: clampTop(rect.top) };
}

export function ProductTour({
  firstName,
  memberCount,
  isVerified,
  seasonDaysLeft,
  replay = false,
}: {
  firstName: string | null;
  /** Real, current non-demo member count — never a made-up figure. */
  memberCount: number;
  isVerified: boolean;
  seasonDaysLeft: number | null;
  /** Opened again from Réglages: clean the URL when done. */
  replay?: boolean;
}) {
  const router = useRouter();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  // The cookie banner sits at the same level: the tour waits for the answer.
  const consentAnswered = useConsentAnswered();
  const isDesktop = useSyncExternalStore(subscribeMedia, () => window.matchMedia(DESKTOP_QUERY).matches, () => true);
  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState({ w: 340, h: 220 });
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });
  const tipRef = useRef<HTMLDivElement>(null);

  const steps = useMemo<TourStep[]>(() => {
    const all: TourStep[] = [
      {
        key: "welcome",
        desktop: undefined,
        mobile: undefined,
        title: `Bienvenue sur ASCEND${firstName ? `, ${firstName}` : ""}`,
        body: "45 secondes pour prendre tes repères. Tu peux passer la visite à tout moment et la revoir depuis Réglages.",
      },
      {
        key: "dashboard",
        desktop: "nav-dashboard",
        mobile: "tab-dashboard",
        title: "Ton tableau de bord",
        body: "Revenus vérifiés, croissance, prochain palier et visites de ton profil : l'essentiel de ton activité au même endroit.",
      },
      {
        key: "leaderboard",
        desktop: "nav-leaderboard",
        mobile: "tab-leaderboard",
        title: "Le classement",
        body:
          memberCount >= 100
            ? `${memberCount.toLocaleString("fr-FR")} entrepreneurs, classés au niveau mondial, par pays et par activité. Uniquement sur des revenus vérifiés à la source.`
            : "Mondial, par pays et par activité, uniquement sur des revenus vérifiés à la source. Les premières places se prennent maintenant.",
      },
      {
        key: "season",
        desktop: "nav-challenges",
        mobile: "tab-challenges",
        badge: seasonDaysLeft != null && seasonDaysLeft > 0 ? `Fin dans ${seasonDaysLeft} j` : undefined,
        title: "La saison",
        body: "Chaque défi réussi rapporte des points. En fin de saison, les mieux classés gagnent des titres, des trophées et parfois de vrais lots.",
      },
      {
        key: "titles",
        desktop: "nav-titles",
        mobile: "mobile-menu",
        title: isDesktop ? "Titres et trophées" : "Tout le reste est ici",
        body: isDesktop
          ? "Des statuts à afficher sur ton profil. Certains se gagnent, d'autres n'existent qu'en quelques exemplaires."
          : "Titres, réseau, messages, opportunités et réglages : tout est dans ce menu.",
      },
      {
        key: "network",
        desktop: "nav-network",
        mobile: null,
        title: "Réseau et formations",
        body: "Trouve des fondateurs de ton secteur et écris-leur. Côté formations, les membres partagent les leurs avec des prix qui ne sont publiés nulle part ailleurs.",
      },
      {
        key: "notifications",
        desktop: "notifications",
        mobile: "mobile-notifications",
        title: "Tes alertes",
        body: "Dépassé au classement, défi réussi, nouveau message : tu es prévenu ici, et par e-mail si tu le souhaites.",
      },
      {
        key: "profile",
        desktop: "nav-profile",
        mobile: "tab-profile",
        title: "Ton profil public",
        body: "Ta vitrine : activités, titres, accomplissements. Partage-le, il s'affiche avec ta carte sur LinkedIn, X et WhatsApp.",
      },
      {
        key: "finish",
        desktop: isVerified ? undefined : "nav-settings",
        mobile: undefined,
        title: isVerified ? "Tu es prêt" : "Dernière étape : vérifier tes revenus",
        body: isVerified
          ? "Tes revenus sont vérifiés. Relève ton premier défi de saison pour marquer tes premiers points."
          : "Connecte Stripe, Shopify, PayPal, Lemon Squeezy ou ta banque en lecture seule. Deux minutes, et tu entres au classement.",
      },
    ];
    return all.filter((s) => (isDesktop ? s.desktop !== null : s.mobile !== null));
  }, [firstName, memberCount, isVerified, seasonDaysLeft, isDesktop]);

  const step = steps[Math.min(index, steps.length - 1)];
  const isFirst = index === 0;
  const isLast = index >= steps.length - 1;
  const rect = useTargetRect(open ? (isDesktop ? step.desktop : step.mobile) : null);

  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setSize({ w: el.offsetWidth, h: el.offsetHeight });
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    });
    observer.observe(el);
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [mounted, open, consentAnswered]);

  useEffect(() => {
    if (open && consentAnswered) tipRef.current?.focus({ preventScroll: true });
  }, [open, index, consentAnswered]);

  const finish = useCallback(
    (goTo?: string) => {
      setOpen(false);
      void markTutorialSeenAction();
      if (goTo) router.push(goTo);
      else if (replay) router.replace("/app/dashboard", { scroll: false });
    },
    [replay, router],
  );

  const next = useCallback(() => {
    if (!isLast) return setIndex((i) => i + 1);
    finish(isVerified ? "/app/challenges" : "/app/settings#comptes-connectes");
  }, [isLast, isVerified, finish]);

  useEffect(() => {
    if (!open || !consentAnswered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, consentAnswered, next, finish]);

  if (!mounted || !open || !consentAnswered) return null;

  const pos = placeTooltip(rect, size, viewport.w, viewport.h);
  const pad = 6;

  return createPortal(
    <div className="fixed inset-0 z-[90]" aria-hidden={false}>
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            // Ring, dimmed page and glow in one shadow (a Tailwind ring would be overridden).
            boxShadow:
              "0 0 0 2px rgba(214,168,79,0.9), 0 0 0 9999px rgba(5,6,8,0.76), 0 0 40px 6px rgba(214,168,79,0.35)",
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[rgba(5,6,8,0.76)] backdrop-blur-[2px]" />
      )}

      <div
        ref={tipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        className="absolute w-[min(340px,calc(100vw-32px))] rounded-lg border border-gold/30 bg-card-elevated p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition-[top,left] duration-300 ease-out focus:outline-none motion-reduce:transition-none"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted tabular-nums">
            {isFirst ? "Visite guidée" : `${index} / ${steps.length - 1}`}
          </span>
          {step.badge && <Badge variant="gold">{step.badge}</Badge>}
        </div>
        <div aria-live="polite">
          <h2 id="tour-title" className="mt-2 flex items-center gap-2 text-base font-semibold text-text-primary">
            {isFirst && <Sparkles className="h-4 w-4 shrink-0 text-gold" />}
            {step.title}
          </h2>
          <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-text-secondary">
            {step.body}
          </p>
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-border" aria-hidden>
          <div
            className="h-1 rounded-full bg-gold transition-[width] duration-300"
            style={{ width: `${Math.round((index / (steps.length - 1)) * 100)}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {isFirst ? (
            <Button variant="ghost" size="sm" onClick={() => finish()}>
              Plus tard
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i - 1)} aria-label="Étape précédente">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              {!isLast && (
                <Button variant="ghost" size="sm" onClick={() => finish()}>
                  Passer
                </Button>
              )}
            </div>
          )}
          <Button size="sm" onClick={next}>
            {isFirst ? "Commencer" : isLast ? (isVerified ? "Voir la saison" : "Vérifier mes revenus") : "Suivant"}
            {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
