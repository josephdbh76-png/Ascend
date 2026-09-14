import type { Metadata } from "next";
import { SignupWizard } from "./SignupWizard";

export const metadata: Metadata = { title: "Rejoindre ASCEND" };

export default function SignupPage() {
  return <SignupWizard />;
}
