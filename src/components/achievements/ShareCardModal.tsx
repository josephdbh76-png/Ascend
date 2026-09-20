"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, ChevronLeft, ChevronRight, Camera, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { AchievementRarity } from "@/types/database.types";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: "#a8a9ad",
  rare: "#749ef1",
  epic: "#a289ff",
  legendary: "#d6a84f",
};

/**
 * Fully opaque, rarity-tinted background colors for the "Doré" design's
 * glow — deliberately NOT the accent color with alpha applied. An
 * alpha-blended fill on the very first draw call blends against nothing
 * (canvases start transparent), leaving the exported PNG partially
 * see-through instead of a solid dark background, which looks washed out
 * once shared outside a dark viewer.
 */
const RARITY_GLOW: Record<AchievementRarity, string> = {
  common: "#1c1c1e",
  rare: "#0f1830",
  epic: "#160f28",
  legendary: "#1a1508",
};

interface CardParams {
  title: string;
  name: string;
  rank?: string | null;
  accent: string;
  glow: string;
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size / 2);
  ctx.lineTo(x + size / 2, y + size / 2);
  ctx.lineTo(x + size * 0.16, y + size / 2);
  ctx.lineTo(x, y + size * 0.05);
  ctx.lineTo(x - size * 0.16, y + size / 2);
  ctx.lineTo(x - size / 2, y + size / 2);
  ctx.closePath();
  ctx.fill();
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Greedy word-wrap for canvas text — returns the lines and doesn't draw. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCenteredLines(ctx: CanvasRenderingContext2D, lines: string[], centerX: number, startY: number, lineHeight: number) {
  lines.forEach((line, i) => ctx.fillText(line, centerX, startY + i * lineHeight));
}

