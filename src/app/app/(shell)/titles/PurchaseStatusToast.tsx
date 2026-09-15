"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_title: "Titre inconnu.",
  already_owned: "Tu possèdes déjà ce titre.",
  not_available: "Ce titre n'est pas encore disponible à l'achat.",
  sold_out: "Ce titre est épuisé.",
};

export function PurchaseStatusToast() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("purchase_error");
    const purchase = searchParams.get("purchase");

    if (error) {
      toast.show(ERROR_MESSAGES[error] ?? "Achat impossible pour le moment.", "error");
      router.replace(pathname);
    } else if (purchase === "success") {
      toast.show("Paiement confirmé — ton titre arrive dans quelques secondes.", "success");
      router.replace(pathname);
    } else if (purchase === "cancelled") {
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
