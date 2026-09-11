import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");
  if (profile.onboardingStep === "done") redirect("/dashboard");

  const { data: business } = await supabase
    .from("businesses")
    .select("name, category")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md">
        <OnboardingWizard
          startStep={profile.onboardingStep}
          initial={{
            firstName: profile.firstName ?? "",
            lastName: profile.lastName ?? "",
            country: profile.country ?? "",
            category: business?.category ?? "",
            businessName: business?.name ?? "",
            bio: profile.bio ?? "",
          }}
        />
      </div>
    </div>
  );
}
