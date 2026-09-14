"use client";

import { useState, useTransition } from "react";
import { Bell, Trophy, TrendingUp, Flag, CheckCircle2, Sparkles } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { markAllNotificationsReadAction } from "@/app/app/(shell)/actions";
import type { NotificationType } from "@/types/database.types";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

const ICONS: Record<NotificationType, typeof Bell> = {
  achievement_unlocked: Trophy,
  rank_increased: TrendingUp,
  challenge_started: Flag,
  milestone_reached: Sparkles,
  verification_completed: CheckCircle2,
};

export function NotificationBell({ initial, unreadCount }: { initial: NotificationItem[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initial);
  const [unread, setUnread] = useState(unreadCount);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      startTransition(() => {
        markAllNotificationsReadAction();
      });
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative rounded-md p-2 text-text-muted hover:text-text-primary"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-[#0a0a0a]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-border-strong bg-card-elevated shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-text-primary">Notifications</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-muted">
                  Rien de nouveau pour l&apos;instant.
                </p>
              ) : (
                items.map((n) => {
                  const Icon = ICONS[n.type];
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "flex gap-3 border-b border-border px-4 py-3 last:border-0",
                        !n.readAt && "bg-gold/5",
                      )}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
                        <Icon className="h-4 w-4 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{n.title}</p>
                        <p className="mt-0.5 text-xs text-text-secondary">{n.body}</p>
                        <p className="mt-1 text-[11px] text-text-muted">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
