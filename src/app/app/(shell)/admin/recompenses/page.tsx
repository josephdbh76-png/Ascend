import type { Metadata } from "next";
import { getAdminCatalog } from "@/services/catalog.service";
import { RewardsCatalog } from "./RewardsCatalog";

export const metadata: Metadata = { title: "Récompenses · Administration" };

export default async function AdminRewardsPage() {
  const catalog = await getAdminCatalog();
  return <RewardsCatalog {...catalog} />;
}
