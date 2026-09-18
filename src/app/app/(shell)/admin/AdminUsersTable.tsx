"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { adminSetTierAction, adminSetIsAdminAction } from "./actions";
import type { AdminUserRow } from "@/services/admin.service";
import type { SubscriptionTier } from "@/types/database.types";

const TIER_LABELS: Record<SubscriptionTier, string> = { free: "Gratuit", pro: "Pro", elite: "Elite" };

export function AdminUsersTable({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(users);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) =>
      [u.username, u.firstName, u.lastName, u.city, u.country].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  function changeTier(userId: string, tier: SubscriptionTier) {
    const previous = rows;
    setRows((r) => r.map((u) => (u.id === userId ? { ...u, tier, subscriptionStatus: "active" } : u)));
    startTransition(async () => {
      const result = await adminSetTierAction(userId, tier);
      if (!result.success) {
        setRows(previous);
        toast.show(result.error, "error");
        return;
      }
      toast.show("Formule mise à jour.", "success");
    });
  }

  function toggleAdmin(userId: string, isAdmin: boolean) {
    const previous = rows;
    setRows((r) => r.map((u) => (u.id === userId ? { ...u, isAdmin } : u)));
    startTransition(async () => {
      const result = await adminSetIsAdminAction(userId, isAdmin);
      if (!result.success) {
        setRows(previous);
        toast.show(result.error, "error");
        return;
      }
      toast.show(isAdmin ? "Promu administrateur." : "Droits administrateur retirés.", "success");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Rechercher par nom, pseudo, ville, pays..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-x-auto border-y border-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
              <th className="px-4 py-3 font-medium">Membre</th>
              <th className="px-4 py-3 font-medium">Localisation</th>
              <th className="px-4 py-3 font-medium">Vérifié</th>
              <th className="px-4 py-3 font-medium">Formule</th>
              <th className="px-4 py-3 font-medium">Admin</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-card">
                <td className="px-4 py-3">
                  <Link href={`/profile/${u.username}`} className="flex flex-col hover:underline">
                    <span className="flex items-center gap-1.5 font-medium text-text-primary">
                      {u.firstName} {u.lastName}
                      {u.isCofounder && <Badge variant="gold">Cofondateur</Badge>}
                      {u.isDemo && <Badge variant="demo">Démo</Badge>}
                    </span>
                    <span className="text-xs text-text-muted">@{u.username}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {[u.city, u.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  {u.revenueVerified ? (
                    <Badge variant="success">Vérifié</Badge>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.tier}
                    disabled={pending}
                    onChange={(e) => changeTier(u.id, e.target.value as SubscriptionTier)}
                    className="rounded-sm border border-border-strong bg-card-elevated px-2 py-1.5 text-xs text-text-primary focus:border-gold/60 focus:outline-none"
                  >
                    {Object.entries(TIER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={pending || u.id === currentUserId}
                    onClick={() => toggleAdmin(u.id, !u.isAdmin)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      u.isAdmin
                        ? "border-gold/30 bg-gold/10 text-gold"
                        : "border-border-strong text-text-muted hover:text-text-secondary",
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" /> {u.isAdmin ? "Admin" : "Standard"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
