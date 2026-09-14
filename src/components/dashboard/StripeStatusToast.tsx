"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "La connexion Stripe a échoué. Réessaie depuis les réglages.",
  not_configured: "La connexion Stripe n'est pas encore configurée pour cette bêta.",
  access_denied: "Tu as annulé la connexion à Stripe.",
};

export function StripeStatusToast() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("stripe_error");
    const connected = searchParams.get("stripe_connected");

    if (error) {
      toast.show(ERROR_MESSAGES[error] ?? "Impossible de connecter Stripe pour le moment.", "error");
      router.replace(pathname);
    } else if (connected) {
      toast.show("Stripe est connecté.", "success");
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
