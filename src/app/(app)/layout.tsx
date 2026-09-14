import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import { getNotifications, getUnreadCount } from "@/services/notification.service";
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

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(user.id, 8),
    getUnreadCount(user.id),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <Navbar
        username={profile.username}
        avatarUrl={profile.avatarUrl}
        firstName={profile.firstName}
        notifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt,
          readAt: n.readAt,
        }))}
        unreadCount={unreadCount}
      />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
