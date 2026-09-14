import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Opportunités" };

export default function OpportunitiesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Opportunités</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Associé, développeur, partenaire, growth, cofondateur.
        </p>
      </div>
      <EmptyState
        icon={Compass}
        title="Les opportunités arrivent bientôt."
        description="Bientôt, découvre les opportunités partagées par les fondateurs du réseau ASCEND."
      />
    </div>
  );
}
