import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import { MAX_TRAININGS_PER_MEMBER, isTrainingTheme } from "@/lib/trainings";
import { trainingSchema, type TrainingInput } from "@/lib/validations";
import type {
  Database,
  SubscriptionTier,
  TrainingAudience,
  TrainingFormat,
  TrainingStatus,
} from "@/types/database.types";

type TrainingDbRow = Database["public"]["Tables"]["trainings"]["Row"];

// All reads and writes use the service role: trainings are moderated, so
// every field that reaches a page is chosen here, never by RLS alone.

export interface TrainingCreator {
  userId: string | null;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  verified: boolean;
}

export interface Training {
  id: string;
  ownerId: string | null;
  title: string;
  summary: string;
  description: string;
  theme: string;
  format: TrainingFormat;
  durationLabel: string | null;
  priceCents: number;
  memberPriceCents: number | null;
  /** Only filled when the viewer is allowed to use it. */
  promoCode: string | null;
  hasPromoCode: boolean;
  /** Whether the viewer gets the member price and code. */
  offerUnlocked: boolean;
  audience: TrainingAudience;
  externalUrl: string;
  coverImageUrl: string | null;
  status: TrainingStatus;
  rejectionReason: string | null;
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
  creator: TrainingCreator;
  weekViews: number;
  weekClicks: number;
}

export interface TrainingViewer {
  userId: string | null;
  tier: SubscriptionTier | null;
  isAdmin?: boolean;
}

export const ANONYMOUS_VIEWER: TrainingViewer = { userId: null, tier: null };

const WEEK_MS = 7 * 86_400_000;

/**
 * The member price and code are a paid-plan perk: Pro and Elite for a
 * regular offer, Elite only when the creator reserved it. Free members see
 * the public price (and what they would pay with Pro or Elite).
 */
function offerUnlocked(row: TrainingDbRow, viewer: TrainingViewer): boolean {
  if (!viewer.userId) return false;
  if (viewer.isAdmin || row.owner_id === viewer.userId) return true;
  if (row.audience === "elite") return viewer.tier === "elite";
  return viewer.tier === "pro" || viewer.tier === "elite";
}

type Stats = Map<string, { views: number; clicks: number }>;

async function weekStats(): Promise<Stats> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_training_stats", { p_since: new Date(Date.now() - WEEK_MS).toISOString() });
  if (error) console.error("Training stats failed:", error.message);
  return new Map((data ?? []).map((r) => [r.training_id, { views: Number(r.views), clicks: Number(r.clicks) }]));
}

async function hydrate(rows: TrainingDbRow[], viewer: TrainingViewer, stats?: Stats): Promise<Training[]> {
  if (rows.length === 0) return [];
  const admin = createAdminClient();
  const ownerIds = [...new Set(rows.map((r) => r.owner_id).filter((id): id is string => Boolean(id)))];
  const [{ data: owners }, resolvedStats] = await Promise.all([
    ownerIds.length
      ? admin.from("profiles").select("id, username, first_name, last_name, avatar_url, revenue_verified").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; username: string; first_name: string | null; last_name: string | null; avatar_url: string | null; revenue_verified: boolean }[] }),
    stats ? Promise.resolve(stats) : weekStats(),
  ]);
  const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));

  return rows.map((row) => {
    const owner = row.owner_id ? ownerById.get(row.owner_id) : undefined;
    const unlocked = offerUnlocked(row, viewer);
    const s = resolvedStats.get(row.id);
    return {
      id: row.id,
      ownerId: row.owner_id,
      title: row.title,
      summary: row.summary,
      description: row.description,
      theme: row.theme,
      format: row.format,
      durationLabel: row.duration_label,
      priceCents: row.price_cents,
      memberPriceCents: row.member_price_cents,
      promoCode: unlocked ? row.promo_code : null,
      hasPromoCode: Boolean(row.promo_code),
      offerUnlocked: unlocked,
      audience: row.audience,
      externalUrl: row.external_url,
      coverImageUrl: row.cover_image_url,
      status: row.status,
      rejectionReason: row.rejection_reason,
      isPinned: row.is_pinned,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      creator: owner
        ? {
            userId: owner.id,
            name: [owner.first_name, owner.last_name].filter(Boolean).join(" ") || `@${owner.username}`,
            username: owner.username,
            avatarUrl: owner.avatar_url,
            verified: owner.revenue_verified,
          }
        : { userId: null, name: row.creator_name ?? "Partenaire ASCEND", username: null, avatarUrl: null, verified: false },
      weekViews: s?.views ?? 0,
      weekClicks: s?.clicks ?? 0,
    };
  });
}

