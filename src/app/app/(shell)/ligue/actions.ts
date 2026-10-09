"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/app/(auth)/actions";
import {
  cancelJoinRequest,
  createClan,
  getClanForInfluencer,
  joinClan,
  kickMember,
  leaveClan,
  respondJoinRequest,
  setMemberRole,
  updateClanSettings,
  type ClanSettingsInput,
  type JoinOutcome,
} from "@/services/clan.service";
import { cancelDeclaration, declareWar, respondToWar } from "@/services/clanWar.service";
import { INVITE_COOKIE, recordInvite } from "@/services/invite.service";
import { getCreatorForUser } from "@/services/creator.service";
import type { ClanRole } from "@/types/database.types";

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function refresh() {
  revalidatePath("/app/ligue", "layout");
  revalidatePath("/ligues", "layout");
  revalidatePath("/app/challenges");
}

async function run<T>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: "Connecte-toi pour continuer." };
  try {
    const data = await fn(userId);
    refresh();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Une erreur est survenue." };
  }
}

/** A partner creator's first league becomes their partner league (no verification needed). */
export async function createClanAction(input: ClanSettingsInput): Promise<ActionResult<string>> {
  return run(async (userId) => {
    const creator = await getCreatorForUser(userId);
    if (creator?.status === "active" && !(await getClanForInfluencer(creator.id))) {
      return createClan(userId, input, { skipVerification: true, influencerId: creator.id });
    }
    return createClan(userId, input);
  });
}

export async function updateClanAction(clanId: string, input: ClanSettingsInput): Promise<ActionResult<void>> {
  return run((userId) => updateClanSettings(userId, clanId, input));
}

/** Joining through someone's invite link (the cookie it left) counts for them. */
export async function joinClanAction(clanId: string): Promise<ActionResult<JoinOutcome>> {
  return run(async (userId) => {
    const invitedBy = (await cookies()).get(INVITE_COOKIE)?.value ?? null;
    let inviterId: string | null = null;
    if (invitedBy && invitedBy !== userId && /^[0-9a-f-]{36}$/i.test(invitedBy)) {
      const { data } = await createAdminClient().from("clan_members").select("user_id").eq("user_id", invitedBy).eq("clan_id", clanId).maybeSingle();
      inviterId = data?.user_id ?? null;
    }
    const outcome = await joinClan(userId, clanId, { inviterId });
    if (inviterId) await recordInvite(userId, inviterId, "join", clanId);
    return outcome;
  });
}

export async function leaveClanAction(): Promise<ActionResult<void>> {
  return run((userId) => leaveClan(userId));
}

export async function kickMemberAction(targetId: string): Promise<ActionResult<void>> {
  return run((userId) => kickMember(userId, targetId));
}

export async function setMemberRoleAction(targetId: string, role: ClanRole): Promise<ActionResult<void>> {
  return run((userId) => setMemberRole(userId, targetId, role));
}

export async function respondJoinRequestAction(clanId: string, requesterId: string, accept: boolean): Promise<ActionResult<void>> {
  return run((userId) => respondJoinRequest(userId, clanId, requesterId, accept));
}

export async function cancelJoinRequestAction(clanId: string): Promise<ActionResult<void>> {
  return run((userId) => cancelJoinRequest(userId, clanId));
}

export async function declareWarAction(targetClanId: string): Promise<ActionResult<void>> {
  return run((userId) => declareWar(userId, targetClanId));
}

export async function respondWarAction(warId: string, accept: boolean): Promise<ActionResult<void>> {
  return run((userId) => respondToWar(userId, warId, accept));
}

export async function cancelDeclarationAction(warId: string): Promise<ActionResult<void>> {
  return run((userId) => cancelDeclaration(userId, warId));
}
