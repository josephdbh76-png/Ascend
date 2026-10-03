/**
 * Single source for the publisher's legal identity (mentions légales, CGU,
 * confidentialité). Fields left null are simply not rendered.
 */
export const LEGAL = {
  brand: "ASCEND",
  companyName: null as string | null,
  legalForm: null as string | null,
  siret: null as string | null,
  address: null as string | null,
  publicationDirector: null as string | null,
  contactEmail: "ascend.proof@gmail.com",
  host: {
    name: "Vercel Inc.",
    address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
    website: "https://vercel.com",
  },
  dataHost: { name: "Supabase Inc.", website: "https://supabase.com" },
  lastUpdated: "3 octobre 2026",
};
