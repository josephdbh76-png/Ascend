"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Copy, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { PromoCodeRow, PromoPlan } from "@/services/promo.service";
import { createPromoCodeAction, setPromoCodeActiveAction } from "./actions";

const PLAN_LABEL: Record<PromoPlan, string> = { pro: "Pro", elite: "Elite" };

function discountLabel(c: PromoCodeRow) {
  if (c.percentOff != null) return `-${c.percentOff} %`;
  if (c.amountOffCents != null) return `-${(c.amountOffCents / 100).toLocaleString("fr-FR")} €`;
  return "?";
}

function durationLabel(c: Pick<PromoCodeRow, "duration" | "durationInMonths">) {
  if (c.duration === "forever") return "Tant que l'abonnement dure";
  if (c.duration === "repeating") return `${c.durationInMonths} mois`;
  return "1er paiement";
}

export function PromoCodesPanel({ codes, error }: { codes: PromoCodeRow[]; error: string | null }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function toggle(c: PromoCodeRow) {
    startTransition(async () => {
      const result = await setPromoCodeActiveAction(c.id, !c.active);
      if (!result.success) return toast.show(result.error, "error");
      toast.show(c.active ? `${c.code} désactivé.` : `${c.code} réactivé.`, "success");
      router.refresh();
    });
  }

  function copy(code: string) {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-secondary">
          Les membres tapent le code sur la page de paiement Stripe, au moment de s&apos;abonner. Pendant la bêta, aucun paiement : les
          codes servent après.
        </p>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!!error} className="shrink-0">
          <Plus className="h-3.5 w-3.5" /> Nouveau code
        </Button>
      </div>

      {error ? (
        <p className="flex items-start gap-2 rounded-md border border-error/30 bg-error/5 p-3 text-xs text-error">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Impossible de lire les codes dans Stripe : {error}
        </p>
      ) : codes.length === 0 ? (
        <p className="text-xs text-text-muted">Aucun code promo dans Stripe pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="pb-2 font-medium">Code</th>
                <th className="pb-2 font-medium">Réduction</th>
                <th className="pb-2 font-medium">Durée</th>
                <th className="pb-2 font-medium">Offres</th>
                <th className="pb-2 font-medium">Utilisé</th>
                <th className="pb-2 font-medium">État</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="py-2.5 pr-3">
                    <button
                      type="button"
                      onClick={() => copy(c.code)}
                      className="inline-flex items-center gap-1.5 font-mono text-sm text-text-primary hover:text-gold"
                      aria-label={`Copier ${c.code}`}
                    >
                      {c.code}
                      {copied === c.code ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-text-muted" />}
                    </button>
                    {c.influencer && <p className="text-[11px] text-text-muted">Influenceur : {c.influencer}</p>}
                    {c.firstTimeOnly && <p className="text-[11px] text-text-muted">Premier abonnement seulement</p>}
                  </td>
                  <td className="py-2.5 pr-3 font-semibold text-gold">{discountLabel(c)}</td>
                  <td className="py-2.5 pr-3 text-xs text-text-secondary">{durationLabel(c)}</td>
                  <td className="py-2.5 pr-3 text-xs text-text-secondary">
                    {c.plans ? c.plans.map((p) => PLAN_LABEL[p]).join(" + ") || "Autre produit" : "Tout"}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-text-secondary">
                    {c.timesRedeemed}
                    {c.maxRedemptions != null && ` / ${c.maxRedemptions}`}
                    {c.expiresAt && (
                      <p className="text-[11px] text-text-muted">
                        jusqu&apos;au {new Date(c.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {c.usable ? (
                      <Badge variant="success">Actif</Badge>
                    ) : c.active ? (
                      <Badge variant="gold">Épuisé ou expiré</Badge>
                    ) : (
                      <Badge variant="neutral">Désactivé</Badge>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    {!c.influencer && (
                      <Button variant="secondary" size="sm" onClick={() => toggle(c)} disabled={pending}>
                        <Power className="h-3.5 w-3.5" /> {c.active ? "Désactiver" : "Réactiver"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <NewPromoCode
          pending={pending}
          onClose={() => setOpen(false)}
          onSubmit={(input) =>
            startTransition(async () => {
              const result = await createPromoCodeAction(input);
              if (!result.success) return toast.show(result.error, "error");
              toast.show(`Code ${input.code.trim().toUpperCase()} créé dans Stripe.`, "success");
              setOpen(false);
              router.refresh();
            })
          }
        />
      )}
    </div>
  );
}

function NewPromoCode({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: Parameters<typeof createPromoCodeAction>[0]) => void;
}) {
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("15");
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">("once");
  const [months, setMonths] = useState("3");
  const [plans, setPlans] = useState<PromoPlan[]>(["pro", "elite"]);
  const [maxUses, setMaxUses] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [firstTimeOnly, setFirstTimeOnly] = useState(true);

  const summary = `${kind === "percent" ? `-${value || "?"} %` : `-${value || "?"} €`} sur ${plans.map((p) => PLAN_LABEL[p]).join(" et ") || "?"}, ${
    duration === "once" ? "le premier paiement" : duration === "repeating" ? `pendant ${months || "?"} mois` : "tant que l'abonnement dure"
  }${firstTimeOnly ? ", pour un premier abonnement" : ""}.`;

  return (
    <Modal open onClose={onClose} title="Nouveau code promo">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            code,
            kind,
            value: Number(value.replace(",", ".")),
            duration,
            durationInMonths: duration === "repeating" ? Number(months) : null,
            plans,
            maxRedemptions: maxUses ? Number(maxUses) : null,
            expiresOn: expiresOn || null,
            firstTimeOnly,
          });
        }}
      >
        <Field label="Code" htmlFor="promo-code" hint="Ce que les membres tapent. Lettres, chiffres, - ou _.">
          <Input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="ASCEND15"
            className="font-mono uppercase"
            required
            maxLength={30}
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="promo-kind">
            <Select id="promo-kind" value={kind} onChange={(e) => setKind(e.target.value as "percent" | "amount")}>
              <option value="percent">Pourcentage</option>
              <option value="amount">Montant en €</option>
            </Select>
          </Field>
          <Field label={kind === "percent" ? "Réduction (%)" : "Réduction (€)"} htmlFor="promo-value">
            <Input id="promo-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Durée" htmlFor="promo-duration" hint="Sur un abonnement mensuel.">
            <Select id="promo-duration" value={duration} onChange={(e) => setDuration(e.target.value as typeof duration)}>
              <option value="once">Premier paiement</option>
              <option value="repeating">Plusieurs mois</option>
              <option value="forever">Tant que l&apos;abonnement dure</option>
            </Select>
          </Field>
          {duration === "repeating" && (
            <Field label="Nombre de mois" htmlFor="promo-months">
              <Input id="promo-months" type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value)} required />
            </Field>
          )}
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-text-primary">Valable sur</legend>
          <div className="flex gap-2">
            {(["pro", "elite"] as PromoPlan[]).map((p) => {
              const checked = plans.includes(p);
              return (
                <label
                  key={p}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                    checked ? "border-gold bg-gold/10 text-text-primary" : "border-border-strong text-text-secondary",
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#f5c451]"
                    checked={checked}
                    onChange={() => setPlans((prev) => (checked ? prev.filter((x) => x !== p) : [...prev, p]))}
                  />
                  {PLAN_LABEL[p]}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Utilisations max (facultatif)" htmlFor="promo-max">
            <Input id="promo-max" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Illimité" />
          </Field>
          <Field label="Valable jusqu'au (facultatif)" htmlFor="promo-end">
            <Input id="promo-end" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={firstTimeOnly} onChange={(e) => setFirstTimeOnly(e.target.checked)} className="h-4 w-4 accent-[#f5c451]" />
          Seulement pour un premier abonnement
        </label>
        <p className="rounded-md border border-border bg-card p-3 text-xs text-text-secondary">{summary}</p>
        <Button type="submit" disabled={pending || !code.trim() || plans.length === 0} className="self-start">
          Créer le code dans Stripe
        </Button>
      </form>
    </Modal>
  );
}
