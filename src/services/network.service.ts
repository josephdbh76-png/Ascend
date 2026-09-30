import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createNotificationForUser } from "@/services/notification.service";
import { getActiveTitlesByUserIds, type ActiveTitleInfo } from "@/services/title.service";

export interface NetworkProfileRow {
  userId: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  businessName: string;
  businessCategory: string;
  /** Wording chosen by the member for the main activity. */
  businessLabel: string | null;
  /** Names of the member's other activities. */
  otherActivities: string[];
  revenueVerified: boolean;
  followerCount: number;
  isFollowing: boolean;
  activeTitle: ActiveTitleInfo | null;
}

type ProfileForNetwork = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  revenue_verified: boolean;
};

const PROFILE_COLUMNS = "id, username, first_name, last_name, avatar_url, city, country, revenue_verified";

async function buildRows(
  profiles: ProfileForNetwork[],
  categoryFilter: string | undefined,
  viewerId: string | null,
): Promise<NetworkProfileRow[]> {
  const supabase = await createClient();
  if (profiles.length === 0) return [];
  const ids = profiles.map((p) => p.id);

  // select("*"): custom_category only exists once migration 060 has run.
  const [{ data: businesses }, { data: extras }] = await Promise.all([
    supabase.from("businesses").select("*").in("user_id", ids),
    supabase.from("extra_businesses").select("user_id, name, category").in("user_id", ids).order("position"),
  ]);
  const businessByUser = new Map((businesses ?? []).map((b) => [b.user_id, b]));
  const extrasByUser = new Map<string, { name: string; category: string }[]>();
  for (const e of extras ?? []) extrasByUser.set(e.user_id, [...(extrasByUser.get(e.user_id) ?? []), e]);

  // A founder matches a category through the main activity or any other one.
  const matchedIds = categoryFilter
    ? ids.filter(
        (id) =>
          businessByUser.get(id)?.category === categoryFilter ||
          (extrasByUser.get(id) ?? []).some((e) => e.category === categoryFilter),
      )
    : ids;
  if (matchedIds.length === 0) return [];

  const activeTitleByUser = await getActiveTitlesByUserIds(matchedIds);

  const { data: allFollows } = await supabase
    .from("follows")
    .select("follower_id, followee_id")
    .in("followee_id", matchedIds);
  const followerCountMap = new Map<string, number>();
  const followingSet = new Set<string>();
  for (const f of allFollows ?? []) {
    followerCountMap.set(f.followee_id, (followerCountMap.get(f.followee_id) ?? 0) + 1);
    if (viewerId && f.follower_id === viewerId) followingSet.add(f.followee_id);
  }

  return matchedIds
    .filter((id) => id !== viewerId)
    .map((id) => {
      const p = profiles.find((pp) => pp.id === id)!;
      const b = businessByUser.get(id);
      return {
        userId: p.id,
        username: p.username,
        firstName: p.first_name,
        lastName: p.last_name,
        avatarUrl: p.avatar_url,
        city: p.city,
        country: p.country,
        businessName: b?.name ?? "",
        businessCategory: b?.category ?? "",
        businessLabel: b?.custom_category?.trim() || null,
        otherActivities: (extrasByUser.get(id) ?? []).map((e) => e.name),
        revenueVerified: p.revenue_verified,
        followerCount: followerCountMap.get(id) ?? 0,
        isFollowing: followingSet.has(id),
        activeTitle: activeTitleByUser.get(id) ?? null,
      };
    });
}

