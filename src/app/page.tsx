import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { LeaderboardPreview } from "@/components/landing/LeaderboardPreview";
import { ChallengesPreview } from "@/components/landing/ChallengesPreview";
import { AchievementsPreview } from "@/components/landing/AchievementsPreview";
import { ProfileShowcase } from "@/components/landing/ProfileShowcase";
import { ComingSoonStrip } from "@/components/landing/ComingSoonStrip";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { Pricing } from "@/components/landing/Pricing";
import { FoundingMembers } from "@/components/landing/FoundingMembers";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <LeaderboardPreview />
        <ChallengesPreview />
        <AchievementsPreview />
        <ProfileShowcase />
        <ComingSoonStrip />
        <WhoItsFor />
        <Pricing />
        <FoundingMembers />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
