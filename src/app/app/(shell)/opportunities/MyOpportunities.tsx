"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Archive, Compass } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MessageButton } from "@/components/network/MessageButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { initials, timeAgo } from "@/lib/utils";
import { opportunityTypeLabel, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_BADGE } from "@/lib/opportunityDisplay";
import { closeOpportunityAction, updateApplicationStatusAction } from "./actions";
import type { MyOpportunity } from "@/types";

export function MyOpportunities({ opportunities }: { opportunities: MyOpportunity[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function close(id: string) {
    startTransition(async () => {
      const result = await closeOpportunityAction(id);
      if (!result.success) return toast.show(result.error, "error");
      router.refresh();
    });
  }

  function updateStatus(applicationId: string, status: "accepted" | "declined") {
    startTransition(async () => {
      const result = await updateApplicationStatusAction(applicationId, status);
      if (!result.success) return toast.show(result.error, "error");
      toast.show(status === "accepted" ? "Candidature acceptée." : "Candidature refusée.", "success");
      router.refresh();
    });
  }

  if (opportunities.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="Tu n'as encore publié aucune opportunité."
        description="Cherche un cofondateur, un développeur, un partenaire — publie une annonce pour la rendre visible aux membres Elite."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {opportunities.map((o) => (
        <Card key={o.id} className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="gold">{opportunityTypeLabel(o.type)}</Badge>
              <h3 className="mt-2 text-sm font-semibold text-text-primary">{o.title}</h3>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={o.status === "open" ? "success" : "neutral"}>
                {o.status === "open" ? "Ouverte" : "Fermée"}
              </Badge>
              {o.status === "open" && (
                <Button variant="ghost" size="sm" onClick={() => close(o.id)} disabled={pending}>
                  <Archive className="h-3.5 w-3.5" /> Clôturer
                </Button>
              )}
            </div>
          </div>

          {o.applications.length === 0 ? (
            <p className="text-xs text-text-muted">Aucune candidature pour l&apos;instant.</p>
          ) : (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {o.applications.map((a) => (
                <div key={a.id} className="flex flex-col gap-2 border border-border bg-card-elevated p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border-strong font-mono text-xs font-semibold text-gold">
                      {initials(a.applicantFirstName, a.applicantLastName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {a.applicantFirstName} {a.applicantLastName}
                      </p>
                      <p className="truncate text-xs text-text-muted">{a.message}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant={APPLICATION_STATUS_BADGE[a.status]}>{APPLICATION_STATUS_LABELS[a.status]}</Badge>
                    {a.status === "pending" && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => updateStatus(a.id, "accepted")} disabled={pending}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(a.id, "declined")} disabled={pending}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {a.status === "accepted" && <MessageButton targetUserId={a.applicantId} />}
                  </div>
                </div>
              ))}
            </div>
          )}
          <span className="font-mono text-[10px] text-text-muted">Publiée {timeAgo(o.createdAt)}</span>
        </Card>
      ))}
    </div>
  );
}
