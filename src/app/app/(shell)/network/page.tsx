import type { Metadata } from "next";
import { Users, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasEliteAccess } from "@/services/subscription.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Réseau" };

export default async function NetworkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const subscription = user ? await getSubscription(user.id) : null;
  const isElite = subscription ? hasEliteAccess(subscription.tier) : false;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Réseau</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Les bonnes personnes accélèrent les bons projets.
        </p>
      </div>
      {isElite ? (
        <EmptyState
          icon={Users}
          title="Le réseau de fondateurs arrive très bientôt."
          description="En tant que membre Elite, tu y auras un accès prioritaire dès son lancement."
        />
      ) : (
        <EmptyState
          icon={Lock}
          title="Réservé aux membres Elite."
          description="Découvre et connecte-toi avec des entrepreneurs de ton niveau, ta catégorie et ton pays — une fonctionnalité Elite, bientôt disponible."
          action={
            <Button href="/api/stripe/checkout?tier=elite" size="sm">
              Passer Elite
            </Button>
          }
        />
      )}
    </div>
  );
}
