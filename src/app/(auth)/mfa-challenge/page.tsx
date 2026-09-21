import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaChallengeForm } from "./MfaChallengeForm";

export const metadata: Metadata = { title: "Vérification en deux étapes" };

export default async function MfaChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  // Nothing to challenge — either no factor enrolled, or already at aal2
  // (e.g. a stale bookmark to this page after already completing it).
  if (!aal || aal.currentLevel === aal.nextLevel) redirect("/app/dashboard");

  return <MfaChallengeForm />;
}
