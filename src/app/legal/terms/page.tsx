import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <p>
        This is a placeholder Terms of Service for the ASCEND private beta. It has not yet been
        reviewed by legal counsel and should not be relied upon as a final or binding agreement.
      </p>
      <p>
        ASCEND is provided during the beta on an &quot;as is&quot; basis, free of charge, without
        warranties of any kind. Features may change or be removed without notice.
      </p>
      <p>
        You are responsible for the accuracy of the information you provide and for only
        connecting revenue sources you are authorized to connect.
      </p>
      <p>A complete, legally reviewed Terms of Service will replace this page before general availability.</p>
    </LegalPage>
  );
}
