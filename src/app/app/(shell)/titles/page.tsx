import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getTitleCatalog, getUserTitles } from "@/services/title.service";
import { TitlesTabs } from "./TitlesTabs";

export const metadata: Metadata = { title: "Titres" };

export default async function TitlesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [catalog, owned] = await Promise.all([getTitleCatalog(), getUserTitles(user.id)]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Titres</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Des statuts à collectionner. Certains se gagnent, d&apos;autres sont extrêmement limités.
        </p>
      </div>
      <TitlesTabs catalog={catalog} owned={owned} />
    </div>
  );
}
