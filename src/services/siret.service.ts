import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SiretLookupResult {
  legalName: string;
  siren: string;
  isActive: boolean;
}

type ApiEtablissement = { siret: string; etat_administratif: string };
type ApiResult = {
  nom_complet: string;
  siren: string;
  etat_administratif: string;
  siege: ApiEtablissement;
  matching_etablissements?: ApiEtablissement[];
};

/**
 * Looks up a SIRET against the French government's free, public company
 * registry (no API key required). Confirms the SIRET actually matches one
 * of the returned establishments — the endpoint is a general search, not a
 * strict lookup, so a loose text match alone wouldn't be trustworthy.
 */
export async function lookupSiret(siret: string): Promise<SiretLookupResult | null> {
  const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&per_page=5`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Le service de vérification SIRET est momentanément indisponible.");

  const data: { results?: ApiResult[] } = await res.json();
  const match = (data.results ?? []).find(
    (r) => r.siege.siret === siret || (r.matching_etablissements ?? []).some((e) => e.siret === siret),
  );
  if (!match) return null;

  const establishment =
    match.siege.siret === siret ? match.siege : match.matching_etablissements!.find((e) => e.siret === siret)!;

  return {
    legalName: match.nom_complet,
    siren: match.siren,
    isActive: establishment.etat_administratif === "A",
  };
}

export async function verifyAndSaveSiret(
  userId: string,
  siret: string,
): Promise<{ success: true; legalName: string } | { success: false; error: string }> {
  if (!/^\d{14}$/.test(siret)) {
    return { success: false, error: "Un SIRET contient exactement 14 chiffres." };
  }

  const result = await lookupSiret(siret);
  if (!result) {
    return { success: false, error: "Aucune entreprise trouvée pour ce SIRET." };
  }
  if (!result.isActive) {
    return { success: false, error: "Cet établissement est enregistré comme fermé." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ siret, legal_name: result.legalName, siret_verified_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { success: false, error: error.message };

  return { success: true, legalName: result.legalName };
}
