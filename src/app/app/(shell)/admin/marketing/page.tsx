import type { Metadata } from "next";
import Link from "next/link";
import { listInfluencers } from "@/services/influencer.service";
import { listAllBannersForAdmin } from "@/services/banner.service";
import { listSurveyResponses, summarizeSurvey, topReferrers } from "@/services/survey.service";
import { AdminSection } from "../AdminSection";
import { SurveyPanel } from "../SurveyPanel";
import { InfluencerProgramPanel } from "../InfluencerProgramPanel";
import { BannersPanel } from "../BannersPanel";

export const metadata: Metadata = { title: "Marketing · Administration" };

export default async function AdminMarketingPage() {
  const [influencers, banners, surveyResponses] = await Promise.all([
    listInfluencers(),
    listAllBannersForAdmin(),
    listSurveyResponses(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminSection
        title="Questionnaire d'inscription"
        description="Comment les membres nous découvrent, où ils encaissent, leur niveau et ce qu'ils viennent chercher."
      >
        <SurveyPanel total={surveyResponses.length} tallies={summarizeSurvey(surveyResponses)} referrers={topReferrers(surveyResponses)} />
      </AdminSection>

      <AdminSection
        title="Programme d'influenceurs"
        description="Codes de réduction des influenceurs et commissions qu'il te reste à leur verser."
      >
        <InfluencerProgramPanel influencers={influencers} />
      </AdminSection>

      <AdminSection
        title="Bons plans et formations"
        description="Les offres des influenceurs et formateurs se gèrent désormais dans l'onglet Formations : elles s'affichent sur leur profil, dans le Réseau et dans le catalogue public."
      >
        <Link href="/app/admin/formations" className="text-sm font-medium text-gold hover:underline">
          Ouvrir l&apos;onglet Formations
        </Link>
      </AdminSection>

      <AdminSection
        title="Bannière du tableau de bord"
        description="Actualités ASCEND et bons plans de la semaine, affichés en haut du tableau de bord de tous les membres."
      >
        <BannersPanel banners={banners} />
      </AdminSection>
    </div>
  );
}
