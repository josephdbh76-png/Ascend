import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");

  if (profile.onboardingStep !== "done") {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
