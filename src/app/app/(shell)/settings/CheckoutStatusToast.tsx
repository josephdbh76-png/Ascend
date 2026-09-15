"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_tier: "Formule inconnue.",
  no_subscription: "Tu n'as pas encore d'abonnement à gérer.",
};

export function CheckoutStatusToast() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("checkout_error");
    const checkout = searchParams.get("checkout");

    if (error) {
      toast.show(ERROR_MESSAGES[error] ?? "Impossible de finaliser le paiement pour le moment.", "error");
      router.replace(pathname);
    } else if (checkout === "success") {
      toast.show("Abonnement activé. Bienvenue !", "success");
      router.replace(pathname);
    } else if (checkout === "cancelled") {
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
