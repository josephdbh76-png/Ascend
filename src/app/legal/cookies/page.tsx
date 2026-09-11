import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy">
      <p>
        This is a placeholder Cookie Policy for the ASCEND private beta. It has not yet been
        reviewed by legal counsel.
      </p>
      <p>
        ASCEND uses strictly necessary cookies to keep you signed in (via Supabase Auth) and,
        where configured, anonymous product analytics cookies to understand how the beta is used.
      </p>
      <p>A complete, legally reviewed Cookie Policy will replace this page before general availability.</p>
    </LegalPage>
  );
}
