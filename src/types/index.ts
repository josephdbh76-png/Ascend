import type {
  AccentTheme,
  AchievementRarity,
  ChallengeStatus,
  ChallengeType,
  OnboardingStep,
  RevenueVisibility,
  SubscriptionStatus,
  SubscriptionTier,
  TitleRarity,
  TitleType,
  VerificationStatus,
} from "./database.types";

export type { AccentTheme };

export interface Profile {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  bio: string | null;
  avatarUrl: string | null;
  onboardingStep: OnboardingStep;
  revenueVerified: boolean;
  isDemo: boolean;
  foundingMemberNumber: number | null;
  accentTheme: AccentTheme;
  createdAt: string;
}

export interface Business {
  name: string;
  category: string;
  website: string | null;
}

export interface RevenuePoint {
  period: string;
  amountCents: number;
  isVerified: boolean;
}

export interface DashboardData {
  profile: Profile;
  business: Business | null;
  verificationStatus: VerificationStatus;
  currentRevenueCents: number | null;
  growthPercent: number | null;
  history: RevenuePoint[];
  globalRank: number | null;
  globalTotal: number | null;
  globalRankMovement: number | null;
  countryRank: number | null;
  countryTotal: number | null;
  nextMilestoneCents: number | null;
  milestoneProgressPercent: number | null;
  recentAchievements: EarnedAchievement[];
  activeChallenges: ChallengeProgress[];
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
}

export interface EarnedAchievement extends AchievementDef {
  earnedAt: string;
}

export interface TrophyDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface EarnedTrophy extends TrophyDef {
  earnedAt: string;
  seasonName: string | null;
}

export interface ChallengeProgress {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: ChallengeType;
  target: number;
  progress: number;
  status: ChallengeStatus;
  endsAt: string;
  rewardAchievementId: string | null;
}

export interface PublicProfile {
  userId: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isDemo: boolean;
  foundingMemberNumber: number | null;
  revenueVerified: boolean;
  memberSince: string;
  businessName: string;
  businessCategory: string;
  revenueVisibility: RevenueVisibility;
  revenueDisplayCents: number | null;
  revenueRangeMinCents: number | null;
  revenueRangeMaxCents: number | null;
  growthPercent: number | null;
  globalRank: number | null;
  countryRank: number | null;
  achievements: EarnedAchievement[];
  trophies: EarnedTrophy[];
  activeTitle: EarnedTitle | null;
  accentTheme: AccentTheme;
}

export interface TitleRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: TitleRarity;
  type: TitleType;
  price_cents: number | null;
  supply: number | null;
  remaining_supply: number | null;
  requirement: Record<string, unknown>;
}

export interface EarnedTitle {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: TitleRarity;
  acquiredAt: string;
  acquisitionType: "earned" | "purchased";
  isActive: boolean;
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
}
