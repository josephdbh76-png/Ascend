"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShareCardButton } from "@/components/achievements/ShareCardButton";
import type { AchievementRarity } from "@/types/database.types";

const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: "#a8a9ad",
  rare: "#749ef1",
  epic: "#a289ff",
  legendary: "#d6a84f",
};

interface Particle {
  id: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
  size: number;
  delay: number;
  isSquare: boolean;
}

function ConfettiBurst({ accent }: { accent: string }) {
  // Random per-particle trajectories only ever need to be picked once, at
  // mount — a lazy useState initializer (unlike useMemo) is exempt from
  // React's purity rule for impure calls during render, which is the
  // React-recommended place for one-off randomness like this.
  const [particles] = useState<Particle[]>(() => {
    const colors = [accent, "#d6a84f", "#e8c875", "#ffffff"];
    return Array.from({ length: 26 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 90 + Math.random() * 170;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * 0.8 - 20,
        rotate: Math.random() * 360,
        color: colors[i % colors.length],
        size: 5 + Math.random() * 7,
        delay: Math.random() * 0.12,
        isSquare: i % 2 === 0,
      };
    });
  });

  return (
    <div className="pointer-events-none absolute left-1/2 top-[104px] h-0 w-0">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isSquare ? 2 : "50%",
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.4 }}
          transition={{ duration: 1.1, delay: 0.15 + p.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

export function AchievementUnlockModal({
  notificationId,
  achievementName,
  achievementDescription,
  achievementRarity,
  username,
  onDismiss,
}: {
  notificationId: string;
  achievementName: string;
  achievementDescription: string;
  achievementRarity: AchievementRarity;
  username: string;
  onDismiss: (id: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const accent = RARITY_COLORS[achievementRarity];

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
            className="relative flex w-full max-w-sm flex-col items-center gap-4 overflow-visible rounded-lg border bg-card-elevated p-8 text-center shadow-[0_0_60px_-15px_rgba(245,196,81,0.5)]"
            style={{ borderColor: `${accent}4d` }}
          >
            <ConfettiBurst accent={accent} />

            <div className="relative flex h-20 w-20 items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: accent }}
                initial={{ scale: 0.6, opacity: 0.9 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
              />
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex h-20 w-20 items-center justify-center rounded-full border"
                style={{ borderColor: `${accent}80`, backgroundColor: `${accent}1a`, boxShadow: `0 0 40px -8px ${accent}99` }}
              >
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
                >
                  <Award className="h-9 w-9" style={{ color: accent }} />
                </motion.div>
              </motion.div>
            </div>

            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: accent }}
            >
              Accomplissement débloqué
            </motion.span>

            <motion.h2
              id="achievement-title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="relative overflow-hidden text-xl font-semibold uppercase tracking-tight text-text-primary"
            >
              {achievementName}
              <motion.span
                aria-hidden
                className="absolute inset-y-0 w-1/3"
                style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent)" }}
                initial={{ x: "-150%" }}
                animate={{ x: "350%" }}
                transition={{ delay: 0.9, duration: 0.9, ease: "easeInOut" }}
              />
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="text-sm text-text-secondary"
            >
              {achievementDescription}
            </motion.p>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65, duration: 0.4 }}>
              <ShareCardButton
                title={achievementName}
                name={`@${username}`}
                rarity={achievementRarity}
                zIndexClassName="z-[110]"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="mt-2 flex w-full flex-col gap-2 sm:flex-row"
            >
              <Button variant="secondary" className="flex-1" onClick={close}>
                Continuer
              </Button>
              <Button className="flex-1" onClick={viewProfile}>
                Voir mon profil
              </Button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
