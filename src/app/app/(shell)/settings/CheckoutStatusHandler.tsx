"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { SubscriptionSuccessModal } from "@/components/subscription/SubscriptionSuccessModal";
import type { SubscriptionTier } from "@/types/database.types";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_tier: "Formule inconnue.",
  no_subscription: "Tu n'as pas encore d'abonnement à gérer.",
};

function isSubscriptionTier(value: string | null): value is SubscriptionTier {
  return value === "free" || value === "pro" || value === "elite";
}

export function CheckoutStatusHandler() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tierParam = searchParams.get("tier");
  const trial = searchParams.get("trial") === "1";
  const showModal = searchParams.get("checkout") === "success" && isSubscriptionTier(tierParam);
  const [modalOpen, setModalOpen] = useState(showModal);

  useEffect(() => {
    const error = searchParams.get("checkout_error");
    const checkout = searchParams.get("checkout");

    if (error) {
      toast.show(ERROR_MESSAGES[error] ?? "Impossible de finaliser le paiement pour le moment.", "error");
      router.replace(pathname);
    } else if (checkout === "success" && !showModal) {
      toast.show("Abonnement activé. Bienvenue !", "success");
      router.replace(pathname);
    } else if (checkout === "cancelled") {
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeModal() {
    setModalOpen(false);
    router.replace(pathname);
  }

  return (
    <SubscriptionSuccessModal
      open={modalOpen}
      onClose={closeModal}
      tier={isSubscriptionTier(tierParam) ? tierParam : "free"}
      isTrial={trial}
    />
  );
}
