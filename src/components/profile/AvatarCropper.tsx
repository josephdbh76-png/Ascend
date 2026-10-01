"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const VIEW = 288; // crop area, px
const OUT = 512; // exported avatar, px
const MAX_ZOOM = 4;

type Point = { x: number; y: number };

/**
 * Pick what goes in the round profile photo: drag to move, zoom with the
 * slider, the wheel or a pinch, arrows and +/- on the keyboard.
 */
export function AvatarCropper({
  file,
  pending,
  onCancel,
  onConfirm,
}: {
  file: File;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}) {
  const [url] = useState(() => URL.createObjectURL(file));
  const imgRef = useRef<HTMLImageElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ start: Point; offset: Point; distance: number; zoom: number } | null>(null);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const base = natural ? Math.max(VIEW / natural.w, VIEW / natural.h) : 1;
  const scale = base * zoom;

  function clamp(o: Point, z: number): Point {
    if (!natural) return o;
    const s = base * z;
    const maxX = Math.max(0, (natural.w * s - VIEW) / 2);
    const maxY = Math.max(0, (natural.h * s - VIEW) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  }

  function setZoomKeepingFrame(next: number) {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    // Zoom around the centre of the circle.
    setOffset((o) => clamp({ x: (o.x * z) / zoom, y: (o.y * z) / zoom }, z));
    setZoom(z);
  }

  // The wheel needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoomKeepingFrame(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { start: { x: e.clientX, y: e.clientY }, offset, distance: distance(), zoom };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size >= 2 && g.distance > 0) {
      setZoomKeepingFrame((g.zoom * distance()) / g.distance);
      return;
    }
    setOffset(clamp({ x: g.offset.x + e.clientX - g.start.x, y: g.offset.y + e.clientY - g.start.y }, zoom));
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    const rest = [...pointers.current.values()][0];
    gesture.current = rest ? { start: rest, offset, distance: 0, zoom } : null;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, Point> = { ArrowLeft: { x: step, y: 0 }, ArrowRight: { x: -step, y: 0 }, ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step } };
    if (moves[e.key]) {
      e.preventDefault();
      setOffset((o) => clamp({ x: o.x + moves[e.key].x, y: o.y + moves[e.key].y }, zoom));
    } else if (e.key === "+" || e.key === "=") {
      setZoomKeepingFrame(zoom * 1.1);
    } else if (e.key === "-") {
      setZoomKeepingFrame(zoom / 1.1);
    }
  }

  async function confirm() {
    const img = imgRef.current;
    if (!img || !natural) return;
    const left = VIEW / 2 + offset.x - (natural.w * scale) / 2;
    const top = VIEW / 2 + offset.y - (natural.h * scale) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -left / scale, -top / scale, VIEW / scale, VIEW / scale, 0, 0, OUT, OUT);
    const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
    let blob = await toBlob("image/webp");
    if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
    if (!blob) return;
    onConfirm(new File([blob], `photo.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type }));
  }

  return (
    <Modal open onClose={pending ? () => {} : onCancel} title="Recadrer ta photo">
      <div className="flex flex-col items-center gap-4">
        <div
          ref={viewRef}
          role="application"
          aria-label="Zone de recadrage : glisse pour déplacer, flèches du clavier pour ajuster, + et - pour zoomer"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="relative cursor-grab touch-none select-none overflow-hidden rounded-md bg-black outline-none focus-visible:ring-2 focus-visible:ring-gold active:cursor-grabbing"
          style={{ width: VIEW, height: VIEW }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="pointer-events-none absolute max-w-none"
            style={
              natural
                ? {
                    width: natural.w * scale,
                    height: natural.h * scale,
                    left: VIEW / 2 + offset.x - (natural.w * scale) / 2,
                    top: VIEW / 2 + offset.y - (natural.h * scale) / 2,
                  }
                : { opacity: 0 }
            }
          />
          {/* Darkens everything outside the circle. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ring-2 ring-white/70" />
        </div>

        <div className="flex w-full max-w-[288px] items-center gap-3">
          <button
            type="button"
            onClick={() => setZoomKeepingFrame(zoom / 1.2)}
            className="rounded-md p-1.5 text-text-muted hover:text-text-primary"
            aria-label="Dézoomer"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomKeepingFrame(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1 w-full accent-[#f5c451]"
          />
          <button
            type="button"
            onClick={() => setZoomKeepingFrame(zoom * 1.2)}
            className="rounded-md p-1.5 text-text-muted hover:text-text-primary"
            aria-label="Zoomer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <p className="text-center text-xs text-text-muted">Fais glisser la photo pour choisir ce qui apparaît dans le cercle.</p>

        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button type="button" size="sm" onClick={confirm} disabled={pending || !natural}>
            {pending ? "Envoi..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
