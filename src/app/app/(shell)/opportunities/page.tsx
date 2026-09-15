import type { Metadata } from "next";
import { Compass, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasEliteAccess } from "@/services/subscription.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Opportunités" };

export default async function OpportunitiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const subscription = user ? await getSubscription(user.id) : null;
  const isElite = subscription ? hasEliteAccess(subscription.tier) : false;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Opportunités</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Associé, développeur, partenaire, growth, cofondateur.
        </p>
      </div>
      {isElite ? (
        <EmptyState
          icon={Compass}
          title="Les opportunités arrivent très bientôt."
          description="En tant que membre Elite, tu y auras un accès prioritaire dès leur lancement."
        />
      ) : (
        <EmptyState
          icon={Lock}
          title="Réservé aux membres Elite."
          description="Découvre les opportunités partagées par les fondateurs du réseau ASCEND — une fonctionnalité Elite, bientôt disponible."
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
