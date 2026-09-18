import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin, listUsersForAdmin } from "@/services/admin.service";
import { getPendingRevenueReviews } from "@/services/revenue.service";
import { createClient } from "@/lib/supabase/server";
import { AdminUsersTable } from "./AdminUsersTable";
import { TitleStripeSyncButton } from "./TitleStripeSyncButton";
import { AnnualPriceSyncPanel } from "./AnnualPriceSyncPanel";
import { RevenueReviewQueue } from "./RevenueReviewQueue";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin())) redirect("/app/dashboard");

  const [users, pendingRevenueReviews] = await Promise.all([listUsersForAdmin(), getPendingRevenueReviews()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Administration</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Gère les formules d&apos;abonnement et les droits d&apos;administration de tous les membres.
        </p>
      </div>
      <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" elevated>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Titres payants</h2>
          <p className="text-xs text-text-secondary">
            Crée le produit et le prix Stripe pour chaque titre à vendre qui n&apos;en a pas encore.
          </p>
        </div>
        <TitleStripeSyncButton />
      </Card>

      <Card className="flex flex-col gap-3 p-5" elevated>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Tarifs annuels</h2>
          <p className="text-xs text-text-secondary">
            Crée les prix Stripe annuels (Pro, Elite) sur les mêmes produits que les prix mensuels.
          </p>
        </div>
        <AnnualPriceSyncPanel />
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Revenus déclarés en attente de vérification
          {pendingRevenueReviews.length > 0 && (
            <span className="ml-2 text-xs font-normal text-text-muted">({pendingRevenueReviews.length})</span>
          )}
        </h2>
        <RevenueReviewQueue reviews={pendingRevenueReviews} />
      </div>

      <AdminUsersTable users={users} currentUserId={user.id} />
    </div>
  );
}
