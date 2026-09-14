import type { Metadata } from "next";
import { SignupWizard } from "./SignupWizard";

export const metadata: Metadata = { title: "Rejoindre la bêta" };

export default function SignupPage() {
  return <SignupWizard />;
}
