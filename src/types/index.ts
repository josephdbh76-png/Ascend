import type {
  AccentTheme,
  AchievementRarity,
  ApplicationStatus,
  BillingInterval,
  ChallengeStatus,
  ChallengeType,
  CompensationType,
  OnboardingStep,
  OpportunityLocationType,
  OpportunityStage,
  OpportunityStatus,
  OpportunityType,
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
  city: string | null;
  isAdmin: boolean;
  isCofounder: boolean;
  skills: string[];
  createdAt: string;
}

export interface Business {
  name: string;
  category: string;
  website: string | null;
  siret: string | null;
  legalName: string | null;
  siretVerifiedAt: string | null;
}

export interface RevenuePoint {
  period: string;
  amountCents: number;
  isVerified: boolean;
  transactionCount: number | null;
  customerCount: number | null;
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
  isCofounder: boolean;
  legalName: string | null;
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
  billingInterval: BillingInterval | null;
  trialUsed: boolean;
  trialEndsAt: string | null;
}

export interface Opportunity {
  id: string;
  authorId: string;
  authorUsername: string;
  authorFirstName: string | null;
  authorLastName: string | null;
  type: OpportunityType;
  title: string;
  description: string;
  category: string | null;
  compensationType: CompensationType;
  locationType: OpportunityLocationType;
  city: string | null;
  country: string | null;
  skills: string[];
  targetStage: OpportunityStage;
  status: OpportunityStatus;
  createdAt: string;
}

/** An opportunity with a 0-100 relevance score for the current viewer, plus
 * why it scored that way — surfaced so the "matching intelligent" doesn't
 * feel like a black box. */
export interface OpportunityMatch extends Opportunity {
  matchScore: number;
  matchReasons: string[];
}

export interface OpportunityApplication {
  id: string;
  opportunityId: string;
  applicantId: string;
  applicantUsername: string;
  applicantFirstName: string | null;
  applicantLastName: string | null;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
}

export interface MyOpportunity extends Opportunity {
  applications: OpportunityApplication[];
}
