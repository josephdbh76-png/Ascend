import type { Metadata } from "next";
import { Suspense } from "react";
import { getFoundingSpotsLeft } from "@/services/founding.service";
import { SignupWizard } from "./SignupWizard";

export const metadata: Metadata = {
  title: "Rejoindre ASCEND",
  description: "Crée ton profil gratuitement, vérifie tes revenus et découvre ta place au classement des entrepreneurs.",
  alternates: { canonical: "/signup" },
};

export default async function SignupPage() {
  const foundingSpotsLeft = await getFoundingSpotsLeft();

  return (
    <Suspense fallback={null}>
      <SignupWizard foundingSpotsLeft={foundingSpotsLeft} />
    </Suspense>
  );
}