const DESIGNS: { label: string; transparent?: boolean; draw: (ctx: CanvasRenderingContext2D, p: CardParams) => void }[] = [
  {
    label: "Doré",
    draw(ctx, { title, name, rank, accent, glow }) {
      const cx = CARD_WIDTH / 2;
      const bg = ctx.createRadialGradient(cx, 420, 80, cx, 420, 900);
      bg.addColorStop(0, glow);
      bg.addColorStop(1, "#0a0b0d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      drawLogo(ctx, cx, 300, 90, accent);

      ctx.textAlign = "center";
      ctx.fillStyle = accent;
      ctx.font = "600 32px system-ui, sans-serif";
      ctx.fillText("ACCOMPLISSEMENT DÉBLOQUÉ", cx, 430);

      ctx.fillStyle = "#f4f1ea";
      ctx.font = "600 96px system-ui, sans-serif";
      const lines = wrapLines(ctx, title, 900);
      drawCenteredLines(ctx, lines, cx, 620, 108);

      ctx.fillStyle = "#a8a29e";
      ctx.font = "400 40px system-ui, sans-serif";
      ctx.fillText(rank ? `${name} · ${rank}` : name, cx, 620 + lines.length * 108 + 70);

      ctx.fillStyle = accent;
      ctx.font = "600 34px system-ui, sans-serif";
      ctx.fillText("ASCEND", cx, CARD_HEIGHT - 120);
    },
  },
  {
    label: "Minimal",
    draw(ctx, { title, name, rank, accent }) {
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      const cx = CARD_WIDTH / 2;
      drawLogo(ctx, cx, 300, 80, "#0a0a0a");

      ctx.fillStyle = accent;
      ctx.textAlign = "center";
      ctx.font = "600 30px system-ui, sans-serif";
      ctx.fillText("ACCOMPLISSEMENT DÉBLOQUÉ", cx, 420);

      ctx.fillStyle = "#0a0a0a";
      ctx.font = "600 92px Georgia, serif";
      const lines = wrapLines(ctx, title, 900);
      drawCenteredLines(ctx, lines, cx, 610, 104);

      const lineY = 610 + lines.length * 104 + 50;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 60, lineY);
      ctx.lineTo(cx + 60, lineY);
      ctx.stroke();

      ctx.fillStyle = "#57534e";
      ctx.font = "400 38px system-ui, sans-serif";
      ctx.fillText(rank ? `${name} · ${rank}` : name, cx, lineY + 70);

      ctx.fillStyle = "#0a0a0a";
      ctx.font = "600 32px system-ui, sans-serif";
      ctx.fillText("ASCEND", cx, CARD_HEIGHT - 120);
    },
  },
  {
    label: "Contraste",
    draw(ctx, { title, name, rank, accent }) {
      const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
      bg.addColorStop(0, accent);
      bg.addColorStop(0.5, "#0a0a0a");
      bg.addColorStop(1, "#0a0a0a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      const cx = CARD_WIDTH / 2;
      drawLogo(ctx, cx, 280, 90, "#ffffff");

      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.85;
      ctx.textAlign = "center";
      ctx.font = "700 30px system-ui, sans-serif";
      ctx.fillText("NOUVEAU RECORD", cx, 400);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 104px system-ui, sans-serif";
      const lines = wrapLines(ctx, title, 940);
      drawCenteredLines(ctx, lines, cx, 600, 114);

      const pillY = 600 + lines.length * 114 + 60;
      const pillText = rank ? `${name}  ·  ${rank}` : name;
      ctx.font = "600 34px system-ui, sans-serif";
      const pillWidth = ctx.measureText(pillText).width + 80;
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      roundedRectPath(ctx, cx - pillWidth / 2, pillY - 42, pillWidth, 84, 42);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(pillText, cx, pillY + 12);

      ctx.font = "700 32px system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("ASCEND", cx, CARD_HEIGHT - 120);
    },
  },
  {
    label: "Sticker",
    transparent: true,
    draw(ctx, { title, name, rank, accent }) {
      const cx = CARD_WIDTH / 2;
      ctx.textAlign = "center";
      ctx.font = "600 76px system-ui, sans-serif";
      const lines = wrapLines(ctx, title, 760);
      ctx.font = "400 36px system-ui, sans-serif";
      const subLine = rank ? `${name} · ${rank}` : name;

      const panelWidth = 880;
      const panelHeight = 340 + lines.length * 96;
      const panelY = CARD_HEIGHT * 0.72 - panelHeight / 2;
      const panelX = cx - panelWidth / 2;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 20;
      ctx.fillStyle = "rgba(10,10,10,0.55)";
      roundedRectPath(ctx, panelX, panelY, panelWidth, panelHeight, 40);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = `${accent}55`;
      ctx.lineWidth = 2;
      roundedRectPath(ctx, panelX, panelY, panelWidth, panelHeight, 40);
      ctx.stroke();

      drawLogo(ctx, cx, panelY + 90, 64, accent);

      ctx.fillStyle = accent;
      ctx.font = "600 28px system-ui, sans-serif";
      ctx.fillText("ACCOMPLISSEMENT DÉBLOQUÉ", cx, panelY + 160);

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 76px system-ui, sans-serif";
      drawCenteredLines(ctx, lines, cx, panelY + 250, 88);

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "400 36px system-ui, sans-serif";
      ctx.fillText(subLine, cx, panelY + 260 + lines.length * 88);
    },
  },
  {
    label: "Médaille",
    transparent: true,
    draw(ctx, { title, name, rank, accent }) {
      const cx = CARD_WIDTH / 2;
      const medalY = CARD_HEIGHT * 0.62;
      const radius = 130;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 12;
      const medalGradient = ctx.createRadialGradient(cx, medalY - 40, 10, cx, medalY, radius);
      medalGradient.addColorStop(0, "#ffffff");
      medalGradient.addColorStop(0.35, accent);
      medalGradient.addColorStop(1, "#0a0a0a");
      ctx.fillStyle = medalGradient;
      ctx.beginPath();
      ctx.arc(cx, medalY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, medalY, radius - 14, 0, Math.PI * 2);
      ctx.stroke();

      drawLogo(ctx, cx, medalY + 10, 100, "#ffffff");

      ctx.textAlign = "center";
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 84px system-ui, sans-serif";
      const lines = wrapLines(ctx, title, 900);
      drawCenteredLines(ctx, lines, cx, medalY + radius + 130, 96);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "400 38px system-ui, sans-serif";
      ctx.fillText(rank ? `${name} · ${rank}` : name, cx, medalY + radius + 150 + lines.length * 96);
      ctx.restore();
    },
  },
];

export function ShareCardModal({
  open,
  onClose,
  title,
  name,
  rank,
  rarity = "common",
  zIndexClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  name: string;
  rank?: string | null;
  rarity?: AchievementRarity;
  zIndexClassName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [designIndex, setDesignIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const accent = RARITY_COLORS[rarity];
  const glow = RARITY_GLOW[rarity];

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    DESIGNS[designIndex].draw(ctx, { title, name, rank, accent, glow });
  }, [open, designIndex, title, name, rank, accent, glow]);

  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => canvasRef.current?.toBlob((b) => resolve(b), "image/png"));
  }

  async function download() {
    const blob = await toBlob();
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ascend.png";
    link.click();
    URL.revokeObjectURL(link.href);
    toast.show("Image téléchargée.", "success");
  }

  async function shareNative() {
    setBusy(true);
    try {
      const blob = await toBlob();
      if (!blob) throw new Error("no blob");
      const file = new File([blob], "ascend.png", { type: "image/png" });
      const caption = `Je viens de débloquer « ${title} » sur ASCEND 🚀`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ASCEND", text: caption });
      } else {
        await download();
        await navigator.clipboard?.writeText(caption).catch(() => undefined);
        toast.show("Partage non supporté par ce navigateur — image téléchargée, légende copiée.", "info");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.show("Impossible de partager depuis ce navigateur — essaie de télécharger l'image.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function shareToInstagramStory() {
    setBusy(true);
    try {
      const blob = await toBlob();
      if (!blob) throw new Error("no blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.show("Image copiée — ouverture d'Instagram...", "info");
      window.location.href = "instagram-stories://share";
    } catch {
      toast.show(
        "Ton navigateur ne permet pas l'ouverture directe d'Instagram — télécharge l'image et ajoute-la à ta story manuellement.",
        "info",
      );
    } finally {
      setBusy(false);
    }
  }

  const currentDesign = DESIGNS[designIndex];

  return (
    <Modal open={open} onClose={onClose} title="Partager" className="max-w-sm" zIndexClassName={zIndexClassName}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative h-[400px] w-[225px] overflow-hidden rounded-lg border border-border-strong shadow-lg"
          style={{
            backgroundImage:
              "repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)",
            backgroundSize: "16px 16px",
          }}
        >
          <canvas ref={canvasRef} className="h-full w-full object-cover" />
        </div>
        {currentDesign.transparent && (
          <p className="-mt-2 text-[11px] text-text-muted">Fond transparent — colle-le sur une photo dans Instagram.</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Design précédent"
            onClick={() => setDesignIndex((i) => (i - 1 + DESIGNS.length) % DESIGNS.length)}
            className="rounded-full border border-border-strong p-1.5 text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-24 text-center text-xs font-medium text-text-secondary">{currentDesign.label}</span>
          <button
            type="button"
            aria-label="Design suivant"
            onClick={() => setDesignIndex((i) => (i + 1) % DESIGNS.length)}
            className="rounded-full border border-border-strong p-1.5 text-text-secondary hover:text-text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {DESIGNS.map((d, i) => (
            <button
              key={d.label}
              type="button"
              aria-label={`Design ${d.label}`}
              onClick={() => setDesignIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === designIndex ? "w-5 bg-gold" : "w-1.5 bg-border-strong"}`}
            />
          ))}
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button type="button" onClick={shareNative} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Partager
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={shareToInstagramStory} disabled={busy}>
              <Camera className="h-4 w-4" /> Story Instagram
            </Button>
            <Button type="button" variant="secondary" onClick={download} disabled={busy}>
              <Download className="h-4 w-4" /> Télécharger
            </Button>
          </div>
        </div>
        <p className="text-center text-[11px] text-text-muted">
          « Partager » ouvre le menu de ton téléphone (Instagram, WhatsApp, Messages...). Si Instagram ne
          s&apos;ouvre pas directement en story, colle l&apos;image téléchargée à la main.
        </p>
      </div>
    </Modal>
  );
}
