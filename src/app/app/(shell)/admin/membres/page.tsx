import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { listUsersForAdmin } from "@/services/admin.service";
import { getPendingRevenueReviews } from "@/services/revenue.service";
import { AdminSection } from "../AdminSection";
import { AdminUsersTable } from "../AdminUsersTable";
import { RevenueReviewQueue } from "../RevenueReviewQueue";

export const metadata: Metadata = { title: "Membres · Administration" };

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [users, pendingRevenueReviews] = await Promise.all([listUsersForAdmin(), getPendingRevenueReviews()]);

  return (
    <div className="flex flex-col gap-6">
      <AdminSection
        title={`Revenus déclarés à vérifier${pendingRevenueReviews.length > 0 ? ` (${pendingRevenueReviews.length})` : ""}`}
        description="Déclarations manuelles avec justificatif. Elles ne comptent comme revenu vérifié qu'une fois validées ici."
      >
        <RevenueReviewQueue reviews={pendingRevenueReviews} />
      </AdminSection>

      <AdminSection
        title={`Membres (${users.filter((u) => !u.isDemo).length})`}
        description="Formule, droits d'administration et suppression de compte."
      >
        <AdminUsersTable users={users} currentUserId={user?.id ?? ""} />
      </AdminSection>
    </div>
  );
}
