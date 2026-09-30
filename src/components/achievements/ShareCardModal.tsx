"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Link2, Loader2, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { BrandIcon } from "@/components/share/BrandIcon";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  SHARE_FORMATS,
  SHARE_STYLES,
  shareCaption,
  shareCardPath,
  sharePagePath,
  type ShareFormat,
  type ShareStyle,
  type ShareTarget,
} from "@/lib/share/params";

const FORMATS: ShareFormat[] = ["story", "square", "landscape"];
const STYLES: ShareStyle[] = ["prestige", "ivoire", "aurore", "sticker"];

const SWATCHES: Record<ShareStyle, string> = {
  prestige: "bg-[radial-gradient(circle_at_50%_35%,rgba(227,180,94,0.55),#0b0c0f_72%)]",
  ivoire: "bg-[linear-gradient(160deg,#f7f3ec,#e9e1d1)]",
  aurore: "bg-[linear-gradient(135deg,#e3b45e,#f97316_45%,#ec4899)]",
  sticker: "bg-[repeating-conic-gradient(#3a3a3a_0%_25%,#1f1f1f_0%_50%)] bg-[length:8px_8px]",
};

// Preview box per format, in px (the image keeps its own ratio inside).
const PREVIEW: Record<ShareFormat | "sticker", { w: number; h: number }> = {
  story: { w: 203, h: 360 },
  square: { w: 300, h: 300 },
  landscape: { w: 340, h: 179 },
  sticker: { w: 320, h: 141 },
};

