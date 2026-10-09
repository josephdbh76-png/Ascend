"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, Swords, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  cancelDeclarationAction,
  declareWarAction,
  leaveClanAction,
  respondJoinRequestAction,
  respondWarAction,
} from "@/app/app/(shell)/ligue/actions";
import { ClanEmblem } from "./ClanEmblem";

type Result = { success: true; data: unknown } | { success: false; error: string };

function useAct() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const act = (fn: () => Promise<Result>, done: string, after?: () => void) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.success) return toast.show(result.error, "error");
      toast.show(done, "success");
      after?.();
      router.refresh();
    });
  return { pending, act };
}

export function RespondWarButtons({ warId, opponent }: { warId: string; opponent: string }) {
  const { pending, act } = useAct();
  return (
    <>
      <Button disabled={pending} onClick={() => act(() => respondWarAction(warId, true), `Guerre contre ${opponent} acceptée !`)}>
        <Swords className="h-4 w-4" /> Accepter la guerre
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => confirm(`Refuser la guerre de ${opponent} ?`) && act(() => respondWarAction(warId, false), "Guerre refusée.")}>
        Refuser
      </Button>
    </>
  );
}

export function CancelDeclarationButton({ warId }: { warId: string }) {
  const { pending, act } = useAct();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => act(() => cancelDeclarationAction(warId), "Déclaration annulée.")}>
      Annuler la déclaration
    </Button>
  );
}

export interface OpponentOption {
  id: string;
  name: string;
  emblem: string;
  color: string;
  trophies: number;
  memberCount: number;
  verifiedCount: number;
  blockedBy: string | null;
}

/** Picks the league to challenge, closest in trophies first. */
export function DeclareWarButton({ opponents, disabledReason }: { opponents: OpponentOption[]; disabledReason?: string | null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { pending, act } = useAct();
  const shown = opponents.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      <Button size="lg" disabled={!!disabledReason} title={disabledReason ?? undefined} onClick={() => setOpen(true)}>
        <Swords className="h-4 w-4" /> Déclarer une guerre
      </Button>
      {disabledReason && <p className="text-xs text-text-muted">{disabledReason}</p>}
      <Modal open={open} onClose={() => setOpen(false)} title="Choisis ton adversaire">
        <div className="flex flex-col gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher une ligue"
            className="w-full rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
          />
          <ul className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
            {shown.map((o) => (
              <li key={o.id} className={cn("flex items-center gap-3 rounded-md border border-border-strong p-3", o.blockedBy && "opacity-60")}>
                <ClanEmblem emblem={o.emblem} color={o.color} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{o.name}</span>
                  <span className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="flex items-center gap-0.5">
                      <Trophy className="h-3 w-3 text-gold" /> {o.trophies}
                    </span>
                    · {o.memberCount} membres · {o.verifiedCount} vérifiés
                  </span>
                  {o.blockedBy && <span className="block text-xs text-text-muted">{o.blockedBy}</span>}
                </span>
                <Button
                  size="sm"
                  disabled={pending || !!o.blockedBy}
                  onClick={() => act(() => declareWarAction(o.id), `Guerre déclarée à ${o.name} !`, () => setOpen(false))}
                >
                  Défier
                </Button>
              </li>
            ))}
            {shown.length === 0 && <li className="py-6 text-center text-sm text-text-muted">Aucune ligue à défier pour l&apos;instant.</li>}
          </ul>
        </div>
      </Modal>
    </>
  );
}

export function JoinRequestButtons({ clanId, userId, name }: { clanId: string; userId: string; name: string }) {
  const { pending, act } = useAct();
  return (
    <span className="flex shrink-0 gap-1.5">
      <Button size="sm" disabled={pending} onClick={() => act(() => respondJoinRequestAction(clanId, userId, true), `${name} a rejoint la ligue.`)}>
        <Check className="h-3.5 w-3.5" /> Accepter
      </Button>
      <Button variant="ghost" size="sm" aria-label={`Refuser ${name}`} disabled={pending} onClick={() => act(() => respondJoinRequestAction(clanId, userId, false), "Demande refusée.")}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </span>
  );
}

export function LeaveClanButton({ isLeader }: { isLeader: boolean }) {
  const { pending, act } = useAct();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        confirm(isLeader ? "Quitter la ligue ? Ton rôle de chef passera à ton adjoint le plus ancien (ou au membre le plus ancien)." : "Quitter la ligue ?") &&
        act(() => leaveClanAction(), "Tu as quitté la ligue.")
      }
    >
      <LogOut className="h-3.5 w-3.5" /> Quitter la ligue
    </Button>
  );
}
