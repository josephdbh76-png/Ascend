"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BUSINESS_CATEGORIES } from "@/lib/constants";

export function NetworkSearchForm({
  initialQuery,
  initialCity,
  initialCategory,
}: {
  initialQuery: string;
  initialCity: string;
  initialCategory: string;
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
    if (city.trim()) params.set("city", city.trim());
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
      <Input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Ville..."
        className="sm:w-48"
      />
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
