import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import { getVerificationStatus } from "@/services/revenue.service";
import { Card } from "@/components/ui/Card";
import { ProfileSettingsForm } from "./ProfileSettingsForm";
import { BusinessSettingsForm } from "./BusinessSettingsForm";
import { PrivacySettingsForm } from "./PrivacySettingsForm";
import { ConnectedAccounts } from "./ConnectedAccounts";
import { DangerZone } from "./DangerZone";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  const [{ data: business }, { data: privacy }, { data: source }, verificationStatus] = await Promise.all([
    supabase.from("businesses").select("name, category, website").eq("user_id", user.id).maybeSingle(),
    supabase.from("privacy_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("revenue_sources").select("status").eq("user_id", user.id).eq("provider", "stripe").maybeSingle(),
    getVerificationStatus(user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your profile, privacy and connections.</p>
      </div>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Profile</h2>
        <ProfileSettingsForm
          initial={{
            firstName: profile.firstName ?? "",
            lastName: profile.lastName ?? "",
            bio: profile.bio ?? "",
            country: profile.country ?? "US",
          }}
        />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Business</h2>
        <BusinessSettingsForm
          initial={{
            name: business?.name ?? "",
            category: business?.category ?? "saas",
            website: business?.website ?? "",
          }}
        />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Revenue Privacy
        </h2>
        <PrivacySettingsForm
          initial={{
            revenueVisibility: privacy?.revenue_visibility ?? "private",
            showCountry: privacy?.show_country ?? true,
          }}
        />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Connected Accounts
        </h2>
        <ConnectedAccounts connected={source?.status === "connected"} status={verificationStatus} />
      </Card>

      <Card className="p-6" elevated>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Account
        </h2>
        <DangerZone />
      </Card>
    </div>
  );
}
