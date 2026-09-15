import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin, listUsersForAdmin } from "@/services/admin.service";
import { createClient } from "@/lib/supabase/server";
import { AdminUsersTable } from "./AdminUsersTable";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin())) redirect("/app/dashboard");

  const users = await listUsersForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Administration</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Gère les formules d&apos;abonnement et les droits d&apos;administration de tous les membres.
        </p>
      </div>
      <AdminUsersTable users={users} currentUserId={user.id} />
    </div>
  );
}
