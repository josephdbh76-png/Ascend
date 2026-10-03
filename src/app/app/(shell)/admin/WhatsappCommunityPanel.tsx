"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, Eye, EyeOff, Link2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatWhatsappNumber } from "@/lib/whatsapp";
import { timeAgo } from "@/lib/utils";
import type { WhatsappMemberRow } from "@/services/community.service";
import {
  deleteWhatsappMemberAction,
  markWhatsappMemberAddedAction,
  setCommunityEnabledAction,
  setCommunityInviteUrlAction,
} from "./actions";

const REMOVE_REASONS: Record<NonNullable<WhatsappMemberRow["removeReason"]>, string> = {
  account_deleted: "a supprimé son compte",
  not_elite: "n'est plus Elite",
  left: "a demandé à quitter la communauté",
};

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({ r, children, note }: { r: WhatsappMemberRow; children?: React.ReactNode; note?: string }) {
  const toast = useToast();

  async function copy(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      toast.show("Numéro copié.", "success");
    } catch {
      toast.show(phone, "info");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-strong bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">
          {r.username ? (
            <Link href={`/profile/${r.username}`} className="hover:text-gold">
              {r.displayName}
            </Link>
          ) : (
            r.displayName
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
          <button type="button" onClick={() => copy(r.phone)} className="flex items-center gap-1 font-semibold tabular-nums text-text-secondary hover:text-text-primary">
            {formatWhatsappNumber(r.phone)} <Copy className="h-3 w-3" />
          </button>
          <span>· demande {timeAgo(r.requestedAt)}</span>
          {note && <span className="text-error">· {note}</span>}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function WhatsappCommunityPanel({
  enabled,
  inviteUrl,
  members,
}: {
  enabled: boolean;
  inviteUrl: string | null;
  members: WhatsappMemberRow[];
}) {
  const [shown, setShown] = useState(enabled);
  const [url, setUrl] = useState(inviteUrl ?? "");
  const [rows, setRows] = useState(members);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const toAccept = rows.filter((r) => !r.addedAt && !r.removeReason);
  const toRemove = rows.filter((r) => r.addedAt && r.removeReason);
  const inCommunity = rows.filter((r) => r.addedAt && !r.removeReason);
  const stale = rows.filter((r) => !r.addedAt && r.removeReason);

  function toggle() {
    startTransition(async () => {
      const result = await setCommunityEnabledAction(!shown);
      if (!result.success) return toast.show(result.error, "error");
      setShown(!shown);
      toast.show(!shown ? "Communauté affichée aux membres." : "Communauté masquée aux membres.", "success");
    });
  }

  function saveUrl(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await setCommunityInviteUrlAction(url);
      if (!result.success) return toast.show(result.error, "error");
      toast.show(url.trim() ? "Lien enregistré : les membres Elite le voient." : "Lien retiré.", "success");
    });
  }

  function run(action: () => Promise<{ success: boolean; error?: string }>, after: (rows: WhatsappMemberRow[]) => WhatsappMemberRow[], message: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) return toast.show(result.error ?? "Erreur.", "error");
      setRows(after);
      toast.show(message, "success");
    });
  }

  const accept = (r: WhatsappMemberRow) =>
    run(
      () => markWhatsappMemberAddedAction(r.id),
      (prev) => prev.map((x) => (x.id === r.id ? { ...x, addedAt: new Date().toISOString() } : x)),
      `${r.displayName} est dans la communauté.`,
    );
  const drop = (r: WhatsappMemberRow, message: string) =>
    run(() => deleteWhatsappMemberAction(r.id), (prev) => prev.filter((x) => x.id !== r.id), message);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-md border border-border-strong bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <span className={shown ? "h-2 w-2 rounded-full bg-success" : "h-2 w-2 rounded-full bg-text-muted"} />
            {shown ? "Visible par les membres" : "Masquée pour les membres"}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {shown
              ? "Le menu Communauté et la page sont affichés, et l'offre Elite mentionne la communauté."
              : "Ni le menu ni la page ne s'affichent, sauf pour les admins. Rien n'est perdu : tout revient en un clic."}
          </p>
        </div>
        <Button size="sm" variant={shown ? "secondary" : "primary"} onClick={toggle} disabled={pending} className="shrink-0">
          {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {shown ? "Masquer aux membres" : "Afficher aux membres"}
        </Button>
      </div>

      <form onSubmit={saveUrl} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Lien d'invitation de la communauté" hint="WhatsApp → ta communauté → Inviter des membres → Copier le lien. Active d'abord « Approuver les nouveaux membres ».">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://chat.whatsapp.com/..." spellCheck={false} />
          </Field>
        </div>
        <Button type="submit" size="sm" disabled={pending} className="sm:mb-6">
          <Link2 className="h-3.5 w-3.5" /> Enregistrer
        </Button>
      </form>

      <Group
        title={`À accepter sur WhatsApp (${toAccept.length})`}
        hint="Accepte dans WhatsApp la demande qui porte ce numéro, puis confirme ici."
      >
        {toAccept.length === 0 ? (
          <p className="text-xs text-text-muted">Aucune demande en attente.</p>
        ) : (
          toAccept.map((r) => (
            <Row key={r.id} r={r}>
              <Button size="sm" onClick={() => accept(r)} disabled={pending}>
                <Check className="h-3.5 w-3.5" /> Accepté sur WhatsApp
              </Button>
              <Button size="sm" variant="ghost" onClick={() => drop(r, "Demande refusée.")} disabled={pending}>
                Refuser
              </Button>
            </Row>
          ))
        )}
      </Group>

      <Group title={`À retirer de WhatsApp (${toRemove.length})`} hint="Retire ce numéro de la communauté dans WhatsApp, puis confirme ici : le numéro est effacé.">
        {toRemove.length === 0 ? (
          <p className="text-xs text-text-muted">Personne à retirer.</p>
        ) : (
          toRemove.map((r) => (
            <Row key={r.id} r={r} note={REMOVE_REASONS[r.removeReason!]}>
              <Button size="sm" variant="danger" onClick={() => drop(r, "Numéro effacé.")} disabled={pending}>
                <UserMinus className="h-3.5 w-3.5" /> Retiré de WhatsApp
              </Button>
            </Row>
          ))
        )}
      </Group>

      {stale.length > 0 && (
        <Group title={`Demandes sans suite (${stale.length})`} hint="Ces membres ont donné leur numéro mais ne sont plus Elite (ou ont supprimé leur compte) : n'accepte pas leur demande.">
          {stale.map((r) => (
            <Row key={r.id} r={r} note={REMOVE_REASONS[r.removeReason!]}>
              <Button size="sm" variant="ghost" onClick={() => drop(r, "Demande effacée.")} disabled={pending}>
                Effacer
              </Button>
            </Row>
          ))}
        </Group>
      )}

      <Group title={`Dans la communauté (${inCommunity.length})`}>
        {inCommunity.length === 0 ? (
          <p className="text-xs text-text-muted">Personne pour l&apos;instant.</p>
        ) : (
          inCommunity.map((r) => <Row key={r.id} r={r} />)
        )}
      </Group>
    </div>
  );
}
