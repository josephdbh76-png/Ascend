"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { setEmailTypeEnabledAction } from "./actions";
import type { EmailToggleGroup } from "@/services/notification.service";

export function EmailToggleGroupsPanel({ groups: initial }: { groups: EmailToggleGroup[] }) {
  const [groups, setGroups] = useState(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggle(group: EmailToggleGroup) {
    const nextEnabled = !group.enabled;
    setGroups((prev) => prev.map((g) => (g.key === group.key ? { ...g, enabled: nextEnabled } : g)));
    startTransition(async () => {
      const result = await setEmailTypeEnabledAction(group.key, nextEnabled);
      if (!result.success) {
        setGroups((prev) => prev.map((g) => (g.key === group.key ? { ...g, enabled: group.enabled } : g)));
        toast.show(result.error, "error");
      }
    });
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {groups.map((g) => (
        <label
          key={g.key}
          className="flex cursor-pointer items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <span className="text-sm text-text-secondary">{g.label}</span>
          <input
            type="checkbox"
            checked={g.enabled}
            onChange={() => toggle(g)}
            disabled={pending}
            className="h-4 w-4 shrink-0 accent-gold"
          />
        </label>
      ))}
    </div>
  );
}
