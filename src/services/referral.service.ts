import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import { getAppUrl } from "@/lib/utils";

const CREDIT_DAYS = 30;

/** Resolves a `?ref=username` value to a real profile id, or null for a made-up/self referral. */
export async function resolveReferrerId(refUsername: string, newUserId?: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("username", refUsername.toLowerCase()).maybeSingle();
  if (!data || data.id === newUserId) return null;
  return data.id;
}

export async function recordReferral(referrerId: string, referredId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("referrals").insert({ referrer_id: referrerId, referred_id: referredId });
}

/**
 * Called whenever refreshRevenueVerifiedFlag flips a profile to verified
 * — only the FIRST time (a referral marked already-rewarded is left
 * alone), and only if they were actually referred by someone. Grants the
 * referrer 30 days of Pro, stacking onto any credit they already have
 * rather than resetting it, since a member can refer more than once.
 */
export async function rewardReferrerIfEligible(referredUserId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: referral } = await admin
    .from("referrals")
    .select("id, referrer_id")
    .eq("referred_id", referredUserId)
    .is("rewarded_at", null)
    .maybeSingle();
  if (!referral) return;

  const { data: referrer } = await admin
    .from("profiles")
    .select("pro_credit_until")
    .eq("id", referral.referrer_id)
    .maybeSingle();
  if (!referrer) return;

  const base = referrer.pro_credit_until && new Date(referrer.pro_credit_until) > new Date()
    ? new Date(referrer.pro_credit_until)
    : new Date();
  const newCreditUntil = new Date(base.getTime() + CREDIT_DAYS * 24 * 60 * 60 * 1000);

  await admin.from("profiles").update({ pro_credit_until: newCreditUntil.toISOString() }).eq("id", referral.referrer_id);
  await admin.from("referrals").update({ rewarded_at: new Date().toISOString() }).eq("id", referral.id);

  await createNotificationForUser({
    userId: referral.referrer_id,
    type: "referral_rewarded",
    title: "Un mois de Pro offert !",
    body: "La personne que tu as parrainée vient d'être vérifiée sur ASCEND — tu viens de gagner 1 mois de Pro offert.",
  });
}

export function referralLink(username: string): string {
  return `${getAppUrl()}/signup?ref=${encodeURIComponent(username)}`;
}

export interface ReferralStats {
  referredCount: number;
  rewardedCount: number;
  proCreditUntil: string | null;
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const supabase = await createClient();
  const [{ data: referrals }, { data: profile }] = await Promise.all([
    supabase.from("referrals").select("rewarded_at").eq("referrer_id", userId),
    supabase.from("profiles").select("pro_credit_until").eq("id", userId).maybeSingle(),
  ]);

  return {
    referredCount: referrals?.length ?? 0,
    rewardedCount: (referrals ?? []).filter((r) => r.rewarded_at != null).length,
    proCreditUntil: profile?.pro_credit_until ?? null,
  };
}