function cleanTerm(term: string | undefined): string {
  // Characters with a meaning in PostgREST filter strings are dropped.
  return (term ?? "").replace(/[%,()"\\*:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Matches names and bio, skills, and every activity a member presents
 * (name, own wording, description), not only the main business.
 */
async function idsMatching(term: string): Promise<string[]> {
  const supabase = await createClient();
  const pattern = `%${term}%`;
  const capitalized = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
  const [byProfile, bySkill, byBusiness, byExtra] = await Promise.all([
    supabase
      .from("profiles")
      .select("id")
      .or(`username.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},bio.ilike.${pattern}`)
      .limit(80),
    supabase.from("profiles").select("id").overlaps("skills", [term, term.toLowerCase(), capitalized]).limit(40),
    supabase
      .from("businesses")
      .select("user_id")
      .or(`name.ilike.${pattern},custom_category.ilike.${pattern},description.ilike.${pattern}`)
      .limit(80),
    supabase
      .from("extra_businesses")
      .select("user_id")
      .or(`name.ilike.${pattern},custom_category.ilike.${pattern},description.ilike.${pattern}`)
      .limit(80),
  ]);
  return [
    ...new Set([
      ...(byProfile.data ?? []).map((r) => r.id),
      ...(bySkill.data ?? []).map((r) => r.id),
      ...(byBusiness.data ?? []).map((r) => r.user_id),
      ...(byExtra.data ?? []).map((r) => r.user_id),
    ]),
  ];
}

export async function searchNetwork(
  params: { query?: string; city?: string; category?: string },
  viewerId: string | null,
): Promise<NetworkProfileRow[]> {
  const supabase = await createClient();

  let profileQuery = supabase.from("profiles").select(PROFILE_COLUMNS).limit(60);

  const query = cleanTerm(params.query);
  if (query) {
    const ids = await idsMatching(query);
    if (ids.length === 0) return [];
    profileQuery = profileQuery.in("id", ids.slice(0, 200));
  }
  const city = params.city?.trim();
  if (city) profileQuery = profileQuery.ilike("city", `%${city.replace(/[%,]/g, "")}%`);

  const { data: profiles, error } = await profileQuery;
  if (error) throw new Error(error.message);
  return buildRows(profiles ?? [], params.category, viewerId);
}

/** Top founders by follower count — a lightweight "trending" proxy. */
export async function getTrendingFounders(viewerId: string | null, limit = 6): Promise<NetworkProfileRow[]> {
  const supabase = await createClient();
  const { data: follows } = await supabase.from("follows").select("followee_id");
  if (!follows || follows.length === 0) return [];

  const counts = new Map<string, number>();
  for (const f of follows) counts.set(f.followee_id, (counts.get(f.followee_id) ?? 0) + 1);
  const topIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([id]) => id !== viewerId)
    .slice(0, limit)
    .map(([id]) => id);
  if (topIds.length === 0) return [];

  const { data: profiles } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", topIds);
  const rows = await buildRows(profiles ?? [], undefined, viewerId);
  return rows.sort((a, b) => b.followerCount - a.followerCount);
}

/** Founders who joined most recently. */
export async function getNewestFounders(viewerId: string | null, limit = 6): Promise<NetworkProfileRow[]> {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select(`${PROFILE_COLUMNS}, created_at`)
    .eq("is_demo", false)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  return buildRows(profiles ?? [], undefined, viewerId);
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const supabase = await createClient();
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

export async function getRecentFollowerCount(userId: string, sinceDays: number): Promise<number> {
  const supabase = await createClient();
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("followee_id", userId)
    .gte("created_at", since);
  return count ?? 0;
}

export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId)
    .maybeSingle();
  return !!data;
}

export async function toggleFollow(followerId: string, followeeId: string): Promise<{ following: boolean }> {
  if (followerId === followeeId) throw new Error("Tu ne peux pas te suivre toi-même.");
  const supabase = await createClient();

  const already = await isFollowing(followerId, followeeId);
  if (already) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("followee_id", followeeId);
    if (error) throw new Error(error.message);
    return { following: false };
  }

  const { error } = await supabase.from("follows").insert({ follower_id: followerId, followee_id: followeeId });
  if (error) throw new Error(error.message);

  const { data: follower } = await supabase
    .from("profiles")
    .select("username, first_name")
    .eq("id", followerId)
    .maybeSingle();
  await createNotificationForUser({
    userId: followeeId,
    type: "new_follower",
    title: "Nouvel abonné",
    body: `${follower?.first_name ?? follower?.username ?? "Quelqu'un"} a commencé à te suivre.`,
    metadata: { follower_id: followerId, username: follower?.username },
  });

  return { following: true };
}

export interface NetworkTeaser {
  totalActive: number;
  sameCategoryCount: number;
  category: string | null;
}

/**
 * A safe-to-show-to-anyone summary of the Réseau directory — real counts,
 * never actual member data — used to tease non-Elite members.
 */
export async function getNetworkTeaser(viewerId: string): Promise<NetworkTeaser> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("category")
    .eq("user_id", viewerId)
    .maybeSingle();

  const [{ count: totalActive }, { count: sameCategoryCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_demo", false)
      .neq("id", viewerId),
    business?.category
      ? supabase
          .from("businesses")
          .select("*", { count: "exact", head: true })
          .eq("category", business.category)
          .neq("user_id", viewerId)
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    totalActive: totalActive ?? 0,
    sameCategoryCount: sameCategoryCount ?? 0,
    category: business?.category ?? null,
  };
}
