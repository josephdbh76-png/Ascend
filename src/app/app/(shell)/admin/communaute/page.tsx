import type { Metadata } from "next";
import { getCommunitySettings, listWhatsappMembers } from "@/services/community.service";
import { AdminSection } from "../AdminSection";
import { WhatsappCommunityPanel } from "../WhatsappCommunityPanel";

export const metadata: Metadata = { title: "Communauté · Administration" };

export default async function AdminCommunityPage() {
  const [community, members] = await Promise.all([getCommunitySettings(), listWhatsappMembers()]);
  return (
    <AdminSection
      title="Communauté WhatsApp Elite"
      description="Seuls les membres Elite voient le lien. Accepte sur WhatsApp les demandes dont le numéro figure ici, et retire ceux qui ne sont plus Elite."
    >
      <WhatsappCommunityPanel enabled={community.enabled} inviteUrl={community.inviteUrl} members={members} />
    </AdminSection>
  );
}
