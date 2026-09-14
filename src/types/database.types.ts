// Hand-authored to match supabase/migrations/*.sql. Once the project is
// linked to a real Supabase instance, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts

export type OnboardingStep = "profile" | "business" | "bio" | "revenue" | "done";
export type RevenueVisibility = "exact" | "range" | "private";
export type SourceProvider = "stripe" | "shopify" | "paypal" | "paddle" | "manual";
export type SourceStatus = "connected" | "disconnected" | "error";
export type VerificationStatus = "unverified" | "verified" | "error" | "disconnected";
export type AchievementRarity = "common" | "rare" | "epic" | "legendary";
export type ChallengeType = "revenue_threshold" | "growth_threshold" | "consistency" | "coming_soon";
export type ChallengeStatus = "in_progress" | "completed";
export type LeaderboardScope = "global" | "country" | "category";
export type NotificationType =
  | "achievement_unlocked"
  | "rank_increased"
  | "challenge_started"
  | "milestone_reached"
  | "verification_completed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          first_name: string | null;
          last_name: string | null;
          country: string | null;
          bio: string | null;
          avatar_url: string | null;
          onboarding_step: OnboardingStep;
          revenue_verified: boolean;
          is_demo: boolean;
          founding_member_number: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["profiles"]["Row"], "id">> & {
          id: string;
          username: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          website: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["businesses"]["Row"], "id">> & {
          user_id: string;
          name: string;
          category: string;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Row"]>;
        Relationships: [];
      };
      revenue_sources: {
        Row: {
          id: string;
          user_id: string;
          provider: SourceProvider;
          status: SourceStatus;
          external_account_id: string | null;
          is_test_mode: boolean;
          connected_at: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["revenue_sources"]["Row"], "id">> & {
          user_id: string;
          provider: SourceProvider;
        };
        Update: Partial<Database["public"]["Tables"]["revenue_sources"]["Row"]>;
        Relationships: [];
      };
      verifications: {
        Row: {
          id: string;
          revenue_source_id: string;
          status: VerificationStatus;
          verified_at: string | null;
          last_checked_at: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["verifications"]["Row"], "id">> & {
          revenue_source_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["verifications"]["Row"]>;
        Relationships: [];
      };
      revenue_snapshots: {
        Row: {
          id: string;
          user_id: string;
          revenue_source_id: string | null;
          period: string;
          amount_cents: number;
          currency: string;
          is_verified: boolean;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["revenue_snapshots"]["Row"], "id">> & {
          user_id: string;
          period: string;
          amount_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["revenue_snapshots"]["Row"]>;
        Relationships: [];
      };
      privacy_settings: {
        Row: {
          user_id: string;
          revenue_visibility: RevenueVisibility;
          show_country: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["privacy_settings"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["privacy_settings"]["Row"]>;
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          rarity: AchievementRarity;
          criteria: Record<string, unknown>;
          created_at: string;
        };
        Insert: Database["public"]["Tables"]["achievements"]["Row"];
        Update: Partial<Database["public"]["Tables"]["achievements"]["Row"]>;
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          earned_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["user_achievements"]["Row"], "id">> & {
          user_id: string;
          achievement_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_achievements"]["Row"]>;
        Relationships: [];
      };
      trophies: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          created_at: string;
        };
        Insert: Database["public"]["Tables"]["trophies"]["Row"];
        Update: Partial<Database["public"]["Tables"]["trophies"]["Row"]>;
        Relationships: [];
      };
      user_trophies: {
        Row: {
          id: string;
          user_id: string;
          trophy_id: string;
          season_id: string | null;
          earned_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["user_trophies"]["Row"], "id">> & {
          user_id: string;
          trophy_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_trophies"]["Row"]>;
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          season_id: string | null;
          slug: string;
          title: string;
          description: string;
          type: ChallengeType;
          target: number;
          reward_achievement_id: string | null;
          starts_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["challenges"]["Row"], "id">> & {
          slug: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["challenges"]["Row"]>;
        Relationships: [];
      };
      user_challenges: {
        Row: {
          id: string;
          user_id: string;
          challenge_id: string;
          progress: number;
          status: ChallengeStatus;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["user_challenges"]["Row"], "id">> & {
          user_id: string;
          challenge_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_challenges"]["Row"]>;
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          number: number;
          name: string;
          label: string;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["seasons"]["Row"], "id">> & {
          number: number;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["seasons"]["Row"]>;
        Relationships: [];
      };
      leaderboard_snapshots: {
        Row: {
          id: string;
          user_id: string;
          season_id: string | null;
          scope: LeaderboardScope;
          scope_value: string;
          rank: number;
          revenue_cents: number | null;
          growth_percent: number | null;
          snapshot_date: string;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["leaderboard_snapshots"]["Row"], "id">> & {
          user_id: string;
          scope: LeaderboardScope;
          rank: number;
          snapshot_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["leaderboard_snapshots"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          metadata: Record<string, unknown>;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["notifications"]["Row"], "id">> & {
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_leaderboard: {
        Args: {
          p_scope?: string;
          p_scope_value?: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: LeaderboardRow[];
      };
      get_user_rank: {
        Args: { p_user_id: string; p_scope?: string; p_scope_value?: string };
        Returns: UserRankRow[];
      };
      get_public_profile: {
        Args: { p_username: string };
        Returns: PublicProfileRow[];
      };
    };
  };
}

export interface LeaderboardRow {
  rank: number;
  user_id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  country: string | null;
  is_demo: boolean;
  business_name: string;
  business_category: string;
  revenue_display_cents: number | null;
  revenue_visibility: RevenueVisibility;
  growth_percent: number | null;
  is_current_user: boolean;
}

export interface UserRankRow {
  rank: number;
  total: number;
  revenue_display_cents: number | null;
  revenue_visibility: RevenueVisibility;
  growth_percent: number | null;
}

export interface PublicProfileRow {
  user_id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_demo: boolean;
  founding_member_number: number | null;
  revenue_verified: boolean;
  member_since: string;
  business_name: string;
  business_category: string;
  revenue_display_cents: number | null;
  revenue_range_min_cents: number | null;
  revenue_range_max_cents: number | null;
  revenue_visibility: RevenueVisibility;
  growth_percent: number | null;
  global_rank: number | null;
  country_rank: number | null;
}
