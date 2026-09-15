import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupWizard } from "./SignupWizard";

export const metadata: Metadata = { title: "Rejoindre ASCEND" };

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupWizard />
    </Suspense>
  );
}
