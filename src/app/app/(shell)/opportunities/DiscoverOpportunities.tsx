"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { OPPORTUNITY_TYPES, LOCATION_TYPES } from "@/lib/opportunityDisplay";
import type { OpportunityMatch } from "@/types";

export function DiscoverOpportunities({ opportunities }: { opportunities: OpportunityMatch[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [locationType, setLocationType] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (type && o.type !== type) return false;
      if (category && o.category !== category) return false;
      if (locationType && o.locationType !== locationType) return false;
      if (q && !`${o.title} ${o.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [opportunities, query, type, category, locationType]);

  if (opportunities.length === 0) {
    return (
      <EmptyState
        title="Aucune opportunité pour l'instant."
        description="Reviens bientôt, ou publie la tienne pour lancer le mouvement."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..." className="pl-10" />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="sm:w-48">
          <option value="">Tous les types</option>
          {OPPORTUNITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-48">
          <option value="">Toutes les activités</option>
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select value={locationType} onChange={(e) => setLocationType(e.target.value)} className="sm:w-40">
          <option value="">Tous les lieux</option>
          {LOCATION_TYPES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucune opportunité ne correspond à ces filtres." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <OpportunityCard key={o.id} opportunity={o} />
          ))}
        </div>
      )}
    </div>
  );
}
