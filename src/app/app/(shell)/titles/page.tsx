import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getTitleCatalog, getUserTitles, getTitleCompletionRates } from "@/services/title.service";
import { TitlesTabs } from "./TitlesTabs";
import { PurchaseStatusToast } from "./PurchaseStatusToast";

export const metadata: Metadata = { title: "Titres" };

export default async function TitlesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [catalog, owned, completionRates] = await Promise.all([
    getTitleCatalog(),
    getUserTitles(user.id),
    getTitleCompletionRates(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={null}>
        <PurchaseStatusToast />
      </Suspense>
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-text-primary">Titres</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Des statuts à collectionner. Certains se gagnent, d&apos;autres sont extrêmement limités.
        </p>
      </div>
      <TitlesTabs catalog={catalog} owned={owned} completionRates={completionRates} />
    </div>
  );
}
