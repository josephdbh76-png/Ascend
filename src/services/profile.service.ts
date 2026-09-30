import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { RESERVED_USERNAMES } from "@/lib/constants";
import { normalizeWebsite } from "@/lib/business";
import { getUserAchievements } from "@/services/achievement.service";
import { getActiveTitle } from "@/services/title.service";
import type { Profile, PublicProfile, PublicBusiness, EarnedTrophy, EarnedTitle } from "@/types";
import type { PublicProfileRow } from "@/types/database.types";

// cache(): the app layout and most pages read the viewer's profile in the same request.
export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    firstName: data.first_name,
    lastName: data.last_name,
    country: data.country,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    onboardingStep: data.onboarding_step,
    revenueVerified: data.revenue_verified,
    isDemo: data.is_demo,
    foundingMemberNumber: data.founding_member_number,
    accentTheme: data.accent_theme,
    city: data.city,
    isAdmin: data.is_admin,
    isCofounder: data.is_cofounder,
    skills: data.skills,
    hasSeenTutorial: data.has_seen_tutorial,
    createdAt: data.created_at,
  };
});

export function isUsernameFormatValid(username: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(username);
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = username.toLowerCase();
  if (!isUsernameFormatValid(normalized)) return false;
  if (RESERVED_USERNAMES.includes(normalized)) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();
  return !data;
}

function mapPublicProfileRow(
  row: PublicProfileRow,
  achievements: PublicProfile["achievements"],
  trophies: EarnedTrophy[],
  activeTitle: EarnedTitle | null,
  businesses: PublicBusiness[],
): PublicProfile {
  return {
    userId: row.user_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    country: row.country,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    isDemo: row.is_demo,
    foundingMemberNumber: row.founding_member_number,
    revenueVerified: row.revenue_verified,
    memberSince: row.member_since,
    businessName: row.business_name,
    businessCategory: row.business_category,
    businesses,
    revenueVisibility: row.revenue_visibility,
    revenueDisplayCents: row.revenue_display_cents,
    revenueRangeMinCents: row.revenue_range_min_cents,
    revenueRangeMaxCents: row.revenue_range_max_cents,
    growthPercent: row.growth_percent,
    globalRank: row.global_rank,
    countryRank: row.country_rank,
    achievements,
    trophies,
    activeTitle,
    accentTheme: row.accent_theme,
    isCofounder: row.is_cofounder,
    legalName: row.legal_name,
  };
}

// cache(): generateMetadata and the page both ask for the same profile in one request.
export const getPublicProfileByUsername = cache(async (username: string): Promise<PublicProfile | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_profile", { p_username: username });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;

  const [achievements, activeTitle, { data: trophyRows }, businesses] = await Promise.all([
    getUserAchievements(row.user_id),
    getActiveTitle(row.user_id),
    supabase.from("user_trophies").select("trophy_id, earned_at").eq("user_id", row.user_id),
    getPublicBusinesses(row.user_id),
  ]);

  const trophyIds = (trophyRows ?? []).map((t) => t.trophy_id);
  const { data: trophyCatalog } = trophyIds.length
    ? await supabase.from("trophies").select("*").in("id", trophyIds)
    : { data: [] };
  const trophyById = new Map((trophyCatalog ?? []).map((t) => [t.id, t]));

  const trophies: EarnedTrophy[] = (trophyRows ?? [])
    .filter((t) => trophyById.has(t.trophy_id))
    .map((t) => {
      const def = trophyById.get(t.trophy_id)!;
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        earnedAt: t.earned_at,
        seasonName: null,
      };
    });

  return mapPublicProfileRow(row, achievements, trophies, activeTitle, businesses);
});

type BusinessRow = {
  name: string;
  category: string;
  custom_category?: string | null;
  description?: string | null;
  website: string | null;
};

function toPublicBusiness(b: BusinessRow): PublicBusiness {
  return {
    name: b.name,
    category: b.category,
    customCategory: b.custom_category?.trim() || null,
    description: b.description?.trim() || null,
    website: normalizeWebsite(b.website),
  };
}

async function getPublicBusinesses(userId: string): Promise<PublicBusiness[]> {
  const supabase = await createClient();
  const [{ data: main }, { data: extras }] = await Promise.all([
    supabase.from("businesses").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("extra_businesses")
      .select("name, category, custom_category, description, website")
      .eq("user_id", userId)
      .order("position")
      .order("created_at"),
  ]);
  return [...(main ? [toPublicBusiness(main)] : []), ...(extras ?? []).map(toPublicBusiness)];
}
