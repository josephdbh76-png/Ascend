import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin, listUsersForAdmin } from "@/services/admin.service";
import { getPendingRevenueReviews } from "@/services/revenue.service";
import { getCampaignHistory, listEmailTemplates } from "@/services/email-campaign.service";
import { listTransactionalEmailPreviews } from "@/lib/transactionalEmailPreviews";
import { listInfluencers } from "@/services/influencer.service";
import { createClient } from "@/lib/supabase/server";
import { AdminUsersTable } from "./AdminUsersTable";
import { TitleStripeSyncButton } from "./TitleStripeSyncButton";
import { AnnualPriceSyncPanel } from "./AnnualPriceSyncPanel";
import { RevenueReviewQueue } from "./RevenueReviewQueue";
import { EmailCampaignPanel } from "./EmailCampaignPanel";
import { TransactionalEmailPreviews } from "./TransactionalEmailPreviews";
import { InfluencerProgramPanel } from "./InfluencerProgramPanel";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin())) redirect("/app/dashboard");

  const [users, pendingRevenueReviews, campaignHistory, emailTemplates, influencers] = await Promise.all([
    listUsersForAdmin(),
    getPendingRevenueReviews(),
    getCampaignHistory(),
    listEmailTemplates(),
    listInfluencers(),
  ]);

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

      <Card className="flex flex-col gap-3 p-5" elevated>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Campagne email</h2>
          <p className="text-xs text-text-secondary">
            Envoie un email à un segment de membres — un lien de désinscription est ajouté automatiquement, seuls les membres ayant donné leur consentement le reçoivent.
          </p>
        </div>
        <EmailCampaignPanel history={campaignHistory} templates={emailTemplates} />
      </Card>

      <Card className="flex flex-col gap-3 p-5" elevated>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Programme d&apos;influenceurs</h2>
          <p className="text-xs text-text-secondary">
            Crée un code de réduction pour un influenceur — son audience paie -10% tant qu&apos;elle reste
            abonnée, et tu suis ici la commission qu&apos;il te reste à lui verser.
          </p>
        </div>
        <InfluencerProgramPanel influencers={influencers} />
      </Card>

      <Card className="flex flex-col gap-1 p-5" elevated>
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-text-primary">Emails automatiques</h2>
          <p className="text-xs text-text-secondary">
            Ce que reçoit un membre dès qu&apos;un évènement se produit sur son compte — pas un historique, un aperçu de leur contenu actuel.
          </p>
        </div>
        <TransactionalEmailPreviews items={listTransactionalEmailPreviews()} />
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
