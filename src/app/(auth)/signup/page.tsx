import type { Metadata } from "next";
import { SignupWizard } from "./SignupWizard";

export const metadata: Metadata = { title: "Join the Beta" };

export default function SignupPage() {
  return <SignupWizard />;
}
