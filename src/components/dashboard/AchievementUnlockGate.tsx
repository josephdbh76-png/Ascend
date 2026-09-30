"use client";

import { useState } from "react";
import { AchievementUnlockModal } from "@/components/achievements/AchievementUnlockModal";
import { markNotificationReadAction } from "@/app/app/(shell)/dashboard/actions";
import type { AchievementRarity } from "@/types/database.types";

export function AchievementUnlockGate({
  notificationId,
  achievementId,
  achievementName,
  achievementDescription,
  achievementRarity,
  username,
}: {
  notificationId: string;
  achievementId: string;
  achievementName: string;
  achievementDescription: string;
  achievementRarity: AchievementRarity;
  username: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <AchievementUnlockModal
      notificationId={notificationId}
      achievementId={achievementId}
      achievementName={achievementName}
      achievementDescription={achievementDescription}
      achievementRarity={achievementRarity}
      username={username}
      onDismiss={(id) => {
        setDismissed(true);
        markNotificationReadAction(id);
      }}
    />
  );
}
