import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import { Navbar } from "@/components/layout/Navbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <Navbar username={profile.username} avatarUrl={profile.avatarUrl} firstName={profile.firstName} />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
