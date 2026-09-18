"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "La connexion Shopify a échoué. Réessaie depuis les réglages.",
  invalid_shop: "Adresse de boutique Shopify invalide — elle doit ressembler à ma-boutique.myshopify.com.",
  invalid_signature: "La réponse de Shopify n'a pas pu être vérifiée. Réessaie.",
  not_configured: "La connexion Shopify n'est pas encore configurée pour cette bêta.",
  access_denied: "Tu as annulé la connexion à Shopify.",
};

export function ShopifyStatusToast() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("shopify_error");
    const connected = searchParams.get("shopify_connected");

    if (error) {
      toast.show(ERROR_MESSAGES[error] ?? "Impossible de connecter Shopify pour le moment.", "error");
      router.replace(pathname);
    } else if (connected) {
      toast.show("Shopify est connecté.", "success");
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
