"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { OpportunitiesFomoTeaser } from "@/components/fomo/OpportunitiesFomoTeaser";
import { DiscoverOpportunities } from "./DiscoverOpportunities";
import { MyApplications } from "./MyApplications";
import { MyOpportunities } from "./MyOpportunities";
import type { OpportunityMatch, OpportunityApplication, Opportunity, MyOpportunity } from "@/types";
import type { DiscoverTeaser } from "@/services/opportunity.service";

const TABS = [
  { value: "discover", label: "Découvrir" },
  { value: "applications", label: "Mes candidatures" },
  { value: "mine", label: "Mes annonces" },
];

export function OpportunitiesTabs({
  canBrowse,
  discoverable,
  teaser,
  applications,
  myOpportunities,
}: {
  /** Pro or Elite — Free still sees only the FOMO teaser. */
  canBrowse: boolean;
  discoverable: OpportunityMatch[];
  teaser: DiscoverTeaser | null;
  applications: (OpportunityApplication & { opportunity: Opportunity })[];
  myOpportunities: MyOpportunity[];
}) {
  const [tab, setTab] = useState("discover");

  return (
    <div className="flex flex-col gap-6">
      <Tabs items={TABS} defaultValue="discover" onChange={setTab} className="sm:w-fit" />

      {tab === "discover" &&
        (canBrowse ? (
          <DiscoverOpportunities opportunities={discoverable} />
        ) : (
          <OpportunitiesFomoTeaser
            count={teaser?.count ?? 0}
            topMatchScore={teaser?.topMatchScore ?? null}
            topMatchType={teaser?.topMatchType ?? null}
          />
        ))}

      {tab === "applications" && <MyApplications applications={applications} />}
      {tab === "mine" && <MyOpportunities opportunities={myOpportunities} />}
    </div>
  );
}
