"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cancelJoinRequestAction, joinClanAction, leaveClanAction } from "@/app/app/(shell)/ligue/actions";
import type { ClanAccess } from "@/types/database.types";

export type JoinState =
  | { kind: "guest"; signupHref: string }
  | { kind: "member" }
  | { kind: "requested" }
  | { kind: "none" }
  | { kind: "other"; clanName: string; isLeader: boolean };

export function JoinClanButton({ clanId, access, full, state, invited }: { clanId: string; access: ClanAccess; full: boolean; state: JoinState; invited?: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function act(fn: () => Promise<{ success: true; data: unknown } | { success: false; error: string }>, done: (data: unknown) => string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) return toast.show(result.error, "error");
      toast.show(done(result.data), "success");
      router.refresh();
    });
  }

  if (state.kind === "guest") {
    return (
      <Button href={state.signupHref} size="lg">
        <Users className="h-4 w-4" /> {invited || access === "open" ? "Rejoindre la ligue" : "S'inscrire pour la rejoindre"}
      </Button>
    );
  }
  if (state.kind === "member") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button href="/app/ligue" size="lg">
          <Check className="h-4 w-4" /> Ouvrir ma ligue
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => confirm("Quitter la ligue ?") && act(() => leaveClanAction(), () => "Tu as quitté la ligue.")}
        >
          <LogOut className="h-3.5 w-3.5" /> Quitter
        </Button>
      </div>
    );
  }
  if (state.kind === "requested") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-2 text-sm text-text-secondary">
          <Clock className="h-4 w-4" /> Demande envoyée
        </span>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => act(() => cancelJoinRequestAction(clanId), () => "Demande annulée.")}>
          Annuler
        </Button>
      </div>
    );
  }
  if (full) return <p className="text-sm text-text-muted">Cette ligue est complète.</p>;
  const label = access === "open" || invited ? "Rejoindre la ligue" : "Demander à rejoindre";
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        size="lg"
        disabled={pending}
        onClick={() => act(() => joinClanAction(clanId), (o) => (o === "requested" ? "Demande envoyée au chef." : "Bienvenue dans la ligue !"))}
      >
        <Users className="h-4 w-4" /> {label}
      </Button>
      {state.kind === "other" && (
        <p className="text-xs text-text-muted">
          Tu quitteras {state.clanName}
          {state.isLeader ? " et ton rôle de chef passera à ton adjoint le plus ancien" : ""} : on ne fait partie que d&apos;une ligue à la fois.
        </p>
      )}
    </div>
  );
}
