import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/services/admin.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isCurrentUserAdmin())) redirect("/app/dashboard");

  const admin = createAdminClient();
  const [{ count: pendingReviews }, { count: pendingTrainings }] = await Promise.all([
    admin.from("revenue_declarations").select("id", { count: "exact", head: true }).eq("review_status", "pending"),
    admin.from("trainings").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Administration</h1>
        <p className="mt-1 text-sm text-text-secondary">Pilote ASCEND : chiffres, membres, saisons, récompenses et communication.</p>
      </div>
      <AdminNav badges={{ "/app/admin/membres": pendingReviews ?? 0, "/app/admin/formations": pendingTrainings ?? 0 }} />
      {children}
    </div>
  );
}
