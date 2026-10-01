import "server-only";
import { league as leagueDef } from "@/lib/leagues";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { activityLabel } from "@/lib/business";
import { seasonShortName, type ShareKind } from "@/lib/share/params";

export type CardRarity = "common" | "rare" | "epic" | "legendary" | "exclusive";

export interface ShareCardMember {
  name: string;
  username: string;
  avatarUrl: string | null;
  initials: string;
  verified: boolean;
  foundingNumber: number | null;
  activeTitle: string | null;
  business: string | null;
  globalRank: number | null;
}

export interface ShareCardData {
  kind: ShareKind;
  eyebrow: string;
  headline: string;
  description: string | null;
  icon: string;
  rarity: CardRarity;
  rarityLabel: string | null;
  /** Rank-type cards lead with a number instead of an icon. */
  bigStat: string | null;
  statCaption: string | null;
  dateLabel: string | null;
  /** Honest scarcity line, e.g. "Obtenu par 4 % des membres". */
  footnote: string | null;
  member: ShareCardMember;
}

const RARITY_LABELS: Record<CardRarity, string> = {
  common: "Commun",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
  exclusive: "Exclusif",
};

function monthLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const text = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(
    new Date(iso),
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Catalog texts speak to the member ("Tu as atteint..."); a card is read by
 * other people, so it is turned into the third person.
 */
export function toThirdPerson(text: string | null): string | null {
  if (!text) return null;
  const out = text
    .replace(/^Tu es (\p{L})/u, (_, c: string) => c.toUpperCase())
    .replace(/^Tu as /, "A ")
    .replace(/^Tu /, "")
    .replace(/\bta\b/g, "sa")
    .replace(/\bton\b/g, "son")
    .replace(/\btes\b/g, "ses")
    .replace(/\bt'/g, "s'");
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Share of real (non-demo) members holding the item, only when it is actually rare. */
async function scarcityLine(kind: "achievement" | "title", id: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const holdersQuery =
      kind === "achievement"
        ? admin
            .from("user_achievements")
            .select("user_id, profiles!inner(is_demo)", { count: "exact", head: true })
            .eq("achievement_id", id)
            .eq("profiles.is_demo", false)
        : admin
            .from("user_titles")
            .select("user_id, profiles!inner(is_demo)", { count: "exact", head: true })
            .eq("title_id", id)
            .eq("profiles.is_demo", false);
    const [{ count: holders }, { count: members }] = await Promise.all([
      holdersQuery,
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_demo", false),
    ]);
    if (!holders || !members || members < 20) return null;
    const rate = (holders / members) * 100;
    if (rate >= 40) return null;
    if (holders <= 10) return `Seulement ${holders} membre${holders > 1 ? "s" : ""} l'${holders > 1 ? "ont" : "a"} obtenu`;
    const shown = rate < 1 ? "moins de 1" : rate.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
    return `Obtenu par ${shown} % des membres`;
  } catch {
    return null;
  }
}

function seasonHeadline(rank: number): string {
  if (rank === 1) return "Champion de la saison";
  if (rank <= 3) return "Sur le podium de la saison";
  if (rank <= 10) return "Top 10 de la saison";
  return `Classé #${rank} de la saison`;
}

// Catalog ids are slugs ("top-10"), seasons use uuids.
const ITEM_ID = /^[A-Za-z0-9_-]{1,80}$/;

/**
 * Everything on a card comes from what a logged-out visitor could already
 * read on the member's public profile, and the member must actually own
 * what is being shared.
 */
export async function loadShareCard(kind: ShareKind, username: string, id: string | null): Promise<ShareCardData | null> {
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return null;
  if (kind !== "rank" && (!id || !ITEM_ID.test(id))) return null;

  const supabase = createPublicClient();
  const { data: rows } = await supabase.rpc("get_public_profile", { p_username: username });
  const profile = rows?.[0];
  if (!profile) return null;
  const userId = profile.user_id;

  const [{ data: business }, { data: activeTitleRow }, { data: rankRows }] = await Promise.all([
    supabase.from("businesses").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_titles").select("title_id").eq("user_id", userId).eq("is_active", true).maybeSingle(),
    kind === "rank" && profile.global_rank
      ? supabase.rpc("get_user_rank", { p_user_id: userId })
      : Promise.resolve({ data: null }),
  ]);
  const { data: activeTitle } = activeTitleRow
    ? await supabase.from("titles").select("name").eq("id", activeTitleRow.title_id).maybeSingle()
    : { data: null };

  const first = profile.first_name?.trim() ?? "";
  const last = profile.last_name?.trim() ?? "";
  const member: ShareCardMember = {
    name: [first, last].filter(Boolean).join(" ") || `@${profile.username}`,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    initials: `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || profile.username.charAt(0).toUpperCase(),
    verified: profile.revenue_verified,
    foundingNumber: profile.founding_member_number,
    activeTitle: activeTitle?.name ?? null,
    business: business ? `${business.name} · ${activityLabel(business.category, business.custom_category)}` : null,
    globalRank: profile.global_rank,
  };

  if (kind === "achievement") {
    const [{ data: owned }, { data: def }, footnote] = await Promise.all([
      supabase.from("user_achievements").select("earned_at").eq("user_id", userId).eq("achievement_id", id!).maybeSingle(),
      supabase.from("achievements").select("name, description, icon, rarity").eq("id", id!).maybeSingle(),
      scarcityLine("achievement", id!),
    ]);
    if (!owned || !def) return null;
    return {
      kind,
      eyebrow: "Accomplissement débloqué",
      headline: def.name,
      description: toThirdPerson(def.description),
      icon: def.icon || "award",
      rarity: def.rarity,
      rarityLabel: RARITY_LABELS[def.rarity],
      bigStat: null,
      statCaption: null,
      dateLabel: monthLabel(owned.earned_at),
      footnote,
      member,
    };
  }

  if (kind === "title") {
    const [{ data: owned }, { data: def }, footnote] = await Promise.all([
      supabase.from("user_titles").select("acquired_at").eq("user_id", userId).eq("title_id", id!).maybeSingle(),
      supabase.from("titles").select("name, description, icon, rarity").eq("id", id!).maybeSingle(),
      scarcityLine("title", id!),
    ]);
    if (!owned || !def) return null;
    return {
      kind,
      eyebrow: "Titre obtenu",
      headline: def.name,
      description: toThirdPerson(def.description),
      icon: def.icon || "gem",
      rarity: def.rarity,
      rarityLabel: RARITY_LABELS[def.rarity],
      bigStat: null,
      statCaption: null,
      dateLabel: monthLabel(owned.acquired_at),
      footnote,
      member,
    };
  }

  if (kind === "trophy") {
    const [{ data: owned }, { data: def }] = await Promise.all([
      supabase.from("user_trophies").select("earned_at").eq("user_id", userId).eq("trophy_id", id!).maybeSingle(),
      supabase.from("trophies").select("name, description, icon").eq("id", id!).maybeSingle(),
    ]);
    if (!owned || !def) return null;
    return {
      kind,
      eyebrow: "Trophée remporté",
      headline: def.name,
      description: toThirdPerson(def.description),
      icon: def.icon || "trophy",
      rarity: "legendary",
      rarityLabel: null,
      bigStat: null,
      statCaption: null,
      dateLabel: monthLabel(owned.earned_at),
      footnote: null,
      member,
    };
  }

  if (kind === "season") {
    const { data: season } = await supabase
      .from("seasons")
      .select("id, number, name, label, ends_at, rewards_distributed_at")
      .eq("id", id!)
      .maybeSingle();
    if (!season) return null;

    let standing: { rank: number; points: number; total: number | null; league: string | null } | null = null;
    if (season.rewards_distributed_at) {
      const { data: result } = await supabase
        .from("season_results")
        .select("rank, points, league")
        .eq("season_id", season.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (result) standing = { rank: result.rank, points: result.points, total: null, league: result.league };
    } else {
      const { data: live } = await supabase.rpc("get_user_season_standing", { p_season_id: season.id, p_user_id: userId });
      const row = live?.[0];
      if (row && row.rank)
        standing = { rank: Number(row.rank), points: Number(row.points), total: Number(row.total) || null, league: row.league ?? null };
    }
    if (!standing) return null;

    const final = Boolean(season.rewards_distributed_at);
    const seasonName = seasonShortName(season.number);
    return {
      kind,
      eyebrow: `${seasonName}${standing.league ? ` · Ligue ${leagueDef(standing.league).name}` : ""} · ${final ? "Classement final" : "En cours"}`,
      headline: seasonHeadline(standing.rank),
      description: season.label,
      icon: standing.rank <= 3 ? "crown" : "flag",
      rarity: standing.rank <= 3 ? "legendary" : standing.rank <= 10 ? "epic" : "rare",
      rarityLabel: null,
      bigStat: `#${standing.rank}`,
      statCaption: `${standing.points} point${standing.points > 1 ? "s" : ""}${standing.total ? ` · ${standing.total} dans la ligue` : ""}`,
      dateLabel: final ? monthLabel(season.ends_at) : null,
      footnote: null,
      member,
    };
  }

  // kind === "rank": the member's standing on the main leaderboard.
  const rank = profile.global_rank;
  const total = rankRows?.[0]?.total ? Number(rankRows[0].total) : null;
  if (!rank) {
    return {
      kind,
      eyebrow: "Membre ASCEND",
      headline: profile.revenue_verified ? "Revenus vérifiés" : "Construis. Prouve. Progresse.",
      description: member.business,
      icon: profile.revenue_verified ? "badge-check" : "rocket",
      rarity: "legendary",
      rarityLabel: null,
      bigStat: null,
      statCaption: null,
      dateLabel: null,
      footnote: null,
      member,
    };
  }
  return {
    kind,
    eyebrow: "Classement ASCEND",
    headline: rank <= 10 ? "Top 10 des entrepreneurs vérifiés" : rank <= 100 ? "Top 100 des entrepreneurs vérifiés" : "Au classement des entrepreneurs vérifiés",
    description: member.business,
    icon: rank <= 3 ? "crown" : "trending-up",
    rarity: rank <= 10 ? "legendary" : rank <= 100 ? "epic" : "rare",
    rarityLabel: null,
    bigStat: `#${rank}`,
    // "#1 sur 3" is not something anyone wants to post: the total only shows once it means something.
    statCaption: total && total >= 20 ? `sur ${total.toLocaleString("fr-FR")} entrepreneurs classés` : "au classement mondial",
    dateLabel: monthLabel(new Date().toISOString()),
    footnote: null,
    member,
  };
}
