import type { Metadata } from "next";
import { Suspense } from "react";
import { getFoundingSpotsLeft } from "@/services/founding.service";
import { getBetaMode } from "@/services/platform.service";
import { SignupWizard } from "./SignupWizard";

// Places left and the beta banner stay current (the beta switch also refreshes it at once).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Rejoindre ASCEND",
  description: "Crée ton profil gratuitement, vérifie tes revenus et découvre ta place au classement des entrepreneurs.",
  alternates: { canonical: "/signup" },
};

export default async function SignupPage() {
  const [foundingSpotsLeft, beta] = await Promise.all([getFoundingSpotsLeft(), getBetaMode()]);

  return (
    <Suspense fallback={null}>
      <SignupWizard foundingSpotsLeft={foundingSpotsLeft} betaMode={beta.enabled} />
    </Suspense>
  );
}
