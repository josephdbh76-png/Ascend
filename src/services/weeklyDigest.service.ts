import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendFromAddress } from "@/lib/resend";
import { renderEmailHtml } from "@/lib/emailRender";
import { getEmailsByUserIds } from "@/services/email-campaign.service";
import { getAppUrl } from "@/lib/utils";

const WINDOW_DAYS = 7;
const SEND_BATCH_SIZE = 20;

interface WeeklySignal {
  newFollowers: number;
  profileViews: number;
  rankMovement: number | null; // positive = moved up (rank number decreased)
  currentRank: number | null;
}

function buildDigestBody(firstName: string | null, signal: WeeklySignal): string {
  const greeting = firstName ? `Salut ${firstName},` : "Salut,";
  const lines: string[] = [];

  if (signal.currentRank != null && signal.rankMovement) {
    lines.push(
      signal.rankMovement > 0
        ? `Tu as gagné ${signal.rankMovement} place${signal.rankMovement > 1 ? "s" : ""} au classement mondial cette semaine — te voilà #${signal.currentRank}.`
        : `Tu es passé de #${signal.currentRank + signal.rankMovement} à #${signal.currentRank} au classement mondial cette semaine.`,
    );
  }
  if (signal.profileViews > 0) {
    lines.push(`${signal.profileViews} personne${signal.profileViews > 1 ? "s ont" : " a"} consulté ton profil cette semaine.`);
  }
  if (signal.newFollowers > 0) {
    lines.push(`Tu as gagné ${signal.newFollowers} nouvel${signal.newFollowers > 1 ? "s abonnés" : " abonné"} cette semaine.`);
  }

  return `${greeting}\n\n${lines.join("\n\n")}`;
}

/**
 * Sends a weekly recap only to members with something real to report —
 * an empty "nothing happened this week" email would just teach people to
 * ignore ASCEND's mail. Reuses leaderboard_snapshots (populated by the
 * daily /api/cron/leaderboard-snapshot run) and profile_views/follows for
 * the other two signals.
 */
export async function sendWeeklyDigests(): Promise<{ sent: number; eligible: number }> {
  const admin = createAdminClient();
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const sinceDate = sinceIso.slice(0, 10);
  const snapshotWindowDate = new Date(Date.now() - (WINDOW_DAYS + 7) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, first_name, email_notifications_enabled")
    .eq("is_demo", false)
    .neq("email_notifications_enabled", false);
  if (error) throw new Error(error.message);
  if (!profiles || profiles.length === 0) return { sent: 0, eligible: 0 };

  const userIds = profiles.map((p) => p.id);

  const [{ data: followRows }, { data: viewRows }, { data: snapshotRows }] = await Promise.all([
    admin.from("follows").select("followee_id").in("followee_id", userIds).gte("created_at", sinceIso),
    admin.from("profile_views").select("viewed_user_id").in("viewed_user_id", userIds).gte("viewed_on", sinceDate),
    admin
      .from("leaderboard_snapshots")
      .select("user_id, rank, snapshot_date")
      .in("user_id", userIds)
      .eq("scope", "global")
      .eq("scope_value", "")
      .gte("snapshot_date", snapshotWindowDate)
      .order("snapshot_date", { ascending: true }),
  ]);

  const followerCounts = new Map<string, number>();
  for (const row of followRows ?? []) followerCounts.set(row.followee_id, (followerCounts.get(row.followee_id) ?? 0) + 1);

  const viewCounts = new Map<string, number>();
  for (const row of viewRows ?? []) viewCounts.set(row.viewed_user_id, (viewCounts.get(row.viewed_user_id) ?? 0) + 1);

  const snapshotsByUser = new Map<string, { date: string; rank: number }[]>();
  for (const row of snapshotRows ?? []) {
    const arr = snapshotsByUser.get(row.user_id) ?? [];
    arr.push({ date: row.snapshot_date, rank: row.rank });
    snapshotsByUser.set(row.user_id, arr);
  }

  function rankSignal(userId: string): { movement: number | null; currentRank: number | null } {
    const rows = snapshotsByUser.get(userId);
    if (!rows || rows.length === 0) return { movement: null, currentRank: null };
    const current = rows[rows.length - 1];
    let past: { date: string; rank: number } | undefined;
    for (const r of rows) {
      if (r.date <= sinceDate) past = r;
      else break;
    }
    if (!past || past.date === current.date) return { movement: null, currentRank: current.rank };
    return { movement: past.rank - current.rank, currentRank: current.rank };
  }

  const toSend = profiles
    .map((p) => {
      const { movement, currentRank } = rankSignal(p.id);
      const signal: WeeklySignal = {
        newFollowers: followerCounts.get(p.id) ?? 0,
        profileViews: viewCounts.get(p.id) ?? 0,
        rankMovement: movement,
        currentRank,
      };
      return { userId: p.id, firstName: p.first_name, signal };
    })
    .filter((r) => r.signal.newFollowers > 0 || r.signal.profileViews > 0 || (r.signal.rankMovement ?? 0) !== 0);

  if (toSend.length === 0) return { sent: 0, eligible: profiles.length };

  const emailById = await getEmailsByUserIds(new Set(toSend.map((r) => r.userId)));
  const resend = getResend();
  const appUrl = getAppUrl();
  let sent = 0;

  for (let i = 0; i < toSend.length; i += SEND_BATCH_SIZE) {
    const batch = toSend.slice(i, i + SEND_BATCH_SIZE).filter((r) => emailById.has(r.userId));
    await Promise.all(
      batch.map(async (r) => {
        try {
          await resend.emails.send({
            from: resendFromAddress(),
            to: emailById.get(r.userId)!,
            subject: "Ton récap de la semaine sur ASCEND",
            html: renderEmailHtml(buildDigestBody(r.firstName, r.signal), {
              ctaLabel: "Voir mon tableau de bord",
              ctaUrl: `${appUrl}/app/dashboard`,
            }),
          });
          sent++;
        } catch (err) {
          console.error(`Weekly digest failed for ${r.userId}:`, err);
        }
      }),
    );
  }

  return { sent, eligible: profiles.length };
}
