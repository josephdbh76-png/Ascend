import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SignupWizard } from "./SignupWizard";

export const metadata: Metadata = { title: "Rejoindre ASCEND" };

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: founding } = await supabase
    .from("titles")
    .select("remaining_supply")
    .eq("id", "founding-member")
    .maybeSingle();

  return (
    <Suspense fallback={null}>
      <SignupWizard foundingSpotsLeft={founding?.remaining_supply ?? null} />
    </Suspense>
  );
}
