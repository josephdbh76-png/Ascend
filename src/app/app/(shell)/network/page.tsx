import type { Metadata } from "next";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Réseau" };

export default function NetworkPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Réseau</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Les bonnes personnes accélèrent les bons projets.
        </p>
      </div>
      <EmptyState
        icon={Users}
        title="Le réseau de fondateurs arrive bientôt."
        description="Bientôt, découvre et connecte-toi avec des entrepreneurs de ton niveau, ta catégorie et ton pays."
      />
    </div>
  );
}
