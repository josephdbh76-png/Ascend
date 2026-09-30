import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/** The creator's cover, or a quiet placeholder so cards keep the same rhythm. */
export function TrainingCover({ src, className }: { src: string | null; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-card-elevated", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(214,168,79,0.22),transparent_60%),linear-gradient(160deg,#16171b,#0d0e11)]">
          <GraduationCap className="h-8 w-8 text-gold/70" />
        </div>
      )}
    </div>
  );
}
