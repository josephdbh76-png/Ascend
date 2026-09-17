import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createNotificationForUser } from "@/services/notification.service";
import { getCurrentRevenue } from "@/services/revenue.service";
import type { Opportunity, OpportunityMatch, OpportunityApplication, MyOpportunity } from "@/types";
import type {
  OpportunityType,
  CompensationType,
  OpportunityLocationType,
  OpportunityStage,
  OpportunityStatus,
  ApplicationStatus,
} from "@/types/database.types";

const OPPORTUNITY_COLUMNS =
  "id, author_id, type, title, description, category, compensation_type, location_type, city, country, skills, target_stage, status, created_at";

type OpportunityRow = {
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
};

type MiniProfile = { id: string; username: string; first_name: string | null; last_name: string | null };

async function fetchProfilesById(ids: string[]): Promise<Map<string, MiniProfile>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, first_name, last_name")
    .in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

function mapOpportunity(row: OpportunityRow, author: MiniProfile | undefined): Opportunity {
  return {
    id: row.id,
    authorId: row.author_id,
    authorUsername: author?.username ?? "",
    authorFirstName: author?.first_name ?? null,
    authorLastName: author?.last_name ?? null,
    type: row.type,
    title: row.title,
    description: row.description,
    category: row.category,
    compensationType: row.compensation_type,
    locationType: row.location_type,
    city: row.city,
    country: row.country,
    skills: row.skills,
    targetStage: row.target_stage,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapApplication(row: {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  message: string;
  status: ApplicationStatus;
  created_at: string;
}, applicant: MiniProfile | undefined): OpportunityApplication {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    applicantId: row.applicant_id,
    applicantUsername: applicant?.username ?? "",
    applicantFirstName: applicant?.first_name ?? null,
    applicantLastName: applicant?.last_name ?? null,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

type RevenueStage = Exclude<OpportunityStage, "any">;

function revenueStage(monthlyRevenueCents: number | null): RevenueStage {
  if (!monthlyRevenueCents || monthlyRevenueCents <= 0) return "pre_revenue";
  if (monthlyRevenueCents < 1000000) return "early"; // < 10k€/month
  if (monthlyRevenueCents < 10000000) return "growth"; // < 100k€/month
  return "scale";
}

interface ViewerContext {
  category: string | null;
  skills: string[];
  country: string | null;
  city: string | null;
  stage: RevenueStage;
}

/**
 * Weighted 0-100 relevance score: business category (35), shared skills
 * (30), location fit (20), revenue-stage fit (15). Purely a sort signal —
 * nothing is hidden from a viewer based on score, it just surfaces the
 * best-fit opportunities first and explains why in plain French.
 */
function scoreOpportunity(o: Opportunity, viewer: ViewerContext): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (o.category == null) {
    score += 15;
  } else if (viewer.category && o.category === viewer.category) {
    score += 35;
    reasons.push("Correspond à ton activité");
  }

  const viewerSkills = new Set(viewer.skills.map((s) => s.toLowerCase()));
  const overlap = o.skills.filter((s) => viewerSkills.has(s.toLowerCase()));
  if (o.skills.length === 0) {
    score += 10;
  } else if (overlap.length > 0) {
    score += Math.min(30, overlap.length * 15);
    reasons.push(`${overlap.length} compétence${overlap.length > 1 ? "s" : ""} en commun`);
  }

  if (o.locationType === "remote") {
    score += 20;
    reasons.push("À distance");
  } else if (
    (o.country && viewer.country && o.country === viewer.country) ||
    (o.city && viewer.city && o.city.toLowerCase() === viewer.city.toLowerCase())
  ) {
    score += 20;
    reasons.push("Proche de toi");
  }

  if (o.targetStage === "any") {
    score += 8;
  } else if (o.targetStage === viewer.stage) {
    score += 15;
    reasons.push("Adapté au stade de ton business");
  }

  return { score: Math.round(score), reasons };
}

/** The Elite-gated "Découvrir" catalog, sorted by relevance to the viewer's business, skills and location. */
export async function listDiscoverableOpportunities(viewerId: string): Promise<OpportunityMatch[]> {
  const supabase = await createClient();
  const [{ data: rows, error }, { data: business }, { data: viewerProfile }, { current }] = await Promise.all([
    supabase
      .from("opportunities")
      .select(OPPORTUNITY_COLUMNS)
      .eq("status", "open")
      .neq("author_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("businesses").select("category").eq("user_id", viewerId).maybeSingle(),
    supabase.from("profiles").select("skills, country, city").eq("id", viewerId).maybeSingle(),
    getCurrentRevenue(viewerId),
  ]);
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return [];

  const authors = await fetchProfilesById(rows.map((r) => r.author_id));
  const viewer: ViewerContext = {
    category: business?.category ?? null,
    skills: viewerProfile?.skills ?? [],
    country: viewerProfile?.country ?? null,
    city: viewerProfile?.city ?? null,
    stage: revenueStage(current?.amountCents ?? null),
  };

  return rows
    .map((row) => mapOpportunity(row, authors.get(row.author_id)))
    .map((o) => {
      const { score, reasons } = scoreOpportunity(o, viewer);
      return { ...o, matchScore: score, matchReasons: reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore || +new Date(b.createdAt) - +new Date(a.createdAt));
}

export interface DiscoverTeaser {
  count: number;
  topMatchScore: number | null;
  topMatchType: OpportunityType | null;
}

/**
 * A safe-to-show-to-anyone summary of the Découvrir catalog — real
 * numbers (never fabricated), but never the opportunities themselves, so
 * it can be used to tease non-Elite members without leaking gated data.
 */
export async function getDiscoverTeaser(viewerId: string): Promise<DiscoverTeaser> {
  const matches = await listDiscoverableOpportunities(viewerId);
  return {
    count: matches.length,
    topMatchScore: matches[0]?.matchScore ?? null,
    topMatchType: matches[0]?.type ?? null,
  };
}

export interface CreateOpportunityInput {
  type: OpportunityType;
  title: string;
  description: string;
  category?: string;
  compensationType: CompensationType;
  locationType: OpportunityLocationType;
  city?: string;
  country?: string;
  skills: string[];
  targetStage: OpportunityStage;
}

export async function createOpportunity(authorId: string, input: CreateOpportunityInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("opportunities").insert({
    author_id: authorId,
    type: input.type,
    title: input.title,
    description: input.description,
    category: input.category || null,
    compensation_type: input.compensationType,
    location_type: input.locationType,
    city: input.city || null,
    country: input.country || null,
    skills: input.skills,
    target_stage: input.targetStage,
  });
  if (error) throw new Error(error.message);
}

export async function closeOpportunity(authorId: string, opportunityId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("opportunities")
    .update({ status: "closed" })
    .eq("id", opportunityId)
    .eq("author_id", authorId);
  if (error) throw new Error(error.message);
}

/** The opportunities a member has published, each with the applications received so far. */
export async function listMyOpportunities(authorId: string): Promise<MyOpportunity[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("opportunities")
    .select(OPPORTUNITY_COLUMNS)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return [];

  const { data: appRows } = await supabase
    .from("opportunity_applications")
    .select("id, opportunity_id, applicant_id, message, status, created_at")
    .in("opportunity_id", rows.map((r) => r.id))
    .order("created_at", { ascending: false });

  const applicants = await fetchProfilesById((appRows ?? []).map((a) => a.applicant_id));
  const appsByOpportunity = new Map<string, OpportunityApplication[]>();
  for (const a of appRows ?? []) {
    const mapped = mapApplication(a, applicants.get(a.applicant_id));
    appsByOpportunity.set(a.opportunity_id, [...(appsByOpportunity.get(a.opportunity_id) ?? []), mapped]);
  }

  const authorProfile = (await fetchProfilesById([authorId])).get(authorId);

  return rows.map((row) => ({
    ...mapOpportunity(row, authorProfile),
    applications: appsByOpportunity.get(row.id) ?? [],
  }));
}

/** The applications a member has sent, each carrying the opportunity it targets. */
export async function listMyApplications(applicantId: string): Promise<(OpportunityApplication & { opportunity: Opportunity })[]> {
  const supabase = await createClient();
  const { data: appRows, error } = await supabase
    .from("opportunity_applications")
    .select("id, opportunity_id, applicant_id, message, status, created_at")
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!appRows || appRows.length === 0) return [];

  const { data: oppRows } = await supabase
    .from("opportunities")
    .select(OPPORTUNITY_COLUMNS)
    .in("id", appRows.map((a) => a.opportunity_id));

  const authors = await fetchProfilesById((oppRows ?? []).map((o) => o.author_id));
  const opportunitiesById = new Map((oppRows ?? []).map((o) => [o.id, mapOpportunity(o, authors.get(o.author_id))]));
  const applicantProfile = (await fetchProfilesById([applicantId])).get(applicantId);

  return appRows
    .filter((a) => opportunitiesById.has(a.opportunity_id))
    .map((a) => ({
      ...mapApplication(a, applicantProfile),
      opportunity: opportunitiesById.get(a.opportunity_id)!,
    }));
}

export async function applyToOpportunity(applicantId: string, opportunityId: string, message: string) {
  const supabase = await createClient();
  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("id, author_id, title, status")
    .eq("id", opportunityId)
    .maybeSingle();
  if (!opportunity || opportunity.status !== "open") throw new Error("Cette opportunité n'est plus disponible.");
  if (opportunity.author_id === applicantId) throw new Error("Tu ne peux pas postuler à ta propre opportunité.");

  const { error } = await supabase
    .from("opportunity_applications")
    .insert({ opportunity_id: opportunityId, applicant_id: applicantId, message });
  if (error) {
    if (error.code === "23505") throw new Error("Tu as déjà postulé à cette opportunité.");
    throw new Error(error.message);
  }

  const { data: applicant } = await supabase
    .from("profiles")
    .select("username, first_name")
    .eq("id", applicantId)
    .maybeSingle();
  await createNotificationForUser({
    userId: opportunity.author_id,
    type: "new_application",
    title: "Nouvelle candidature",
    body: `${applicant?.first_name ?? applicant?.username ?? "Quelqu'un"} a postulé à « ${opportunity.title} ».`,
    metadata: { opportunity_id: opportunityId },
  });
}

export async function updateApplicationStatus(
  authorId: string,
  applicationId: string,
  status: Extract<ApplicationStatus, "viewed" | "accepted" | "declined">,
) {
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("opportunity_applications")
    .select("id, applicant_id, opportunity_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) throw new Error("Candidature introuvable.");

  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("author_id, title")
    .eq("id", application.opportunity_id)
    .maybeSingle();
  if (!opportunity || opportunity.author_id !== authorId) throw new Error("Candidature introuvable.");

  const { error } = await supabase.from("opportunity_applications").update({ status }).eq("id", applicationId);
  if (error) throw new Error(error.message);

  if (status === "accepted" || status === "declined") {
    await createNotificationForUser({
      userId: application.applicant_id,
      type: "application_status_changed",
      title: status === "accepted" ? "Candidature acceptée" : "Candidature refusée",
      body:
        status === "accepted"
          ? `Ta candidature à « ${opportunity.title} » a été acceptée.`
          : `Ta candidature à « ${opportunity.title} » n'a pas été retenue.`,
      metadata: { opportunity_id: application.opportunity_id },
    });
  }
}
