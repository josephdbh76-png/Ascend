"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs } from "@/components/ui/Tabs";
import { Select } from "@/components/ui/Input";
import { BUSINESS_CATEGORIES, COUNTRIES } from "@/lib/constants";

const SCOPE_TABS = [
  { value: "global", label: "Mondial" },
  { value: "country", label: "Pays" },
  { value: "category", label: "Catégorie" },
];

export function LeaderboardControls({
  scope,
  scopeValue,
}: {
  scope: string;
  scopeValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => params.set(k, v));
    router.push(`${pathname}?${params.toString()}`);
  }

  function onScopeChange(value: string) {
    if (value === "country") updateParams({ scope: value, value: COUNTRIES[0].value });
    else if (value === "category") updateParams({ scope: value, value: BUSINESS_CATEGORIES[0].value });
    else updateParams({ scope: value, value: "" });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs items={SCOPE_TABS} defaultValue={scope} onChange={onScopeChange} className="sm:w-auto" />
      {scope === "country" && (
        <Select
          value={scopeValue}
          onChange={(e) => updateParams({ value: e.target.value })}
          className="sm:w-56"
        >
          {COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      )}
      {scope === "category" && (
        <Select
          value={scopeValue}
          onChange={(e) => updateParams({ value: e.target.value })}
          className="sm:w-56"
        >
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
