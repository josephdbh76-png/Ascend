"use client";

import { useTransition } from "react";
import { RefreshCw, Unlink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import type { VerificationStatus } from "@/types/database.types";

export function ConnectedAccounts({
  connected,
  status,
}: {
  connected: boolean;
  status: VerificationStatus;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function sync() {
    startTransition(async () => {
      const res = await fetch("/api/stripe/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) return toast.show(body.error ?? "Sync failed.", "error");
      toast.show(`Synced ${body.monthsSynced} month(s) of revenue.`, "success");
      router.refresh();
    });
  }

  function disconnect() {
    startTransition(async () => {
      const res = await fetch("/api/stripe/disconnect", { method: "POST" });
      if (!res.ok) return toast.show("Could not disconnect.", "error");
      toast.show("Stripe disconnected.", "success");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-md border border-border-strong bg-card-elevated p-4">
        <div>
          <p className="text-sm font-medium text-text-primary">Stripe (test mode)</p>
          <div className="mt-1">
            <VerificationBadge status={status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Button variant="secondary" size="sm" onClick={sync} disabled={pending}>
                <RefreshCw className="h-3.5 w-3.5" /> Re-sync
              </Button>
              <Button variant="danger" size="sm" onClick={disconnect} disabled={pending}>
                <Unlink className="h-3.5 w-3.5" /> Disconnect
              </Button>
            </>
          ) : (
            <Button href="/api/stripe/connect" size="sm">
              <Link2 className="h-3.5 w-3.5" /> Connect
            </Button>
          )}
        </div>
      </div>

      {(["Shopify", "PayPal", "Paddle"] as const).map((name) => (
        <div key={name} className="flex items-center justify-between rounded-md border border-border bg-card p-4 opacity-60">
          <p className="text-sm font-medium text-text-secondary">{name}</p>
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Coming Soon</span>
        </div>
      ))}
    </div>
  );
}
