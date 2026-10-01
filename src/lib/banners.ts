import type { SubscriptionTier } from "@/types/database.types";

/** Who sees a dashboard banner. An empty audience means every member. */
export const BANNER_AUDIENCES: { value: SubscriptionTier; label: string }[] = [
  { value: "free", label: "Gratuit" },
  { value: "pro", label: "Pro" },
  { value: "elite", label: "Elite" },
];
