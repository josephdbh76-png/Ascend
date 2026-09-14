"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { TitleCard } from "@/components/titles/TitleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Gem } from "lucide-react";
import type { TitleRow, EarnedTitle } from "@/types";

const TABS = [
  { value: "owned", label: "Obtenus" },
  { value: "available", label: "À débloquer" },
  { value: "exclusive", label: "Exclusifs" },
];

export function TitlesTabs({ catalog, owned }: { catalog: TitleRow[]; owned: EarnedTitle[] }) {
  const [tab, setTab] = useState("owned");
  const ownedIds = new Set(owned.map((o) => o.id));
  const ownedByid = new Map(owned.map((o) => [o.id, o]));

  const ownedTitles = catalog.filter((t) => ownedIds.has(t.id));
  const availableTitles = catalog.filter((t) => t.type === "earned" && !ownedIds.has(t.id));
  const exclusiveTitles = catalog.filter((t) => t.type === "purchasable");

  const lists: Record<string, TitleRow[]> = {
    owned: ownedTitles,
    available: availableTitles,
    exclusive: exclusiveTitles,
  };

  const current = lists[tab];

  return (
    <div className="flex flex-col gap-6">
      <Tabs items={TABS} defaultValue="owned" onChange={setTab} className="sm:w-fit" />

      {current.length === 0 ? (
        <EmptyState
          icon={Gem}
          title={tab === "owned" ? "Aucun titre obtenu pour l'instant." : "Rien ici pour le moment."}
          description={tab === "owned" ? "Progresse sur ASCEND pour débloquer tes premiers titres." : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((t) => (
            <TitleCard
              key={t.id}
              id={t.id}
              name={t.name}
              description={t.description}
              icon={t.icon}
              rarity={t.rarity}
              requirement={t.requirement}
              priceCents={t.price_cents}
              supply={t.supply}
              remainingSupply={t.remaining_supply}
              owned={ownedIds.has(t.id)}
              isActive={ownedByid.get(t.id)?.isActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
