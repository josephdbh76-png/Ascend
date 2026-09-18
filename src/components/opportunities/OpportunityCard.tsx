"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MapPin, Wifi, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { opportunityTypeLabel, compensationTypeLabel, locationTypeLabel } from "@/lib/opportunityDisplay";
import { applyToOpportunityAction } from "@/app/app/(shell)/opportunities/actions";
import type { OpportunityMatch } from "@/types";

export function OpportunityCard({ opportunity }: { opportunity: OpportunityMatch }) {
  const [applyOpen, setApplyOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [applied, setApplied] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await applyToOpportunityAction(opportunity.id, message);
      if (!result.success) return toast.show(result.error, "error");
      toast.show("Ta candidature a été envoyée.", "success");
      setApplied(true);
      setApplyOpen(false);
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-5" hover>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="gold">{opportunityTypeLabel(opportunity.type)}</Badge>
          <h3 className="mt-2 text-sm font-semibold text-text-primary">{opportunity.title}</h3>
        </div>
        <div
          title={opportunity.matchReasons.join(" · ") || undefined}
          className="flex shrink-0 items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] font-semibold text-gold"
        >
          <Sparkles className="h-3 w-3" /> {opportunity.matchScore}% compatible
        </div>
      </div>

      <p className="line-clamp-3 text-xs text-text-secondary">{opportunity.description}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          {opportunity.locationType === "remote" ? <Wifi className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
          {locationTypeLabel(opportunity.locationType)}
          {opportunity.city && ` · ${opportunity.city}`}
        </span>
        <span>{compensationTypeLabel(opportunity.compensationType)}</span>
      </div>

      {opportunity.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {opportunity.skills.map((s) => (
            <span key={s} className="rounded-full border border-border-strong bg-card-elevated px-2 py-0.5 text-[10px] text-text-secondary">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-3">
        <Link href={`/profile/${opportunity.authorUsername}`} className="truncate text-xs text-text-muted hover:text-text-primary">
          Par {opportunity.authorFirstName} {opportunity.authorLastName}
        </Link>
        <Button size="sm" onClick={() => setApplyOpen(true)} disabled={applied} className="shrink-0">
          {applied ? "Candidature envoyée" : "Postuler"}
        </Button>
      </div>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title={`Postuler — ${opportunity.title}`}>
        <form onSubmit={submitApplication} className="flex flex-col gap-4">
          <Field label="Ton message" hint="Présente-toi et explique pourquoi cette opportunité t'intéresse.">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Bonjour, je suis..."
              required
            />
          </Field>
          <Button type="submit" disabled={pending} className="self-start">
            Envoyer ma candidature
          </Button>
        </form>
      </Modal>
    </Card>
  );
}
