"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { joinLeagueAction, leaveLeagueAction } from "@/app/ligues/actions";

export type JoinState = { kind: "guest"; signupHref: string } | { kind: "member" } | { kind: "none" } | { kind: "other"; leagueName: string };

export function JoinLeagueButton({ leagueId, slug, state }: { leagueId: string; slug: string; state: JoinState }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  if (state.kind === "guest") {
    return (
      <Button href={state.signupHref} size="lg">
        <Users className="h-4 w-4" /> Rejoindre la ligue
      </Button>
    );
  }

  function run(action: () => Promise<{ success: boolean; error?: string }>, done: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.show(result.error ?? "Une erreur est survenue.", "error");
        return;
      }
      toast.show(done, "success");
      router.refresh();
    });
  }

  if (state.kind === "member") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success">
          <Check className="h-4 w-4" /> Tu fais partie de cette ligue
        </span>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => leaveLeagueAction(slug), "Tu as quitté la ligue.")}>
          <LogOut className="h-3.5 w-3.5" /> Quitter
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button size="lg" disabled={pending} onClick={() => run(() => joinLeagueAction(leagueId, slug), "Bienvenue dans la ligue !")}>
        <Users className="h-4 w-4" /> Rejoindre la ligue
      </Button>
      {state.kind === "other" && (
        <p className="text-xs text-text-muted">
          Tu quitteras {state.leagueName} : on ne fait partie que d&apos;une ligue à la fois.
        </p>
      )}
    </div>
  );
}
