// Hand-authored to match supabase/migrations/*.sql. Once the project is
// linked to a real Supabase instance, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts

export type OnboardingStep = "profile" | "business" | "bio" | "revenue" | "done";
export type RevenueVisibility = "exact" | "range" | "private";
export type SourceProvider = "stripe" | "shopify" | "paypal" | "paddle" | "manual" | "bank" | "lemonsqueezy";
export type SourceStatus = "connected" | "disconnected" | "error";
export type VerificationStatus = "unverified" | "verified" | "pending" | "rejected" | "error" | "disconnected";
export type RevenueReviewStatus = "pending" | "approved" | "rejected";
export type AchievementRarity = "common" | "rare" | "epic" | "legendary";
export type ChallengeType = "revenue_threshold" | "growth_threshold" | "consistency" | "coming_soon";
export type ChallengeStatus = "in_progress" | "completed";
export type LeaderboardScope = "global" | "country" | "category";
export type NotificationType =
  | "achievement_unlocked"
  | "rank_increased"
  | "challenge_started"
  | "milestone_reached"
  | "verification_completed"
  | "new_follower"
  | "new_message"
  | "new_application"
  | "application_status_changed"
  | "revenue_review_completed"
  | "referral_rewarded";
export type TitleRarity = "common" | "rare" | "epic" | "legendary" | "exclusive";
export type TitleType = "earned" | "purchasable";
export type SubscriptionTier = "free" | "pro" | "elite";
export type BillingInterval = "month" | "year";
export type SubscriptionStatus = "active" | "past_due" | "canceled";
export type AccentTheme = "gold" | "emerald" | "violet" | "crimson" | "sky";
export type ConversationStatus = "pending" | "accepted";
export type OpportunityType = "cofounder" | "developer" | "partner" | "growth" | "freelance" | "investor" | "other";
export type CompensationType = "equity" | "paid" | "both" | "unpaid";
export type OpportunityLocationType = "remote" | "onsite" | "hybrid";
export type OpportunityStage = "any" | "pre_revenue" | "early" | "growth" | "scale";
export type OpportunityStatus = "open" | "closed";
export type ApplicationStatus = "pending" | "viewed" | "accepted" | "declined";

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
          accent_theme: AccentTheme;
          city: string | null;
          is_admin: boolean;
          is_cofounder: boolean;
          skills: string[];
          has_seen_tutorial: boolean;
          marketing_consent: boolean;
          unsubscribe_token: string;
          email_notifications_enabled: boolean;
          referred_by: string | null;
          pro_credit_until: string | null;
          notification_email_prefs: Record<string, boolean>;
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
          siret: string | null;
          legal_name: string | null;
          siret_verified_at: string | null;
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
      provider_credentials: {
        Row: {
          id: string;
          revenue_source_id: string;
          client_id: string;
          client_secret: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["provider_credentials"]["Row"], "id">> & {
          revenue_source_id: string;
          client_id: string;
          client_secret: string;
        };
        Update: Partial<Database["public"]["Tables"]["provider_credentials"]["Row"]>;
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
          transaction_count: number | null;
          customer_count: number | null;
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
      revenue_source_snapshots: {
        Row: {
          id: string;
          user_id: string;
          revenue_source_id: string;
          period: string;
          amount_cents: number;
          currency: string;
          is_verified: boolean;
          transaction_count: number | null;
          customer_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["revenue_source_snapshots"]["Row"], "id">> & {
          user_id: string;
          revenue_source_id: string;
          period: string;
          amount_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["revenue_source_snapshots"]["Row"]>;
        Relationships: [];
      };
      revenue_declarations: {
        Row: {
          id: string;
          user_id: string;
          period: string;
          label: string | null;
          amount_cents: number;
          proof_path: string;
          review_status: RevenueReviewStatus;
          reviewed_at: string | null;
          reviewed_by: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["revenue_declarations"]["Row"], "id">> & {
          user_id: string;
          period: string;
          amount_cents: number;
          proof_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["revenue_declarations"]["Row"]>;
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
      titles: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          rarity: TitleRarity;
          type: TitleType;
          price_cents: number | null;
          supply: number | null;
          remaining_supply: number | null;
          stripe_price_id: string | null;
          requirement: Record<string, unknown>;
          tradeable: boolean;
          created_at: string;
        };
        Insert: Database["public"]["Tables"]["titles"]["Row"];
        Update: Partial<Database["public"]["Tables"]["titles"]["Row"]>;
        Relationships: [];
      };
      user_titles: {
        Row: {
          id: string;
          user_id: string;
          title_id: string;
          acquired_at: string;
          acquisition_type: "earned" | "purchased";
          is_active: boolean;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["user_titles"]["Row"], "id">> & {
          user_id: string;
          title_id: string;
          acquisition_type: "earned" | "purchased";
        };
        Update: Partial<Database["public"]["Tables"]["user_titles"]["Row"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          user_id: string;
          tier: SubscriptionTier;
          status: SubscriptionStatus;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_end: string | null;
          billing_interval: BillingInterval | null;
          trial_used: boolean;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          followee_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["follows"]["Row"]> & {
          follower_id: string;
          followee_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["follows"]["Row"]>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          requested_by: string;
          status: ConversationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["conversations"]["Row"]> & {
          user_a: string;
          user_b: string;
          requested_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Row"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]> & {
          conversation_id: string;
          sender_id: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
        Relationships: [];
      };
      opportunities: {
        Row: {
          id: string;
          author_id: string;
          type: OpportunityType;
          title: string;
          description: string;
          category: string | null;
          compensation_type: CompensationType;
          location_type: OpportunityLocationType;
          city: string | null;
          country: string | null;
          skills: string[];
          target_stage: OpportunityStage;
          status: OpportunityStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["opportunities"]["Row"], "id">> & {
          author_id: string;
          type: OpportunityType;
          title: string;
          description: string;
          compensation_type: CompensationType;
          location_type: OpportunityLocationType;
        };
        Update: Partial<Database["public"]["Tables"]["opportunities"]["Row"]>;
        Relationships: [];
      };
      opportunity_applications: {
        Row: {
          id: string;
          opportunity_id: string;
          applicant_id: string;
          message: string;
          status: ApplicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["opportunity_applications"]["Row"], "id">> & {
          opportunity_id: string;
          applicant_id: string;
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["opportunity_applications"]["Row"]>;
        Relationships: [];
      };
      opportunity_application_attachments: {
        Row: {
          id: string;
          application_id: string;
          file_path: string;
          file_name: string;
          file_size: number;
          content_type: string;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["opportunity_application_attachments"]["Row"], "id">> & {
          application_id: string;
          file_path: string;
          file_name: string;
          file_size: number;
          content_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["opportunity_application_attachments"]["Row"]>;
        Relationships: [];
      };
      email_campaigns: {
        Row: {
          id: string;
          subject: string;
          body: string;
          audience: string;
          recipient_count: number;
          sent_by: string;
          sent_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["email_campaigns"]["Row"], "id">> & {
          subject: string;
          body: string;
          audience: string;
          sent_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_campaigns"]["Row"]>;
        Relationships: [];
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          body: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["email_templates"]["Row"], "id">> & {
          name: string;
          subject: string;
          body: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_templates"]["Row"]>;
        Relationships: [];
      };
      profile_views: {
        Row: {
          id: string;
          viewed_user_id: string;
          viewer_id: string;
          viewed_on: string;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["profile_views"]["Row"], "id">> & {
          viewed_user_id: string;
          viewer_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profile_views"]["Row"]>;
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          rewarded_at: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["referrals"]["Row"], "id">> & {
          referrer_id: string;
          referred_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["referrals"]["Row"]>;
        Relationships: [];
      };
      bank_connections: {
        Row: {
          id: string;
          user_id: string;
          revenue_source_id: string;
          authorization_id: string;
          session_id: string | null;
          institution_name: string;
          institution_country: string;
          account_ids: string[];
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["bank_connections"]["Row"], "id">> & {
          user_id: string;
          revenue_source_id: string;
          authorization_id: string;
          institution_name: string;
          institution_country: string;
        };
        Update: Partial<Database["public"]["Tables"]["bank_connections"]["Row"]>;
        Relationships: [];
      };
      bank_transactions: {
        Row: {
          id: string;
          user_id: string;
          revenue_source_id: string;
          external_id: string;
          account_id: string;
          booking_date: string;
          amount_cents: number;
          currency: string;
          counterparty: string | null;
          description: string | null;
          is_revenue: boolean;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["bank_transactions"]["Row"], "id">> & {
          user_id: string;
          revenue_source_id: string;
          external_id: string;
          account_id: string;
          booking_date: string;
          amount_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["bank_transactions"]["Row"]>;
        Relationships: [];
      };
      rate_limit_attempts: {
        Row: {
          id: string;
          identifier: string;
          action: string;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["rate_limit_attempts"]["Row"], "id">> & {
          identifier: string;
          action: string;
        };
        Update: Partial<Database["public"]["Tables"]["rate_limit_attempts"]["Row"]>;
        Relationships: [];
      };
      influencers: {
        Row: {
          id: string;
          name: string;
          email: string;
          code: string;
          stripe_coupon_id: string;
          stripe_promotion_code_id: string;
          commission_rate: number;
          discount_percent: number;
          duration: "forever" | "once";
          status: "active" | "inactive";
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["influencers"]["Row"], "id">> & {
          name: string;
          email: string;
          code: string;
          stripe_coupon_id: string;
          stripe_promotion_code_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["influencers"]["Row"]>;
        Relationships: [];
      };
      influencer_commissions: {
        Row: {
          id: string;
          influencer_id: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_checkout_session_id: string;
          amount_cents: number;
          currency: string;
          status: "pending" | "paid";
          paid_at: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["influencer_commissions"]["Row"], "id">> & {
          influencer_id: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_checkout_session_id: string;
          amount_cents: number;
          currency: string;
        };
        Update: Partial<Database["public"]["Tables"]["influencer_commissions"]["Row"]>;
        Relationships: [];
      };
      automated_email_settings: {
        Row: {
          email_key: string;
          enabled: boolean;
          updated_at: string;
        };
        Insert: { email_key: string; enabled?: boolean };
        Update: Partial<Database["public"]["Tables"]["automated_email_settings"]["Row"]>;
        Relationships: [];
      };
      deals: {
        Row: {
          id: string;
          title: string;
          description: string;
          influencer_name: string;
          original_price_cents: number;
          deal_price_cents: number;
          external_url: string;
          cover_image_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["deals"]["Row"], "id">> & {
          title: string;
          description: string;
          influencer_name: string;
          original_price_cents: number;
          deal_price_cents: number;
          external_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["deals"]["Row"]>;
        Relationships: [];
      };
      seller_accounts: {
        Row: {
          user_id: string;
          stripe_account_id: string;
          payouts_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; stripe_account_id: string; payouts_enabled?: boolean };
        Update: Partial<Database["public"]["Tables"]["seller_accounts"]["Row"]>;
        Relationships: [];
      };
      title_listings: {
        Row: {
          id: string;
          seller_id: string;
          user_title_id: string;
          title_id: string;
          price_cents: number;
          status: "active" | "sold" | "cancelled";
          buyer_id: string | null;
          commission_cents: number | null;
          stripe_checkout_session_id: string | null;
          view_count: number;
          created_at: string;
          sold_at: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["title_listings"]["Row"], "id">> & {
          seller_id: string;
          user_title_id: string;
          title_id: string;
          price_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["title_listings"]["Row"]>;
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
      purchase_exclusive_title: {
        Args: { p_title_id: string };
        Returns: boolean;
      };
      grant_purchased_title: {
        Args: { p_user_id: string; p_title_id: string };
        Returns: boolean;
      };
      get_benchmark_stats: {
        Args: { p_user_id: string };
        Returns: BenchmarkStatsRow[];
      };
      capture_leaderboard_snapshot: {
        Args: { p_snapshot_date?: string };
        Returns: undefined;
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
  revenue_range_min_cents: number | null;
  revenue_range_max_cents: number | null;
  revenue_visibility: RevenueVisibility;
  growth_percent: number | null;
  is_current_user: boolean;
  active_title: { name: string; icon: string; rarity: TitleRarity } | null;
}

export interface UserRankRow {
  rank: number;
  total: number;
  revenue_display_cents: number | null;
  revenue_range_min_cents: number | null;
  revenue_range_max_cents: number | null;
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
  accent_theme: AccentTheme;
  is_cofounder: boolean;
  legal_name: string | null;
}

export interface BenchmarkStatsRow {
  category: string;
  category_sample_size: number;
  /** 0–1 fraction of same-category verified peers this user's revenue exceeds. */
  category_revenue_percentile: number | null;
  category_growth_percentile: number | null;
  category_median_revenue_cents: number | null;
  global_sample_size: number;
  global_revenue_percentile: number | null;
  global_growth_percentile: number | null;
}
