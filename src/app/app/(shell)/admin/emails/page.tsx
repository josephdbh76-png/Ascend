import type { Metadata } from "next";
import { getCampaignHistory, listEmailTemplates } from "@/services/email-campaign.service";
import { listTransactionalEmailPreviews } from "@/lib/transactionalEmailPreviews";
import { listEmailToggleGroups } from "@/services/notification.service";
import { AdminSection } from "../AdminSection";
import { EmailCampaignPanel } from "../EmailCampaignPanel";
import { TransactionalEmailPreviews } from "../TransactionalEmailPreviews";
import { EmailToggleGroupsPanel } from "../EmailToggleGroupsPanel";

export const metadata: Metadata = { title: "E-mails · Administration" };

export default async function AdminEmailsPage() {
  const [campaignHistory, emailTemplates, emailToggleGroups] = await Promise.all([
    getCampaignHistory(),
    listEmailTemplates(),
    listEmailToggleGroups(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminSection
        title="Campagne e-mail"
        description="Envoie un e-mail à un segment de membres. Seuls ceux qui ont accepté les actualités le reçoivent, avec un lien de désinscription ajouté automatiquement."
      >
        <EmailCampaignPanel history={campaignHistory} templates={emailTemplates} />
      </AdminSection>

      <AdminSection
        title="E-mails automatiques"
        description="Ce que reçoit un membre quand un évènement se produit sur son compte : un aperçu du contenu actuel."
      >
        <TransactionalEmailPreviews items={listTransactionalEmailPreviews()} />
      </AdminSection>

      <AdminSection
        title="Activer ou couper un type d'e-mail"
        description="Coupe l'envoi d'un type d'e-mail pour tout le monde, quelles que soient les préférences de chaque membre."
      >
        <EmailToggleGroupsPanel groups={emailToggleGroups} />
      </AdminSection>
    </div>
  );
}
