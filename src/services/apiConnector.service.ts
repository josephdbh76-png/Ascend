import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectorMeta, type ApiConnectorId } from "@/lib/connectors";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { refreshRevenueVerifiedFlag, syncWindowStart, writeSourceMonths } from "@/services/revenue.service";
import { createNotificationForUser } from "@/services/notification.service";
import { afterRevenueSync } from "@/services/progress.service";
import { mollie, paddle, gumroad, whop, woocommerce } from "@/services/connectors/payments";
import { qonto } from "@/services/connectors/qonto";
import type { ConnectorImpl, Fields } from "@/services/connectors/shared";

// One flow for every source connected with a key the member creates in their
// own account: check the key, store it encrypted, read 6 months of sales.

const MONTHS_OF_HISTORY = 6;

const IMPLS: Record<ApiConnectorId, ConnectorImpl> = { qonto, mollie, paddle, gumroad, whop, woocommerce };

export function isApiConnector(provider: string): provider is ApiConnectorId {
  return provider in IMPLS;
}

function cleanFields(id: ApiConnectorId, raw: Record<string, unknown>): Fields {
  const meta = connectorMeta(id)!;
  const fields: Fields = {};
  for (const f of meta.fields) {
    const value = raw[f.key];
    fields[f.key] = typeof value === "string" ? value.trim().slice(0, 500) : "";
  }
  return fields;
}

async function storedFields(revenueSourceId: string): Promise<Fields | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("provider_credentials").select("client_secret").eq("revenue_source_id", revenueSourceId).maybeSingle();
  const plain = decryptSecret(data?.client_secret);
  if (!plain) return null;
  try {
    return JSON.parse(plain) as Fields;
  } catch {
    return null;
  }
}

export async function connectApiSource(userId: string, id: ApiConnectorId, raw: Record<string, unknown>) {
  const fields = cleanFields(id, raw);
  const { accountLabel } = await IMPLS[id].validate(fields);

  const admin = createAdminClient();
  const { data: source, error } = await admin
    .from("revenue_sources")
    .upsert(
      {
        user_id: userId,
        provider: id,
        status: "connected",
        is_test_mode: false,
        external_account_id: accountLabel,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )
    .select("id")
    .single();
  if (error || !source) throw new Error(error?.message ?? "Impossible d'enregistrer la connexion.");

  const { error: credentialError } = await admin
    .from("provider_credentials")
    .upsert(
      { revenue_source_id: source.id, client_id: "", client_secret: encryptSecret(JSON.stringify(fields)) },
      { onConflict: "revenue_source_id" },
    );
  if (credentialError) throw new Error(credentialError.message);

  await admin
    .from("verifications")
    .upsert({ revenue_source_id: source.id, status: "unverified", last_checked_at: new Date().toISOString() }, { onConflict: "revenue_source_id" });

  return syncApiSource(userId, id, source.id, fields);
}

export async function syncApiSource(userId: string, id: ApiConnectorId, revenueSourceId: string, fieldsOverride?: Fields) {
  const admin = createAdminClient();
  const name = connectorMeta(id)!.name;
  const now = () => new Date().toISOString();

  const { data: before } = await admin.from("verifications").select("status").eq("revenue_source_id", revenueSourceId).maybeSingle();
  const wasAlreadyVerified = before?.status === "verified";

  const fields = fieldsOverride ?? (await storedFields(revenueSourceId));
  if (!fields) {
    const message = `Impossible de lire ta connexion ${name}. Reconnecte-la depuis les réglages.`;
    await admin.from("verifications").update({ status: "error", error_message: message, last_checked_at: now() }).eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }

  const since = syncWindowStart(MONTHS_OF_HISTORY);
  try {
    const months = await IMPLS[id].fetchMonths(fields, since, { userId, revenueSourceId });
    const monthsWithRevenue = await writeSourceMonths(userId, revenueSourceId, months, since);
    const verified = monthsWithRevenue > 0;

    await admin
      .from("verifications")
      .update({
        status: verified ? "verified" : "unverified",
        verified_at: verified ? now() : null,
        last_checked_at: now(),
        error_message: verified
          ? null
          : connectorMeta(id)!.reviewsTransactions
            ? "Aucun virement compté comme revenu pour l'instant : coche-les dans Mes transactions."
            : "Aucune vente trouvée sur les 6 derniers mois.",
      })
      .eq("revenue_source_id", revenueSourceId);
    await admin.from("revenue_sources").update({ last_synced_at: now(), status: "connected" }).eq("id", revenueSourceId);
    await refreshRevenueVerifiedFlag(userId);

    if (!verified) return { success: true as const, monthsSynced: 0, isFirstVerification: false };

    await afterRevenueSync(userId);
    if (!wasAlreadyVerified) {
      await createNotificationForUser({ userId, type: "verification_completed", title: "Revenus vérifiés", body: "Ton activité est désormais vérifiée sur ASCEND." });
    }
    return { success: true as const, monthsSynced: monthsWithRevenue, isFirstVerification: !wasAlreadyVerified };
  } catch (err) {
    const message = err instanceof Error ? err.message : `Erreur ${name} inconnue.`;
    await admin.from("verifications").update({ status: "error", error_message: message, last_checked_at: now() }).eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }
}

export async function disconnectApiSource(userId: string, revenueSourceId: string) {
  const admin = createAdminClient();
  await admin.from("revenue_sources").update({ status: "disconnected" }).eq("id", revenueSourceId).eq("user_id", userId);
  await admin.from("verifications").update({ status: "disconnected", last_checked_at: new Date().toISOString() }).eq("revenue_source_id", revenueSourceId);
  await admin.from("provider_credentials").delete().eq("revenue_source_id", revenueSourceId);
}
