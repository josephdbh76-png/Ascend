import "server-only";
import { createClient } from "@/lib/supabase/server";

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

export async function searchNetwork(
  params: { query?: string; city?: string; category?: string },
  viewerId: string | null,
): Promise<NetworkProfileRow[]> {
  const supabase = await createClient();

  let profileQuery = supabase
    .from("profiles")
    .select("id, username, first_name, last_name, avatar_url, city, country, revenue_verified")
    .limit(60);

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
  if (!profiles || profiles.length === 0) return [];

  const ids = profiles.map((p) => p.id);

  let businessQuery = supabase.from("businesses").select("user_id, name, category").in("user_id", ids);
  if (params.category) businessQuery = businessQuery.eq("category", params.category);
  const { data: businesses } = await businessQuery;
  const businessByUser = new Map((businesses ?? []).map((b) => [b.user_id, b]));

  const matchedIds = params.category ? ids.filter((id) => businessByUser.has(id)) : ids;
  if (matchedIds.length === 0) return [];

  const { data: allFollows } = await supabase.from("follows").select("follower_id, followee_id").in("followee_id", matchedIds);
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
  return { following: true };
}
