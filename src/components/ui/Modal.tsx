"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  zIndexClassName = "z-50",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Override when this modal must stack above another already-open one (e.g. sharing from within a celebration overlay). */
  zIndexClassName?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useFocusTrap(dialogRef, open);

  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 flex items-center justify-center p-4", zIndexClassName)}>
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[85vh] w-full max-w-md flex-col rounded-lg border border-border-strong bg-card-elevated p-6 shadow-2xl animate-fade-up focus:outline-none",
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between">
          {title && (
            <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="ml-auto rounded-sm p-1 text-text-muted hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
