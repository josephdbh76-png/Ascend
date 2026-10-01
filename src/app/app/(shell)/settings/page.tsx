import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import {
  getVerificationStatus,
  getShopifyVerificationStatus,
  getBankVerificationStatus,
  getPayPalVerificationStatus,
  getLemonSqueezyVerificationStatus,
  getRecentRevenueDeclarations,
} from "@/services/revenue.service";
import { getSubscription, hasProAccess, hasEliteAccess } from "@/services/subscription.service";
import { isCurrentUserAdmin } from "@/services/admin.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProfileSettingsForm } from "./ProfileSettingsForm";
import { BusinessSettingsForm } from "./BusinessSettingsForm";
import { ExtraBusinessesForm } from "./ExtraBusinessesForm";
import { TrainingsManager } from "./TrainingsManager";
import { listOwnerTrainings } from "@/services/training.service";
import { PrivacySettingsForm } from "./PrivacySettingsForm";
import { MarketingConsentToggle } from "./MarketingConsentToggle";
import { AccentThemeForm } from "./AccentThemeForm";
import { ConnectedAccounts } from "./ConnectedAccounts";
import type { ApiSourceState } from "./ApiSourceConnection";
import { API_CONNECTORS, type ApiConnectorId } from "@/lib/connectors";
import { bankConnectionAvailability } from "@/lib/enableBanking";
import { DangerZone } from "./DangerZone";
import { ExportDataButton } from "./ExportDataButton";
import { SubscriptionCard } from "./SubscriptionCard";
import { SecuritySettings } from "./SecuritySettings";
import { CheckoutStatusHandler } from "./CheckoutStatusHandler";
import { HashFocus } from "@/components/ui/HashFocus";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage({ searchParams }: PageProps<"/app/settings">) {
  const focusSource = (await searchParams).connecter;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  const [
    { data: business },
    { data: extraBusinesses },
    { data: privacy },
    { data: marketing },
    { data: source },
    { data: shopifySource },
    { data: bankSource },
    { data: paypalSource },
    { data: lemonSqueezySource },
    verificationStatus,
    shopifyStatus,
    bankStatus,
    paypalStatus,
    lemonSqueezyStatus,
    subscription,
    isAdmin,
    trainings,
    { data: apiSourceRows },
    bankAvailability,
  ] = await Promise.all([
    supabase.from("businesses").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("extra_businesses")
      .select("id, name, category, custom_category, description, website")
      .eq("user_id", user.id)
      .order("position")
      .order("created_at"),
    supabase.from("privacy_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("profiles")
      .select("marketing_consent, email_notifications_enabled, notification_email_prefs")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("revenue_sources").select("status").eq("user_id", user.id).eq("provider", "stripe").maybeSingle(),
    supabase
      .from("revenue_sources")
      .select("status, external_account_id")
      .eq("user_id", user.id)
      .eq("provider", "shopify")
      .maybeSingle(),
    supabase
      .from("revenue_sources")
      .select("id, status, external_account_id")
      .eq("user_id", user.id)
      .eq("provider", "bank")
      .maybeSingle(),
    supabase.from("revenue_sources").select("status").eq("user_id", user.id).eq("provider", "paypal").maybeSingle(),
    supabase.from("revenue_sources").select("status").eq("user_id", user.id).eq("provider", "lemonsqueezy").maybeSingle(),
    getVerificationStatus(user.id),
    getShopifyVerificationStatus(user.id),
    getBankVerificationStatus(user.id),
    getPayPalVerificationStatus(user.id),
    getLemonSqueezyVerificationStatus(user.id),
    getSubscription(user.id),
    isCurrentUserAdmin(),
    listOwnerTrainings(user.id).catch(() => []),
    supabase
      .from("revenue_sources")
      .select("id, provider, status, external_account_id")
      .eq("user_id", user.id)
      .in(
        "provider",
        API_CONNECTORS.map((c) => c.id),
      ),
    bankConnectionAvailability(),
  ]);

  const { data: apiVerifications } = apiSourceRows?.length
    ? await supabase
        .from("verifications")
        .select("revenue_source_id, status, error_message")
        .in(
          "revenue_source_id",
          apiSourceRows.map((r) => r.id),
        )
    : { data: [] };
  const apiSources = Object.fromEntries(
    API_CONNECTORS.map((c) => {
      const row = apiSourceRows?.find((r) => r.provider === c.id);
      const verification = apiVerifications?.find((v) => v.revenue_source_id === row?.id);
      const state: ApiSourceState = {
        connected: row?.status === "connected",
        status: row?.status === "connected" ? (verification?.status ?? "unverified") : "unverified",
        accountLabel: row?.external_account_id ?? null,
        errorMessage: verification?.error_message ?? null,
      };
      return [c.id, state];
    }),
  ) as Record<ApiConnectorId, ApiSourceState>;

  const declarations = await getRecentRevenueDeclarations(user.id, 12);

  const connectedAccountsCard = (
    <Card id="comptes-connectes" className="scroll-mt-6 p-6" elevated>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-muted">Comptes connectés</h2>
      {!profile.revenueVerified && (
        <p className="mb-4 text-sm text-text-secondary">
          Connecte une source de revenus pour être vérifié et apparaître au classement.
        </p>
      )}
      <div className={profile.revenueVerified ? "mt-3" : undefined}>
        <ConnectedAccounts
          connected={source?.status === "connected"}
          status={verificationStatus}
          isCofounder={profile.isCofounder}
          declarations={declarations}
          shopifyConnected={shopifySource?.status === "connected"}
          shopifyStatus={shopifyStatus}
          shopifyDomain={shopifySource?.external_account_id ?? null}
          bankConnected={bankSource?.status === "connected"}
          bankStatus={bankStatus}
          bankInstitutionName={bankSource?.external_account_id ?? null}
          bankRevenueSourceId={bankSource?.id ?? null}
          paypalConnected={paypalSource?.status === "connected"}
          paypalStatus={paypalStatus}
          lemonSqueezyConnected={lemonSqueezySource?.status === "connected"}
          lemonSqueezyStatus={lemonSqueezyStatus}
          apiSources={apiSources}
          bankAvailable={bankAvailability === "production"}
          focus={typeof focusSource === "string" ? focusSource : null}
        />
      </div>
    </Card>
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Suspense fallback={null}>
        <CheckoutStatusHandler />
      </Suspense>
      <HashFocus />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Réglages</h1>
        <p className="mt-1 text-sm text-text-secondary">Gère ton profil, ta confidentialité et tes connexions.</p>
      </div>

      {isAdmin && (
        <Card className="flex flex-col items-start gap-3 border-gold/30 bg-gold/5 p-6 sm:flex-row sm:items-center sm:justify-between" hover>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
              <ShieldCheck className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Administration</h2>
              <p className="text-xs text-text-secondary">Gère les membres et leurs abonnements.</p>
            </div>
          </div>
          <Button href="/app/admin" variant="secondary" size="sm" className="shrink-0">
            Ouvrir <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Card>
      )}

      {!profile.revenueVerified && connectedAccountsCard}

      <Card id="abonnement" className="scroll-mt-6 p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Abonnement</h2>
        <SubscriptionCard subscription={subscription} />
      </Card>

      <Card id="profil" className="scroll-mt-6 p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Profil</h2>
        <ProfileSettingsForm
          initial={{
            firstName: profile.firstName ?? "",
            lastName: profile.lastName ?? "",
            bio: profile.bio ?? "",
            country: profile.country ?? "FR",
            city: profile.city ?? "",
          }}
          initialAvatarUrl={profile.avatarUrl}
        />
      </Card>

      <Card id="personnalisation" className="scroll-mt-6 p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Personnalisation du profil
        </h2>
        <AccentThemeForm initial={profile.accentTheme} locked={!hasProAccess(subscription.tier)} />
      </Card>

      <Card id="activite" className="scroll-mt-6 p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Activité principale</h2>
        <BusinessSettingsForm
          initial={{
            name: business?.name ?? "",
            category: business?.category ?? "saas",
            customCategory: business?.custom_category ?? "",
            description: business?.description ?? "",
            website: business?.website ?? "",
            skills: profile.skills.join(", "),
            siret: business?.siret ?? "",
            legalName: business?.legal_name ?? null,
          }}
        />
      </Card>

      <Card id="activites" className="scroll-mt-6 p-6" elevated>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Autres activités</h2>
        <ExtraBusinessesForm
          initial={(extraBusinesses ?? []).map((b) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            customCategory: b.custom_category,
            description: b.description,
            website: b.website,
          }))}
        />
      </Card>

      <Card id="formations" className="scroll-mt-6 p-6" elevated>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Mes formations</h2>
        <TrainingsManager initial={trainings} canCreate={hasEliteAccess(subscription.tier)} />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Confidentialité des revenus
        </h2>
        <PrivacySettingsForm
          initial={{
            revenueVisibility: privacy?.revenue_visibility ?? "private",
            showCountry: privacy?.show_country ?? true,
          }}
        />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Emails</h2>
        <MarketingConsentToggle
          initialMarketing={marketing?.marketing_consent ?? false}
          initialTransactional={marketing?.email_notifications_enabled ?? true}
          initialPrefs={marketing?.notification_email_prefs ?? {}}
        />
      </Card>

      {profile.revenueVerified && connectedAccountsCard}

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Sécurité
        </h2>
        <SecuritySettings />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Aide</h2>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">
            Besoin de reprendre tes repères ? La visite guidée te remontre l&apos;essentiel en 45 secondes.
          </p>
          <Button href="/app/dashboard?visite=1" variant="secondary" size="sm" className="shrink-0">
            Revoir la visite guidée
          </Button>
        </div>
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Compte
        </h2>
        <div className="flex flex-col gap-4">
          <ExportDataButton />
          <DangerZone />
        </div>
      </Card>
    </div>
  );
}
