import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This is a placeholder Privacy Policy for the ASCEND private beta. It has not yet been
        reviewed by legal counsel and should not be relied upon as a final or binding policy.
      </p>
      <p>
        During the beta, ASCEND stores the account and business information you provide (name,
        username, country, business category and bio), and, if you choose to connect a revenue
        source, the monthly revenue figures retrieved from that source in Stripe test mode.
      </p>
      <p>
        You control who can see your revenue through the visibility setting in Settings
        (exact, range, or private). You can request deletion of your account and associated
        data at any time from Settings → Account.
      </p>
      <p>A complete, legally reviewed Privacy Policy will replace this page before general availability.</p>
    </LegalPage>
  );
}
