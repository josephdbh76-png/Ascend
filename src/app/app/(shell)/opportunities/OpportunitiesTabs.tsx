"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { DiscoverOpportunities } from "./DiscoverOpportunities";
import { MyApplications } from "./MyApplications";
import { MyOpportunities } from "./MyOpportunities";
import type { OpportunityMatch, OpportunityApplication, Opportunity, MyOpportunity } from "@/types";

const TABS = [
  { value: "discover", label: "Découvrir" },
  { value: "applications", label: "Mes candidatures" },
  { value: "mine", label: "Mes annonces" },
];

export function OpportunitiesTabs({
  isElite,
  discoverable,
  applications,
  myOpportunities,
}: {
  isElite: boolean;
  discoverable: OpportunityMatch[];
  applications: (OpportunityApplication & { opportunity: Opportunity })[];
  myOpportunities: MyOpportunity[];
}) {
  const [tab, setTab] = useState("discover");

  return (
    <div className="flex flex-col gap-6">
      <Tabs items={TABS} defaultValue="discover" onChange={setTab} className="sm:w-fit" />

      {tab === "discover" &&
        (isElite ? (
          <DiscoverOpportunities opportunities={discoverable} />
        ) : (
          <EmptyState
            icon={Lock}
            title="Réservé aux membres Elite."
            description="Découvre les opportunités partagées par les fondateurs du réseau ASCEND, triées par pertinence pour ton activité."
            action={
              <Button href="/api/stripe/checkout?tier=elite" size="sm">
                Passer Elite
              </Button>
            }
          />
        ))}

      {tab === "applications" && <MyApplications applications={applications} />}
      {tab === "mine" && <MyOpportunities opportunities={myOpportunities} />}
    </div>
  );
}
