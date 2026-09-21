import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import {
  getVerificationStatus,
  getShopifyVerificationStatus,
  getBankVerificationStatus,
  getRevenueDeclarations,
} from "@/services/revenue.service";
import { getSubscription, hasProAccess } from "@/services/subscription.service";
import { isCurrentUserAdmin } from "@/services/admin.service";
import { getReferralStats, referralLink } from "@/services/referral.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProfileSettingsForm } from "./ProfileSettingsForm";
import { BusinessSettingsForm } from "./BusinessSettingsForm";
import { PrivacySettingsForm } from "./PrivacySettingsForm";
import { MarketingConsentToggle } from "./MarketingConsentToggle";
import { AccentThemeForm } from "./AccentThemeForm";
import { ConnectedAccounts } from "./ConnectedAccounts";
import { DangerZone } from "./DangerZone";
import { ExportDataButton } from "./ExportDataButton";
import { SubscriptionCard } from "./SubscriptionCard";
import { ReferralCard } from "./ReferralCard";
import { SecuritySettings } from "./SecuritySettings";
import { CheckoutStatusHandler } from "./CheckoutStatusHandler";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  const [
    { data: business },
    { data: privacy },
    { data: marketing },
    { data: source },
    { data: shopifySource },
    { data: bankSource },
    verificationStatus,
    shopifyStatus,
    bankStatus,
    subscription,
    isAdmin,
    referralStats,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("name, category, website, siret, legal_name")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("privacy_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("marketing_consent, email_notifications_enabled").eq("id", user.id).maybeSingle(),
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
    getVerificationStatus(user.id),
    getShopifyVerificationStatus(user.id),
    getBankVerificationStatus(user.id),
    getSubscription(user.id),
    isCurrentUserAdmin(),
    getReferralStats(user.id),
  ]);

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const declarations = await getRevenueDeclarations(user.id, currentPeriod);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Suspense fallback={null}>
        <CheckoutStatusHandler />
      </Suspense>

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

      <Card id="abonnement" className="scroll-mt-6 p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Abonnement</h2>
        <SubscriptionCard subscription={subscription} />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Parrainage</h2>
        <ReferralCard
          link={referralLink(profile.username)}
          referredCount={referralStats.referredCount}
          rewardedCount={referralStats.rewardedCount}
          proCreditUntil={referralStats.proCreditUntil}
        />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Profil</h2>
        <ProfileSettingsForm
          initial={{
            firstName: profile.firstName ?? "",
            lastName: profile.lastName ?? "",
            bio: profile.bio ?? "",
            country: profile.country ?? "FR",
            city: profile.city ?? "",
          }}
        />
      </Card>

      <Card id="personnalisation" className="scroll-mt-6 p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Personnalisation du profil
        </h2>
        <AccentThemeForm initial={profile.accentTheme} locked={!hasProAccess(subscription.tier)} />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Activité</h2>
        <BusinessSettingsForm
          initial={{
            name: business?.name ?? "",
            category: business?.category ?? "saas",
            website: business?.website ?? "",
            skills: profile.skills.join(", "),
            siret: business?.siret ?? "",
            legalName: business?.legal_name ?? null,
          }}
        />
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
        />
      </Card>

      <Card id="comptes-connectes" className="scroll-mt-6 p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Comptes connectés
        </h2>
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
        />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Sécurité
        </h2>
        <SecuritySettings />
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
