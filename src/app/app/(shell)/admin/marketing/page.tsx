import type { Metadata } from "next";
import Link from "next/link";
import { listInfluencers } from "@/services/influencer.service";
import { listAllBannersForAdmin } from "@/services/banner.service";
import { listSurveyResponses, summarizeSurvey, topReferrers } from "@/services/survey.service";
import { AdminSection } from "../AdminSection";
import { SurveyPanel } from "../SurveyPanel";
import { InfluencerProgramPanel } from "../InfluencerProgramPanel";
import { BannersPanel } from "../BannersPanel";
import { PromoCodesPanel } from "../PromoCodesPanel";
import { listPromoCodes, type PromoCodeRow } from "@/services/promo.service";

export const metadata: Metadata = { title: "Marketing · Administration" };

export default async function AdminMarketingPage() {
  const [influencers, banners, surveyResponses, promo] = await Promise.all([
    listInfluencers(),
    listAllBannersForAdmin(),
    listSurveyResponses(),
    listPromoCodes()
      .then((codes) => ({ codes, error: null as string | null }))
      .catch((err: unknown) => ({ codes: [] as PromoCodeRow[], error: err instanceof Error ? err.message : "Stripe ne répond pas." })),
  ]);
  // Codes that work today, to flag a banner showing one that doesn't.
  const usableCodes = promo.error ? null : promo.codes.filter((c) => c.usable).map((c) => c.code.toUpperCase());

  return (
    <div className="flex flex-col gap-6">
      <AdminSection
        title="Questionnaire d'inscription"
        description="Comment les membres nous découvrent, où ils encaissent, leur niveau et ce qu'ils viennent chercher."
      >
        <SurveyPanel total={surveyResponses.length} tallies={summarizeSurvey(surveyResponses)} referrers={topReferrers(surveyResponses)} />
      </AdminSection>

      <AdminSection
        title="Codes promo"
        description="Tous les codes Stripe et leur état réel : réduction, durée, offres concernées, utilisations. Ceux des influenceurs se gèrent dans leur programme, juste en dessous."
      >
        <PromoCodesPanel codes={promo.codes} error={promo.error} />
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
        <BannersPanel banners={banners} usableCodes={usableCodes} />
      </AdminSection>
    </div>
  );
}
