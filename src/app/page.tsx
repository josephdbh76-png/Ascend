import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { LeaderboardPreview } from "@/components/landing/LeaderboardPreview";
import { ProfileShowcase } from "@/components/landing/ProfileShowcase";
import { AchievementsPreview } from "@/components/landing/AchievementsPreview";
import { TitlesPreview } from "@/components/landing/TitlesPreview";
import { ComingSoonStrip } from "@/components/landing/ComingSoonStrip";
import { ChallengesPreview } from "@/components/landing/ChallengesPreview";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      <main>
        <Hero />
        <TrustStrip />
        <Problem />
        <HowItWorks />
        <Features />
        <LeaderboardPreview />
        <ProfileShowcase />
        <AchievementsPreview />
        <TitlesPreview />
        <ComingSoonStrip />
        <ChallengesPreview />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
