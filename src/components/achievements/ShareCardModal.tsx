"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, ChevronLeft, ChevronRight, Camera, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

interface CardParams {
  title: string;
  name: string;
  rank?: string | null;
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

const DESIGNS: { label: string; draw: (ctx: CanvasRenderingContext2D, p: CardParams) => void }[] = [
  {
    label: "Doré",
    draw(ctx, { title, name, rank }) {
      const cx = CARD_WIDTH / 2;
      const bg = ctx.createRadialGradient(cx, 420, 80, cx, 420, 900);
      bg.addColorStop(0, "#1a1508");
      bg.addColorStop(1, "#0a0b0d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      drawLogo(ctx, cx, 300, 90, "#d6a84f");

      ctx.textAlign = "center";
      ctx.fillStyle = "#d6a84f";
      ctx.font = "600 32px system-ui, sans-serif";
      ctx.fillText("ACCOMPLISSEMENT DÉBLOQUÉ", cx, 430);

      ctx.fillStyle = "#f4f1ea";
      ctx.font = "600 96px system-ui, sans-serif";
      const lines = wrapLines(ctx, title, 900);
      drawCenteredLines(ctx, lines, cx, 620, 108);

      ctx.fillStyle = "#a8a29e";
      ctx.font = "400 40px system-ui, sans-serif";
      ctx.fillText(rank ? `${name} · ${rank}` : name, cx, 620 + lines.length * 108 + 70);

      ctx.fillStyle = "#d6a84f";
      ctx.font = "600 34px system-ui, sans-serif";
      ctx.fillText("ASCEND", cx, CARD_HEIGHT - 120);
    },
  },
  {
    label: "Minimal",
    draw(ctx, { title, name, rank }) {
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      const cx = CARD_WIDTH / 2;
      drawLogo(ctx, cx, 300, 80, "#0a0a0a");

      ctx.fillStyle = "#9a722d";
      ctx.textAlign = "center";
      ctx.font = "600 30px system-ui, sans-serif";
      ctx.fillText("ACCOMPLISSEMENT DÉBLOQUÉ", cx, 420);

      ctx.fillStyle = "#0a0a0a";
      ctx.font = "600 92px Georgia, serif";
      const lines = wrapLines(ctx, title, 900);
      drawCenteredLines(ctx, lines, cx, 610, 104);

      const lineY = 610 + lines.length * 104 + 50;
      ctx.strokeStyle = "#d6a84f";
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
    draw(ctx, { title, name, rank }) {
      const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
      bg.addColorStop(0, "#9a722d");
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
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      const pillHeight = 84;
      const pillX = cx - pillWidth / 2;
      const radius = pillHeight / 2;
      ctx.beginPath();
      ctx.moveTo(pillX + radius, pillY - pillHeight / 2);
      ctx.arcTo(pillX + pillWidth, pillY - pillHeight / 2, pillX + pillWidth, pillY + pillHeight / 2, radius);
      ctx.arcTo(pillX + pillWidth, pillY + pillHeight / 2, pillX, pillY + pillHeight / 2, radius);
      ctx.arcTo(pillX, pillY + pillHeight / 2, pillX, pillY - pillHeight / 2, radius);
      ctx.arcTo(pillX, pillY - pillHeight / 2, pillX + pillWidth, pillY - pillHeight / 2, radius);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(pillText, cx, pillY + 12);

      ctx.font = "700 32px system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("ASCEND", cx, CARD_HEIGHT - 120);
    },
  },
];

export function ShareCardModal({
  open,
  onClose,
  title,
  name,
  rank,
  zIndexClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  name: string;
  rank?: string | null;
  zIndexClassName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [designIndex, setDesignIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    DESIGNS[designIndex].draw(ctx, { title, name, rank });
  }, [open, designIndex, title, name, rank]);

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

  return (
    <Modal open={open} onClose={onClose} title="Partager" className="max-w-sm" zIndexClassName={zIndexClassName}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <canvas ref={canvasRef} className="h-[400px] w-[225px] rounded-lg border border-border-strong object-cover shadow-lg" />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Design précédent"
            onClick={() => setDesignIndex((i) => (i - 1 + DESIGNS.length) % DESIGNS.length)}
            className="rounded-full border border-border-strong p-1.5 text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-20 text-center text-xs font-medium text-text-secondary">{DESIGNS[designIndex].label}</span>
          <button
            type="button"
            aria-label="Design suivant"
            onClick={() => setDesignIndex((i) => (i + 1) % DESIGNS.length)}
            className="rounded-full border border-border-strong p-1.5 text-text-secondary hover:text-text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
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
