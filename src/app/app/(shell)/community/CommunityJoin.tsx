"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatWhatsappNumber, normalizeWhatsappNumber } from "@/lib/whatsapp";
import type { MyWhatsappMembership } from "@/services/community.service";
import { leaveWhatsappCommunityAction, saveWhatsappNumberAction } from "./actions";

function Step({ n, done, title, children }: { n: number; done?: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        className={
          done
            ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
            : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-semibold text-gold"
        }
      >
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <div className="mt-1 text-sm text-text-secondary">{children}</div>
      </div>
    </div>
  );
}

export function CommunityJoin({ membership, inviteUrl }: { membership: MyWhatsappMembership | null; inviteUrl: string | null }) {
  const active = membership && !membership.leaveRequestedAt ? membership : null;
  const [editing, setEditing] = useState(!active);
  const [phone, setPhone] = useState(active ? formatWhatsappNumber(active.phone) : "");
  const [consent, setConsent] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const looksValid = normalizeWhatsappNumber(phone) != null;

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveWhatsappNumberAction(phone, consent);
      if (!result.success) return toast.show(result.error, "error");
      setPhone(formatWhatsappNumber(result.data.phone));
      setEditing(false);
      router.refresh();
    });
  }

  function leave() {
    if (!window.confirm("Quitter la communauté WhatsApp Elite ?")) return;
    startTransition(async () => {
      const result = await leaveWhatsappCommunityAction();
      if (!result.success) return toast.show(result.error, "error");
      toast.show("C'est noté : l'équipe te retire de la communauté.", "success");
      router.refresh();
    });
  }

  if (active?.addedAt) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-success/30 bg-success/5 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Check className="h-4 w-4 text-success" /> Tu fais partie de la communauté
        </p>
        <p className="text-sm text-text-secondary">
          Avec le numéro {formatWhatsappNumber(active.phone)}. Tout se passe sur WhatsApp, dans la communauté « ASCEND Elite ».
        </p>
        <div className="flex flex-wrap gap-2">
          {inviteUrl && (
            <Button href={inviteUrl} size="sm">
              <ExternalLink className="h-3.5 w-3.5" /> Ouvrir la communauté
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={leave} disabled={pending}>
            Quitter la communauté
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5">
      <Step n={1} done={!editing} title="Ton numéro WhatsApp">
        {editing ? (
          <form onSubmit={save} className="mt-2 flex flex-col gap-3">
            <Field hint="Celui de ton compte WhatsApp : l'équipe le compare à ta demande d'entrée.">
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                required
              />
            </Field>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#d6a84f]"
              />
              <span>
                J&apos;accepte qu&apos;ASCEND utilise ce numéro pour valider mon entrée dans la communauté et m&apos;en retirer si je
                ne suis plus Elite. Je sais qu&apos;il sera visible des membres des groupes WhatsApp que je rejoins.
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={pending || !looksValid || !consent}>
                {pending ? "Enregistrement..." : "Continuer"}
              </Button>
              {active && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                  Annuler
                </Button>
              )}
            </div>
          </form>
        ) : (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5 font-medium text-text-primary">
              <Smartphone className="h-3.5 w-3.5 text-text-muted" /> {phone}
            </span>
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-text-muted underline hover:text-text-primary">
              Modifier
            </button>
          </p>
        )}
      </Step>

      <Step n={2} title="Rejoins la communauté">
        {editing ? (
          <p className="text-text-muted">Le lien apparaît dès que ton numéro est enregistré.</p>
        ) : inviteUrl ? (
          <div className="mt-2 flex flex-col items-start gap-2">
            <Button href={inviteUrl} size="sm">
              <ExternalLink className="h-3.5 w-3.5" /> Demander à rejoindre sur WhatsApp
            </Button>
            <p className="text-xs text-text-muted">
              WhatsApp envoie ta demande à l&apos;équipe, qui l&apos;accepte après avoir vérifié ton numéro. Tu reçois une
              notification WhatsApp dès que c&apos;est fait.
            </p>
          </div>
        ) : (
          <p>La communauté ouvre très bientôt : le lien pour la rejoindre apparaîtra ici.</p>
        )}
      </Step>
    </div>
  );
}
