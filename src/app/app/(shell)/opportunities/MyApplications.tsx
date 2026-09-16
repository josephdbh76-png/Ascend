import Link from "next/link";
import { Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/utils";
import { opportunityTypeLabel, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_BADGE } from "@/lib/opportunityDisplay";
import type { OpportunityApplication, Opportunity } from "@/types";

export function MyApplications({ applications }: { applications: (OpportunityApplication & { opportunity: Opportunity })[] }) {
  if (applications.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="Tu n'as encore postulé à aucune opportunité."
        description="Retrouve les annonces qui te correspondent le mieux dans l'onglet Découvrir."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {applications.map((a) => (
        <Card key={a.id} className="flex flex-col gap-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="gold">{opportunityTypeLabel(a.opportunity.type)}</Badge>
              <Link href={`/profile/${a.opportunity.authorUsername}`} className="mt-2 block text-sm font-semibold text-text-primary hover:text-gold">
                {a.opportunity.title}
              </Link>
            </div>
            <Badge variant={APPLICATION_STATUS_BADGE[a.status]}>{APPLICATION_STATUS_LABELS[a.status]}</Badge>
          </div>
          <p className="text-xs text-text-secondary">{a.message}</p>
          <span className="text-[11px] text-text-muted">Envoyée {timeAgo(a.createdAt)}</span>
        </Card>
      ))}
    </div>
  );
}
