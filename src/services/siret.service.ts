import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SiretDirigeant {
  nom: string;
  prenoms: string;
}

export interface SiretLookupResult {
  legalName: string;
  siren: string;
  isActive: boolean;
  dirigeants: SiretDirigeant[];
}

type ApiEtablissement = { siret: string; etat_administratif: string };
type ApiDirigeant = { nom?: string; prenoms?: string; type_dirigeant?: string };
type ApiResult = {
  nom_complet: string;
  siren: string;
  etat_administratif: string;
  siege: ApiEtablissement;
  matching_etablissements?: ApiEtablissement[];
  dirigeants?: ApiDirigeant[];
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
    dirigeants: (match.dirigeants ?? [])
      .filter((d) => d.type_dirigeant === "personne physique" && d.nom && d.prenoms)
      .map((d) => ({ nom: d.nom!, prenoms: d.prenoms! })),
  };
}

/** Strips accents/punctuation and splits into comparable uppercase tokens. */
function nameTokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

/**
 * A member only proves ownership of a SIRET by being one of its declared
 * legal representatives — a public, free fact from the same registry
 * lookup. Without this check, the SIRET field was purely decorative:
 * anyone could type in any real company's number and have it "verified".
 * Compares first token of each (people generally go by one first/last
 * name even when the registry lists middle names) rather than requiring
 * an exact full-string match, which would fail on accents, married
 * names recorded as "NOM (NOM DE NAISSANCE)", or extra middle names.
 */
export function personOwnsBusiness(
  dirigeants: SiretDirigeant[],
  profileFirstName: string,
  profileLastName: string,
): boolean {
  const first = nameTokens(profileFirstName)[0];
  const last = nameTokens(profileLastName)[0];
  if (!first || !last) return false;

  return dirigeants.some((d) => nameTokens(d.nom).includes(last) && nameTokens(d.prenoms).includes(first));
}

export async function verifyAndSaveSiret(
  userId: string,
  siret: string,
): Promise<{ success: true; legalName: string } | { success: false; error: string }> {
  if (!/^\d{14}$/.test(siret)) {
    return { success: false, error: "Un SIRET contient exactement 14 chiffres." };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.first_name || !profile.last_name) {
    return { success: false, error: "Renseigne ton prénom et ton nom dans ton profil avant de vérifier une entreprise." };
  }

  const result = await lookupSiret(siret);
  if (!result) {
    return { success: false, error: "Aucune entreprise trouvée pour ce SIRET." };
  }
  if (!result.isActive) {
    return { success: false, error: "Cet établissement est enregistré comme fermé." };
  }
  if (!personOwnsBusiness(result.dirigeants, profile.first_name, profile.last_name)) {
    return {
      success: false,
      error:
        "Ce SIRET est enregistré au nom d'une autre personne. Vérifie que le prénom et le nom de ton profil correspondent bien au dirigeant déclaré de l'entreprise, ou contacte le support si tu penses qu'il s'agit d'une erreur.",
    };
  }

  const { error } = await supabase
    .from("businesses")
    .update({ siret, legal_name: result.legalName, siret_verified_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { success: false, error: error.message };

  return { success: true, legalName: result.legalName };
}
