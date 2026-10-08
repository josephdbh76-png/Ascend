import type { Metadata } from "next";
import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { LandingStructuredData } from "@/components/landing/LandingStructuredData";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { LeaderboardPreview } from "@/components/landing/LeaderboardPreview";
import { ProfileShowcase } from "@/components/landing/ProfileShowcase";
import { AchievementsPreview } from "@/components/landing/AchievementsPreview";
import { CommunityPreview } from "@/components/landing/CommunityPreview";
import { ChallengesPreview } from "@/components/landing/ChallengesPreview";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { getFoundingSpotsLeft } from "@/services/founding.service";
import { getCofounders } from "@/services/team.service";
import { Founders } from "@/components/landing/Founders";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function LandingPage() {
  const [foundingSpotsLeft, cofounders] = await Promise.all([getFoundingSpotsLeft(), getCofounders()]);

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <LandingStructuredData />
      <PublicNav />
      <main id="main-content">
        <Hero foundingSpotsLeft={foundingSpotsLeft} />
        <TrustStrip />
        <Problem />
        <HowItWorks />
        <Features />
        <LeaderboardPreview />
        <ProfileShowcase />
        <AchievementsPreview />
        <CommunityPreview />
        <ChallengesPreview />
        <Pricing />
        <FAQ />
        <Founders cofounders={cofounders} />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