export function ShareCardModal({
  open,
  onClose,
  target,
  itemName,
  zIndexClassName,
}: {
  open: boolean;
  onClose: () => void;
  target: ShareTarget;
  /** Used in the caption ("« Top 10 » débloqué sur ASCEND."). */
  itemName: string;
  zIndexClassName?: string;
}) {
  const [format, setFormat] = useState<ShareFormat>("story");
  const [style, setStyle] = useState<ShareStyle>("prestige");
  const [preview, setPreview] = useState<{ src: string; url: string; blob: Blob } | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "caption" | null>(null);
  const toast = useToast();
  const objectUrl = useRef<string | null>(null);

  const src = shareCardPath(target, format, style);
  const ready = preview?.src === src;
  const failed = failedSrc === src;
  const box = PREVIEW[style === "sticker" ? "sticker" : format];

  // One fetch per variant: the blob feeds the preview and is reused as-is by
  // "Partager", so the share sheet opens within the click (Safari requires it).
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(src, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = url;
        setPreview({ src, url, blob });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFailedSrc(src);
      });
    return () => controller.abort();
  }, [open, src]);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  function pageUrl() {
    return new URL(sharePagePath(target), window.location.origin).toString();
  }

  function fullCaption() {
    return `${shareCaption(target.kind, itemName)}\nRevenus vérifiés, classement public : ${pageUrl()}`;
  }

  function fileName() {
    return `ascend-${target.kind}-${style === "sticker" ? "sticker" : format}.png`;
  }

  function flashCopied(what: "link" | "caption") {
    setCopied(what);
    setTimeout(() => setCopied((c) => (c === what ? null : c)), 2000);
  }

  function download() {
    if (!ready) return;
    const link = document.createElement("a");
    link.href = preview.url;
    link.download = fileName();
    link.click();
    track("card_shared", { kind: target.kind, format, style, channel: "download" });
    toast.show("Image enregistrée.", "success");
  }

  async function shareImage() {
    if (!ready) return;
    const file = new File([preview.blob], fileName(), { type: "image/png" });
    const text = fullCaption();
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        track("card_shared", { kind: target.kind, format, style, channel: "native" });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.show("Le partage n'a pas abouti. Enregistre l'image puis publie-la depuis ton appli.", "error");
      }
      return;
    }
    download();
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    toast.show("Image enregistrée et légende copiée : il ne reste qu'à la publier.", "info");
  }

  async function copy(what: "link" | "caption") {
    try {
      await navigator.clipboard.writeText(what === "link" ? pageUrl() : fullCaption());
      flashCopied(what);
      track("card_shared", { kind: target.kind, format, style, channel: `copy_${what}` });
    } catch {
      toast.show("Copie impossible depuis ce navigateur.", "error");
    }
  }

  function openNetwork(network: "linkedin" | "x" | "whatsapp") {
    const url = pageUrl();
    const line = shareCaption(target.kind, itemName);
    const href =
      network === "linkedin"
        ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        : network === "x"
          ? `https://x.com/intent/post?text=${encodeURIComponent(line)}&url=${encodeURIComponent(url)}`
          : `https://wa.me/?text=${encodeURIComponent(`${line} ${url}`)}`;
    window.open(href, "_blank", "noopener,noreferrer");
    track("card_shared", { kind: target.kind, format, style, channel: network });
  }

  return (
    <Modal open={open} onClose={onClose} title="Partager" className="max-w-lg" zIndexClassName={zIndexClassName}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center rounded-lg border border-border bg-bg-primary/60 px-4 py-5">
          <div
            className={cn(
              "relative flex items-center justify-center overflow-hidden rounded-md shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition-[width,height] duration-300 ease-out",
              style === "sticker" && "bg-[repeating-conic-gradient(#2a2a2a_0%_25%,#1a1a1a_0%_50%)] bg-[length:16px_16px]",
            )}
            style={{ width: box.w, height: box.h }}
          >
            {ready && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="Aperçu de la carte à partager" className="h-full w-full object-contain" />
            )}
            {!ready && !failed && (
              <div className="absolute inset-0 flex items-center justify-center bg-card">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            )}
            {failed && (
              <div className="absolute inset-0 flex items-center justify-center bg-card p-4 text-center text-xs text-text-muted">
                Aperçu indisponible pour le moment. Réessaie dans un instant.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {style !== "sticker" ? (
            <div role="radiogroup" aria-label="Format" className="grid grid-cols-3 gap-1 rounded-md border border-border bg-bg-primary/60 p-1">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={format === f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-sm px-2 py-1.5 text-center transition-colors",
                    format === f ? "bg-card-elevated text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary",
                  )}
                >
                  <span className="block text-xs font-semibold">{SHARE_FORMATS[f].label}</span>
                  <span className="block truncate text-[10px] opacity-80">{SHARE_FORMATS[f].hint}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-border bg-bg-primary/60 px-3 py-2.5 text-center text-xs text-text-secondary">
              Fond transparent : dans ta story Instagram, colle-le par-dessus ta photo.
            </p>
          )}

          <div role="radiogroup" aria-label="Style" className="grid grid-cols-4 gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={style === s}
                onClick={() => setStyle(s)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border p-2 transition-colors",
                  style === s ? "border-gold/60 bg-gold/5" : "border-border hover:border-border-strong",
                )}
              >
                <span className={cn("h-9 w-full rounded-sm border border-white/10", SWATCHES[s])} />
                <span className={cn("text-[11px] font-medium", style === s ? "text-gold" : "text-text-secondary")}>
                  {SHARE_STYLES[s].label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button type="button" onClick={shareImage} disabled={!ready} className="w-full">
            <Share2 className="h-4 w-4" /> Partager l&apos;image
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={download} disabled={!ready}>
              <Download className="h-4 w-4" /> Enregistrer
            </Button>
            <Button type="button" variant="secondary" onClick={() => copy("link")}>
              {copied === "link" ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
              {copied === "link" ? "Lien copié" : "Copier le lien"}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openNetwork("linkedin")}>
              <BrandIcon brand="linkedin" className="h-3.5 w-3.5" /> LinkedIn
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => openNetwork("x")}>
              <BrandIcon brand="x" className="h-3.5 w-3.5" /> X
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => openNetwork("whatsapp")}>
              <BrandIcon brand="whatsapp" className="h-3.5 w-3.5" /> WhatsApp
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-bg-primary/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Légende suggérée</span>
            <button
              type="button"
              onClick={() => copy("caption")}
              className="flex items-center gap-1 text-xs font-medium text-gold hover:underline"
            >
              {copied === "caption" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "caption" ? "Copiée" : "Copier"}
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
            {shareCaption(target.kind, itemName)} Revenus vérifiés, classement public : ton lien de profil.
          </p>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-text-muted">
          Sur téléphone, « Partager l&apos;image » ouvre Instagram, WhatsApp ou LinkedIn. Le lien affiche ta carte en
          aperçu quand tu le publies.
        </p>
      </div>
    </Modal>
  );
}