function cleanSearch(term: string | undefined): string {
  // Characters with a meaning in PostgREST filter strings are dropped.
  return (term ?? "").replace(/[%,()"\\*:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export type TrainingSort = "popular" | "recent" | "price";

function sortTrainings(list: Training[], sort: TrainingSort): Training[] {
  const byDate = (a: Training, b: Training) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
  if (sort === "recent") return [...list].sort(byDate);
  if (sort === "price") return [...list].sort((a, b) => (a.memberPriceCents ?? a.priceCents) - (b.memberPriceCents ?? b.priceCents));
  return [...list].sort((a, b) => b.weekViews - a.weekViews || byDate(a, b));
}

export async function listPublishedTrainings(
  opts: { query?: string; theme?: string; sort?: TrainingSort; limit?: number },
  viewer: TrainingViewer,
): Promise<Training[]> {
  const admin = createAdminClient();
  const term = cleanSearch(opts.query);
  const theme = opts.theme && isTrainingTheme(opts.theme) ? opts.theme : null;

  let base = admin.from("trainings").select("*").eq("status", "published").limit(opts.limit ?? 60);
  if (theme) base = base.eq("theme", theme);

  let rows: TrainingDbRow[];
  if (term) {
    const pattern = `%${term}%`;
    const [{ data: byText }, { data: people }] = await Promise.all([
      base.or(`title.ilike.${pattern},summary.ilike.${pattern},description.ilike.${pattern},creator_name.ilike.${pattern}`),
      admin
        .from("profiles")
        .select("id")
        .or(`username.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
        .limit(30),
    ]);
    const peopleIds = (people ?? []).map((p) => p.id);
    let byCreator: TrainingDbRow[] = [];
    if (peopleIds.length) {
      let creatorQuery = admin.from("trainings").select("*").eq("status", "published").in("owner_id", peopleIds);
      if (theme) creatorQuery = creatorQuery.eq("theme", theme);
      byCreator = (await creatorQuery).data ?? [];
    }
    const merged = new Map([...(byText ?? []), ...byCreator].map((r) => [r.id, r]));
    rows = [...merged.values()];
  } else {
    rows = (await base.order("published_at", { ascending: false })).data ?? [];
  }

  return sortTrainings(await hydrate(rows, viewer), opts.sort ?? "popular");
}

/**
 * "À la une cette semaine": pinned first, then the most viewed of the last
 * seven days. Falls back to the newest while nothing has been viewed yet.
 */
export async function listTrendingTrainings(viewer: TrainingViewer, limit = 3): Promise<Training[]> {
  const all = await listPublishedTrainings({ sort: "popular", limit: 100 }, viewer);
  const ranked = [...all].sort(
    (a, b) => Number(b.isPinned) - Number(a.isPinned) || b.weekViews - a.weekViews || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
  return ranked.slice(0, limit);
}

/** A published training, or any status for its owner and for admins (preview). */
export async function getTrainingForViewer(id: string, viewer: TrainingViewer): Promise<Training | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const admin = createAdminClient();
  const { data: row } = await admin.from("trainings").select("*").eq("id", id).maybeSingle();
  if (!row) return null;
  const visible = row.status === "published" || viewer.isAdmin || (viewer.userId && row.owner_id === viewer.userId);
  if (!visible) return null;
  return (await hydrate([row], viewer))[0];
}

export async function listProfileTrainings(ownerId: string, viewer: TrainingViewer): Promise<Training[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("trainings")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("status", "published")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(3);
  return hydrate(data ?? [], viewer);
}

export async function listOwnerTrainings(ownerId: string): Promise<Training[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("trainings")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  return hydrate(data ?? [], { userId: ownerId, tier: null });
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function storagePrefix(bucket: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
}

type ParsedTraining = Omit<
  Database["public"]["Tables"]["trainings"]["Insert"],
  "owner_id" | "creator_name" | "status" | "published_at" | "is_pinned"
>;

function parseTraining(input: TrainingInput, allowedCoverPrefixes: string[]): { ok: true; row: ParsedTraining } | { ok: false; error: string } {
  const parsed = trainingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Vérifie les informations de la formation." };
  const v = parsed.data;
  if (!isTrainingTheme(v.theme)) return { ok: false, error: "Choisis un thème dans la liste." };
  const cover = v.coverImageUrl || null;
  if (cover && !allowedCoverPrefixes.some((prefix) => cover.startsWith(prefix))) {
    return { ok: false, error: "Ajoute l'image de couverture depuis le formulaire." };
  }
  const priceCents = Math.round(Number(v.price) * 100);
  const memberPriceCents = v.memberPrice ? Math.round(Number(v.memberPrice) * 100) : null;
  return {
    ok: true,
    row: {
      title: v.title,
      summary: v.summary,
      description: v.description,
      theme: v.theme,
      format: v.format,
      duration_label: v.durationLabel || null,
      price_cents: priceCents,
      member_price_cents: memberPriceCents,
      promo_code: v.promoCode ? v.promoCode.toUpperCase() : null,
      audience: v.eliteOnly ? "elite" : "members",
      external_url: v.externalUrl,
      cover_image_url: cover,
    },
  };
}

// Changing these sends a live training back to review: they are what
// visitors read and where they are sent.
const REVIEWED_FIELDS = ["title", "summary", "description", "external_url", "cover_image_url"] as const;

export async function saveOwnerTraining(
  ownerId: string,
  input: TrainingInput,
  id?: string,
): Promise<{ ok: true; id: string; status: TrainingStatus } | { ok: false; error: string }> {
  const parsed = parseTraining(input, [`${storagePrefix("training-covers")}${ownerId}/`]);
  if (!parsed.ok) return parsed;
  const admin = createAdminClient();

  if (id) {
    const { data: existing } = await admin.from("trainings").select("*").eq("id", id).eq("owner_id", ownerId).maybeSingle();
    if (!existing) return { ok: false, error: "Cette formation n'existe plus." };
    const contentChanged = REVIEWED_FIELDS.some((f) => (existing[f] ?? null) !== (parsed.row[f] ?? null));
    const status: TrainingStatus =
      existing.status === "rejected" || (existing.status === "published" && contentChanged) ? "pending" : existing.status;
    const { error } = await admin
      .from("trainings")
      .update({ ...parsed.row, status, rejection_reason: status === "pending" ? null : existing.rejection_reason })
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) return { ok: false, error: "Impossible d'enregistrer la formation. Réessaie." };
    return { ok: true, id, status };
  }

  const { count } = await admin
    .from("trainings")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .neq("status", "archived");
  if ((count ?? 0) >= MAX_TRAININGS_PER_MEMBER) {
    return { ok: false, error: `Tu peux proposer jusqu'à ${MAX_TRAININGS_PER_MEMBER} formations à la fois. Archives-en une pour en ajouter.` };
  }
  const { data, error } = await admin
    .from("trainings")
    .insert({ ...parsed.row, owner_id: ownerId, status: "pending" })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Impossible d'enregistrer la formation. Réessaie." };
  return { ok: true, id: data.id, status: "pending" };
}

/** Archived trainings leave the catalog; one approved before comes back without a new review. */
export async function setOwnerTrainingArchived(ownerId: string, id: string, archived: boolean) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("trainings")
    .select("status, published_at")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!existing) return { ok: false as const, error: "Cette formation n'existe plus." };
  const status: TrainingStatus = archived ? "archived" : existing.published_at ? "published" : "pending";
  const { error } = await admin.from("trainings").update({ status }).eq("id", id).eq("owner_id", ownerId);
  if (error) return { ok: false as const, error: "Impossible de mettre à jour la formation." };
  return { ok: true as const, status };
}

export async function deleteOwnerTraining(ownerId: string, id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("trainings").delete().eq("id", id).eq("owner_id", ownerId);
  return error ? { ok: false as const, error: "Impossible de supprimer la formation." } : { ok: true as const };
}

export async function uploadTrainingCover(ownerFolder: string, file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return { ok: false, error: "Format non supporté (JPG, PNG ou WebP)." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Image trop lourde (5 Mo maximum)." };
  const admin = createAdminClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${ownerFolder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage.from("training-covers").upload(path, file, { contentType: file.type });
  if (error) return { ok: false, error: "L'envoi de l'image a échoué." };
  return { ok: true, url: admin.storage.from("training-covers").getPublicUrl(path).data.publicUrl };
}

// ---------------------------------------------------------------------------
// Views and clicks
// ---------------------------------------------------------------------------

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora|whatsapp|telegram|discord|linkedin|headless/i;

/** One per visitor, training and day; the creator's own visits don't count. */
export async function recordTrainingEvent(
  training: { id: string; ownerId: string | null },
  kind: "view" | "click",
  visitor: { userId: string | null; ip: string | null; userAgent: string | null },
) {
  if (visitor.userId && visitor.userId === training.ownerId) return;
  if (!visitor.userId && (!visitor.ip || !visitor.userAgent || BOT_UA.test(visitor.userAgent))) return;
  const day = new Date().toISOString().slice(0, 10);
  const viewerKey = visitor.userId
    ? `u:${visitor.userId}`
    : `a:${createHash("sha256")
        .update(`${day}|${visitor.ip}|${visitor.userAgent}|${process.env.SUPABASE_SERVICE_ROLE_KEY}`)
        .digest("hex")
        .slice(0, 40)}`;
  const admin = createAdminClient();
  const { error } = await admin
    .from("training_events")
    .upsert({ training_id: training.id, viewer_key: viewerKey, kind, event_day: day }, {
      onConflict: "training_id,viewer_key,kind,event_day",
      ignoreDuplicates: true,
    });
  if (error) console.error("Training event failed:", error.message);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listTrainingsForAdmin(): Promise<Training[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("trainings").select("*").order("created_at", { ascending: false }).limit(300);
  return hydrate(data ?? [], { userId: null, tier: null, isAdmin: true });
}

export async function countPendingTrainings(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin.from("trainings").select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

export async function reviewTraining(id: string, approve: boolean, reason?: string) {
  const admin = createAdminClient();
  const { data: row } = await admin.from("trainings").select("owner_id, title, published_at").eq("id", id).maybeSingle();
  if (!row) throw new Error("Formation introuvable.");
  const cleanReason = reason?.trim().slice(0, 300) || null;
  if (!approve && !cleanReason) throw new Error("Indique la raison du refus : elle est envoyée au membre.");

  const { error } = await admin
    .from("trainings")
    .update(
      approve
        ? { status: "published", rejection_reason: null, published_at: row.published_at ?? new Date().toISOString() }
        : { status: "rejected", rejection_reason: cleanReason },
    )
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (row.owner_id) {
    await createNotificationForUser({
      userId: row.owner_id,
      type: "training_review_completed",
      title: approve ? "Ta formation est en ligne" : "Ta formation n'a pas été validée",
      body: approve
        ? `« ${row.title} » est visible sur ton profil et dans le catalogue des formations.`
        : `« ${row.title} » n'a pas été validée : ${cleanReason} Tu peux la corriger et la renvoyer depuis tes réglages.`,
      metadata: { training_id: id },
    });
  }
}

export async function setTrainingPinned(id: string, pinned: boolean) {
  const admin = createAdminClient();
  const { error } = await admin.from("trainings").update({ is_pinned: pinned }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminSetTrainingStatus(id: string, status: "published" | "archived") {
  const admin = createAdminClient();
  const { data: row } = await admin.from("trainings").select("published_at").eq("id", id).maybeSingle();
  if (!row) throw new Error("Formation introuvable.");
  const { error } = await admin
    .from("trainings")
    .update({ status, published_at: status === "published" ? (row.published_at ?? new Date().toISOString()) : row.published_at })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeleteTraining(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("trainings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Created by the team: published straight away, for a member (by username) or an outside partner. */
export async function adminSaveTraining(
  input: TrainingInput & { ownerUsername?: string; creatorName?: string },
  id?: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = parseTraining(input, [storagePrefix("training-covers"), storagePrefix("admin-media")]);
  if (!parsed.ok) return parsed;
  const admin = createAdminClient();

  let ownerId: string | null = null;
  const username = input.ownerUsername?.trim().replace(/^@/, "").toLowerCase();
  if (username) {
    const { data: owner } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
    if (!owner) return { ok: false, error: `Aucun membre avec le nom d'utilisateur @${username}.` };
    ownerId = owner.id;
  }
  const creatorName = input.creatorName?.trim().slice(0, 80) || null;
  if (!ownerId && !creatorName) return { ok: false, error: "Indique le membre qui propose la formation ou le nom du partenaire." };

  const row = { ...parsed.row, owner_id: ownerId, creator_name: ownerId ? null : creatorName };
  if (id) {
    const { error } = await admin.from("trainings").update(row).eq("id", id);
    return error ? { ok: false, error: error.message } : { ok: true, id };
  }
  const { data, error } = await admin
    .from("trainings")
    .insert({ ...row, status: "published", published_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Création impossible." };
  return { ok: true, id: data.id };
}
