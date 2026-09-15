import Link from "next/link";
import { CheckCircle2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FollowButton } from "@/components/network/FollowButton";
import { MessageButton } from "@/components/network/MessageButton";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { initials } from "@/lib/utils";
import type { NetworkProfileRow } from "@/services/network.service";

function categoryLabel(value: string) {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function NetworkResults({ results }: { results: NetworkProfileRow[] }) {
  if (results.length === 0) {
    return (
      <EmptyState
        title="Aucun fondateur ne correspond à ta recherche."
        description="Essaie un autre nom, une autre ville ou une autre catégorie d'activité."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((r) => (
        <Card key={r.userId} className="flex flex-col gap-3 p-5" hover>
          <div className="flex items-start justify-between gap-2">
            <Link href={`/profile/${r.username}`} className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-elevated text-sm font-semibold text-gold">
                {r.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatarUrl} alt={r.username} className="h-full w-full object-cover" />
                ) : (
                  initials(r.firstName, r.lastName)
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-text-primary">
                  {r.firstName} {r.lastName}
                </span>
                <span className="truncate text-xs text-text-muted">@{r.username}</span>
              </span>
            </Link>
            <div className="flex shrink-0 gap-1.5">
              <MessageButton targetUserId={r.userId} />
              <FollowButton targetUserId={r.userId} initialFollowing={r.isFollowing} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            {r.revenueVerified && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" /> Vérifié
              </span>
            )}
            {r.businessName && <span>{r.businessName} · {categoryLabel(r.businessCategory)}</span>}
          </div>

          <div className="flex items-center justify-between text-xs text-text-muted">
            {r.city ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {r.city}
              </span>
            ) : (
              <span />
            )}
            <span>{r.followerCount} abonné{r.followerCount > 1 ? "s" : ""}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
