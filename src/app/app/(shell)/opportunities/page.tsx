import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasEliteAccess } from "@/services/subscription.service";
import {
  listDiscoverableOpportunities,
  getDiscoverTeaser,
  listMyOpportunities,
  listMyApplications,
} from "@/services/opportunity.service";
import { NewOpportunityModal } from "./NewOpportunityModal";
import { OpportunitiesTabs } from "./OpportunitiesTabs";

export const metadata: Metadata = { title: "Opportunités" };

export default async function OpportunitiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const subscription = await getSubscription(user.id);
  const isElite = hasEliteAccess(subscription.tier);

  const [discoverable, teaser, myOpportunities, applications] = await Promise.all([
    isElite ? listDiscoverableOpportunities(user.id) : Promise.resolve([]),
    isElite ? Promise.resolve(null) : getDiscoverTeaser(user.id),
    listMyOpportunities(user.id),
    listMyApplications(user.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-text-primary">Opportunités</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Associé, développeur, partenaire, growth, cofondateur.
          </p>
        </div>
        <NewOpportunityModal isElite={isElite} />
      </div>

      <OpportunitiesTabs
        isElite={isElite}
        discoverable={discoverable}
        teaser={teaser}
        applications={applications}
        myOpportunities={myOpportunities}
      />
    </div>
  );
}
