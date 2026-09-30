"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { timeAgo } from "@/lib/utils";
import { createMetricsLinkAction, revokeMetricsLinksAction } from "./actions";

export function ExcelLinkPanel({
  appUrl,
  activeLinks,
  lastUsedAt,
}: {
  appUrl: string;
  activeLinks: number;
  lastUsedAt: string | null;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [active, setActive] = useState(activeLinks);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const url = (view: "summary" | "monthly", format: "excel" | "sheets") =>
    `${appUrl}/api/admin/metrics?view=${view}&format=${format}&token=${token}`;

  function create() {
    startTransition(async () => {
      const result = await createMetricsLinkAction();
      if (!result.success) return toast.show(result.error, "error");
      setToken(result.data.token);
      setActive((n) => n + 1);
    });
  }

  function revoke() {
    startTransition(async () => {
      const result = await revokeMetricsLinksAction();
      if (!result.success) return toast.show(result.error, "error");
      setToken(null);
      setActive(0);
      setConfirmingRevoke(false);
      toast.show("Liens révoqués.", "success");
    });
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    toast.show("Lien copié.", "success");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={create} disabled={pending}>
          <Link2 className="h-3.5 w-3.5" /> Créer un lien Excel
        </Button>
        {active > 0 &&
          (confirmingRevoke ? (
            <span className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              Les classeurs connectés ne se mettront plus à jour.
              <Button size="sm" variant="danger" onClick={revoke} disabled={pending}>
                Confirmer la révocation
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingRevoke(false)} disabled={pending}>
                Annuler
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmingRevoke(true)} disabled={pending}>
              <ShieldOff className="h-3.5 w-3.5" /> Révoquer les liens ({active})
            </Button>
          ))}
        {lastUsedAt && <span className="text-xs text-text-muted">Dernière actualisation {timeAgo(lastUsedAt)}</span>}
      </div>

      {token && (
        <div className="flex flex-col gap-3 rounded-md border border-gold/30 bg-gold/5 p-4">
          <p className="text-xs font-medium text-gold">
            Copie ces liens maintenant : pour ta sécurité, ils ne seront plus affichés. Quiconque a le lien voit tes chiffres.
          </p>
          {(
            [
              ["Chiffres clés", "summary"],
              ["Évolution mois par mois", "monthly"],
            ] as const
          ).map(([label, view]) => (
            <div key={view} className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={url(view, "excel")}
                  className="w-full truncate rounded-md border border-border-strong bg-card px-2.5 py-1.5 font-mono text-[11px] text-text-secondary"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button size="sm" variant="secondary" onClick={() => copy(url(view, "excel"))}>
                  <Copy className="h-3.5 w-3.5" /> Excel
                </Button>
                <Button size="sm" variant="secondary" onClick={() => copy(url(view, "sheets"))}>
                  <Copy className="h-3.5 w-3.5" /> Google Sheets
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 text-xs text-text-secondary sm:grid-cols-2">
        <div className="rounded-md border border-border p-3">
          <p className="mb-1.5 font-medium text-text-primary">Dans Excel</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Onglet Données → À partir du Web (ou « Obtenir des données » → Web).</li>
            <li>Colle le lien Excel, valide, puis clique sur Charger.</li>
            <li>Données → Actualiser tout met les chiffres à jour. Dans les propriétés de la requête, coche « Actualiser à l&apos;ouverture ».</li>
          </ol>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="mb-1.5 font-medium text-text-primary">Dans Google Sheets</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Dans une cellule vide, tape =IMPORTDATA(&quot;lien Google Sheets&quot;).</li>
            <li>Les chiffres se mettent à jour automatiquement, environ toutes les heures.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
