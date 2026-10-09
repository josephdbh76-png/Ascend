"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { kickMemberAction, setMemberRoleAction } from "@/app/app/(shell)/ligue/actions";
import type { ClanRole } from "@/types/database.types";

/** The chief's (and co-leaders') menu on a member's row. */
export function MemberActions({ targetId, targetName, targetRole, actorRole }: { targetId: string; targetName: string; targetRole: ClanRole; actorRole: ClanRole }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const items: { label: string; danger?: boolean; confirm?: string; run: () => ReturnType<typeof kickMemberAction>; done: string }[] = [];
  if (actorRole === "leader") {
    if (targetRole === "member") items.push({ label: "Nommer adjoint", run: () => setMemberRoleAction(targetId, "coleader"), done: `${targetName} est adjoint.` });
    if (targetRole === "coleader") items.push({ label: "Repasser membre", run: () => setMemberRoleAction(targetId, "member"), done: `${targetName} est membre.` });
    items.push({
      label: "Lui confier la ligue",
      confirm: `Confier le rôle de chef à ${targetName} ? Tu deviendras adjoint.`,
      run: () => setMemberRoleAction(targetId, "leader"),
      done: `${targetName} est le nouveau chef.`,
    });
  }
  if ((actorRole === "leader" && targetRole !== "leader") || (actorRole === "coleader" && targetRole === "member")) {
    items.push({ label: "Exclure", danger: true, confirm: `Exclure ${targetName} de la ligue ?`, run: () => kickMemberAction(targetId), done: `${targetName} a été exclu.` });
  }
  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Actions pour ${targetName}`}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className="rounded-md p-1.5 text-text-muted hover:bg-card-active hover:text-text-primary"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-52 overflow-hidden rounded-md border border-border-strong bg-card-elevated py-1 shadow-xl">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                if (item.confirm && !confirm(item.confirm)) return;
                setOpen(false);
                startTransition(async () => {
                  const result = await item.run();
                  if (!result.success) return toast.show(result.error, "error");
                  toast.show(item.done, "success");
                  router.refresh();
                });
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-card-active ${item.danger ? "text-error" : "text-text-primary"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
