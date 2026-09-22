"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Lock } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BUSINESS_CATEGORIES } from "@/lib/constants";

export function NetworkSearchForm({
  initialQuery,
  initialCity,
  initialCategory,
  cityLocked,
}: {
  initialQuery: string;
  initialCity: string;
  initialCategory: string;
  /** True for Pro (non-Elite) — the city field is shown but disabled with an upsell. */
  cityLocked: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState(initialCategory);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (!cityLocked && city.trim()) params.set("city", city.trim());
    if (category) params.set("category", category);
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom ou pseudo..."
          className="pl-10"
        />
      </div>
      <div className="relative sm:w-48">
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={cityLocked ? "Ville (Elite)" : "Ville..."}
          disabled={cityLocked}
          title={cityLocked ? "Recherche par ville réservée aux membres Elite." : undefined}
          className={cityLocked ? "pr-8 opacity-60" : undefined}
        />
        {cityLocked && (
          <Lock className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
        )}
      </div>
      <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-56">
        <option value="">Toutes les activités</option>
        {BUSINESS_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </Select>
      <Button type="submit" className="shrink-0">
        Rechercher
      </Button>
    </form>
  );
}
