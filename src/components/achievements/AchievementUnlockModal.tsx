"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AchievementUnlockModal({
  notificationId,
  achievementName,
  achievementDescription,
  username,
  onDismiss,
}: {
  notificationId: string;
  achievementName: string;
  achievementDescription: string;
  username: string;
  onDismiss: (id: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function close() {
    setOpen(false);
    onDismiss(notificationId);
  }

  function viewProfile() {
    close();
    router.push(`/profile/${username}`);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="achievement-title"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-gold/30 bg-card-elevated p-8 text-center shadow-[0_0_60px_-15px_rgba(245,196,81,0.5)]"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/50 bg-gold/10 shadow-[0_0_40px_-8px_rgba(245,196,81,0.6)]"
            >
              <Award className="h-9 w-9 text-gold" />
            </motion.div>

            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Accomplissement débloqué
            </span>
            <h2 id="achievement-title" className="text-xl font-semibold uppercase tracking-tight text-text-primary">
              {achievementName}
            </h2>
            <p className="text-sm text-text-secondary">{achievementDescription}</p>

            <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
              <Button variant="secondary" className="flex-1" onClick={close}>
                Continuer
              </Button>
              <Button className="flex-1" onClick={viewProfile}>
                Voir mon profil
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
