"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { setBetaModeAction } from "./actions";

export function BetaModePanel({
  enabled,
  since,
  joinedSinceStart,
  activePaidSubscriptions,
}: {
  enabled: boolean;
  since: string | null;
  joinedSinceStart: number;
  activePaidSubscriptions: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      const result = await setBetaModeAction(!enabled);
      if (!result.success) return toast.show(result.error, "error");
      setConfirming(false);
      toast.show(enabled ? "Bêta désactivée : les paiements sont rouverts." : "Bêta activée : Elite offert à tous.", "success");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <FlaskConical className="h-5 w-5 text-gold" />
        <Badge variant={enabled ? "gold" : "neutral"}>{enabled ? "Bêta active" : "Bêta désactivée"}</Badge>
        {enabled && since && (
          <span className="text-sm text-text-secondary">
            depuis le {new Date(since).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
            {joinedSinceStart} inscrit{joinedSinceStart > 1 ? "s" : ""} depuis
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-bg-primary/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Quand la bêta est active</p>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-sm text-text-secondary">
            <li>Tous les membres ont accès à Elite, sans abonnement, y compris ceux qui s&apos;inscrivent.</li>
            <li>Aucun paiement ne passe par ASCEND : abonnements, titres payants et Marché sont fermés.</li>
            <li>Chaque écran concerné explique pourquoi, et l&apos;inscription affiche « Bêta ouverte : Elite offert ».</li>
          </ul>
        </div>
        <div className="rounded-md border border-border bg-bg-primary/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Quand vous la désactivez</p>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-sm text-text-secondary">
            <li>Chacun retrouve son abonnement réel (gratuit pour la plupart) et les paiements rouvrent.</li>
            <li>Les titres vendus « 7 jours au lancement » (Pionnier) sont mis en vente : leur compte à rebours démarre.</li>
            <li>Les formations publiées pendant la bêta restent en ligne.</li>
            <li>Pour prolonger quelqu&apos;un, passez son compte en Elite dans Membres.</li>
          </ul>
        </div>
      </div>

      {activePaidSubscriptions > 0 && (
        <p className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-text-primary">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
          {activePaidSubscriptions} abonnement{activePaidSubscriptions > 1 ? "s payants sont actifs" : " payant est actif"} dans Stripe. La
          bêta n&apos;arrête pas leur facturation : prévenez ces abonnés ou mettez leur abonnement en pause depuis Stripe.
        </p>
      )}

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-secondary">
            {enabled ? "Rouvrir les paiements et revenir aux abonnements réels ?" : "Offrir Elite à tous et fermer les paiements ?"}
          </span>
          <Button size="sm" variant={enabled ? "danger" : "primary"} onClick={toggle} disabled={pending}>
            {pending ? "Enregistrement..." : enabled ? "Désactiver la bêta" : "Activer la bêta"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
            Annuler
          </Button>
        </div>
      ) : (
        <Button size="sm" variant={enabled ? "secondary" : "primary"} onClick={() => setConfirming(true)} className="self-start">
          {enabled ? "Désactiver la bêta" : "Activer la bêta"}
        </Button>
      )}
    </div>
  );
}
