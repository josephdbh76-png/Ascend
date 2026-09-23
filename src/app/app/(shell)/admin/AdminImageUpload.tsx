"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Field } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { uploadAdminImageAction } from "./actions";

export function AdminImageUpload({
  value,
  onChange,
  hint,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    setUploading(true);
    uploadAdminImageAction(formData).then((result) => {
      setUploading(false);
      if (!result.success) return toast.show(result.error, "error");
      onChange(result.data.url);
    });
  }

  return (
    <Field label="Image" hint={hint ?? "Format recommandé : 1200×400px (ratio 3:1). JPG, PNG ou WebP, 5 Mo max."}>
      {value ? (
        <div className="relative overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-32 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Retirer l'image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border-strong text-xs text-text-muted hover:border-gold/50 hover:text-text-secondary"
        >
          <ImagePlus className="h-5 w-5" />
          {uploading ? "Envoi..." : "Choisir une image"}
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onSelect} />
    </Field>
  );
}
