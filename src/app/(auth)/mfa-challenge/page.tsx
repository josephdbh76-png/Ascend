import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { secondFactorPending } from "@/lib/supabase/mfa";
import { MfaChallengeForm } from "./MfaChallengeForm";

export const metadata: Metadata = { title: "Vérification en deux étapes", robots: { index: false, follow: false } };

export default async function MfaChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Nothing to challenge — either no factor enrolled, or already at aal2
  // (e.g. a stale bookmark to this page after already completing it).
  if (!(await secondFactorPending(supabase))) redirect("/app/dashboard");

  return <MfaChallengeForm />;
}
