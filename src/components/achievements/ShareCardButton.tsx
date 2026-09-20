"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function ShareCardButton({ title, name, rank }: { title: string; name: string; rank?: string | null }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function share() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ title, name });
      if (rank) params.set("rank", rank);
      const url = `${window.location.origin}/api/share/card?${params.toString()}`;
      const caption = `Je viens de débloquer « ${title} » sur ASCEND 🚀`;

      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "ascend.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ASCEND", text: caption });
        return;
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "ascend.png";
      link.click();
      URL.revokeObjectURL(link.href);

      await navigator.clipboard?.writeText(caption).catch(() => undefined);
      toast.show("Image téléchargée et légende copiée — prêt à partager.", "success");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // user closed the native share sheet
      toast.show("Impossible de générer l'image de partage.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={loading}
      className="flex items-center gap-1.5 text-[11px] font-medium text-gold hover:text-gold-light disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
      Partager
    </button>
  );
}
