import { CheckCircle2, Circle, AlertTriangle, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "@/types/database.types";

const CONFIG: Record<VerificationStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  verified: { label: "Revenue Verified", icon: CheckCircle2, className: "text-success" },
  unverified: { label: "Revenue not verified", icon: Circle, className: "text-text-muted" },
  error: { label: "Verification issue", icon: AlertTriangle, className: "text-error" },
  disconnected: { label: "Source disconnected", icon: Unlink, className: "text-text-muted" },
};

export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const { label, icon: Icon, className: colorClass } = CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", colorClass, className)}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}
