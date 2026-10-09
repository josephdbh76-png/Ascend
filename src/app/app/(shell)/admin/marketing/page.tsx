import type { Metadata } from "next";
import Link from "next/link";
import { listInfluencers } from "@/services/influencer.service";
import { listAllBannersForAdmin } from "@/services/banner.service";
import { listSurveyResponses, summarizeSurvey, topReferrers } from "@/services/survey.service";
import { AdminSection } from "../AdminSection";
import { SurveyPanel } from "../SurveyPanel";
import { InfluencerProgramPanel } from "../InfluencerProgramPanel";
import { ClansAdminPanel } from "../ClansAdminPanel";
import { listClans } from "@/services/clan.service";
import { listAllWars } from "@/services/clanWar.service";
import { listPayableRewards } from "@/services/invite.service";
import { BannersPanel } from "../BannersPanel";
import { PromoCodesPanel } from "../PromoCodesPanel";
import { listPromoCodes, type PromoCodeRow } from "@/services/promo.service";

export const metadata: Metadata = { title: "Marketing · Administration" };

export default async function AdminMarketingPage() {
  const [influencers, banners, surveyResponses, promo, clans, wars, payouts] = await Promise.all([
    listInfluencers(),
    listAllBannersForAdmin(),
    listSurveyResponses(),
    listPromoCodes()
      .then((codes) => ({ codes, error: null as string | null }))
      .catch((err: unknown) => ({ codes: [] as PromoCodeRow[], error: err instanceof Error ? err.message : "Stripe ne répond pas." })),
    listClans({ includeInactive: true }),
    listAllWars(),
    listPayableRewards(),
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
        title="Programme créateurs"
        description="Liens, codes de réduction et commissions des créateurs partenaires, et ce qu'il te reste à leur verser le 5 du mois."
      >
        <InfluencerProgramPanel influencers={influencers} />
      </AdminSection>

      <AdminSection title="Ligues, guerres et gains d'invitation" description="Les ligues ouvertes par les membres, leurs guerres, et les gains d'invitation à verser le 5.">
        <ClansAdminPanel
          clans={clans.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            emblem: c.emblem,
            color: c.color,
            leader: c.leader?.username ?? null,
            memberCount: c.memberCount,
            verifiedCount: c.verifiedCount,
            trophies: c.trophies,
            isPartner: c.isPartner,
            isActive: c.isActive,
          }))}
          wars={wars.map((w) => ({
            id: w.id,
            phase: w.phase,
            a: w.a.clan.name,
            b: w.b.clan.name,
            totalA: w.a.total,
            totalB: w.b.total,
            startsAt: w.startsAt,
            endsAt: w.endsAt,
            winner: w.winner === "a" ? w.a.clan.name : w.winner === "b" ? w.b.clan.name : null,
          }))}
          payouts={payouts.map((p) => ({ userId: p.userId, username: p.username, availableCents: p.availableCents, holdingCents: p.holdingCents, payoutAccount: p.payoutAccount }))}
          partners={influencers
            .filter((i) => i.linkedUsername && i.status === "active" && !clans.some((c) => c.influencerId === i.id))
            .map((i) => ({ id: i.id, name: i.name, username: i.linkedUsername! }))}
        />
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
