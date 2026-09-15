import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createNotificationForUser } from "@/services/notification.service";

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
  revenueVerified: boolean;
  followerCount: number;
  isFollowing: boolean;
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

  let businessQuery = supabase.from("businesses").select("user_id, name, category").in("user_id", ids);
  if (categoryFilter) businessQuery = businessQuery.eq("category", categoryFilter);
  const { data: businesses } = await businessQuery;
  const businessByUser = new Map((businesses ?? []).map((b) => [b.user_id, b]));

  const matchedIds = categoryFilter ? ids.filter((id) => businessByUser.has(id)) : ids;
  if (matchedIds.length === 0) return [];

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
        revenueVerified: p.revenue_verified,
        followerCount: followerCountMap.get(id) ?? 0,
        isFollowing: followingSet.has(id),
      };
    });
}

export async function searchNetwork(
  params: { query?: string; city?: string; category?: string },
  viewerId: string | null,
): Promise<NetworkProfileRow[]> {
  const supabase = await createClient();

  let profileQuery = supabase.from("profiles").select(PROFILE_COLUMNS).limit(60);

  const query = params.query?.trim();
  if (query) {
    const escaped = query.replace(/[%,]/g, "");
    profileQuery = profileQuery.or(
      `username.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`,
    );
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
