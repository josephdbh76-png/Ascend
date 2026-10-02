"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { BETA_COPY } from "@/lib/beta";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_title: "Titre inconnu.",
  already_owned: "Tu possèdes déjà ce titre.",
  not_available: "Ce titre n'est pas encore disponible à l'achat.",
  sold_out: "Ce titre est épuisé.",
  sale_not_started: "La vente de ce titre n'a pas encore commencé.",
  sale_ended: "La vente de ce titre est terminée. Il ne se trouve plus que sur le Marché.",
  elite_only: "Ce titre est réservé aux membres Elite en boutique. Tu peux aussi le trouver sur le Marché.",
  pro_only: "Ce titre est réservé aux membres Pro et Elite en boutique. Tu peux aussi le trouver sur le Marché.",
  price_updating: "Le prix de ce titre est en cours de mise à jour. Réessaie dans quelques minutes.",
};

export function PurchaseStatusToast() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("purchase_error");
    const purchase = searchParams.get("purchase");
    const sellerError = searchParams.get("seller_error");
    const sellerOnboarding = searchParams.get("seller_onboarding");
    const marketplaceError = searchParams.get("marketplace_error");
    const marketplacePurchase = searchParams.get("marketplace_purchase");

    // The title is granted by the Stripe webhook, usually a few seconds after
    // the redirect back here: refresh a couple of times to pick it up.
    const pickUpGrant = () => {
      setTimeout(() => router.refresh(), 2500);
      setTimeout(() => router.refresh(), 7000);
    };

    if (searchParams.get("beta") === "paiements") {
      toast.show(BETA_COPY.titles, "info");
      router.replace(pathname);
    } else if (error) {
      toast.show(ERROR_MESSAGES[error] ?? "Achat impossible pour le moment.", "error");
      router.replace(pathname);
    } else if (purchase === "success") {
      toast.show("Paiement confirmé. Ton titre apparaît dans quelques secondes.", "success");
      router.replace(pathname);
      pickUpGrant();
    } else if (purchase === "cancelled" || marketplacePurchase === "cancelled") {
      toast.show("Paiement annulé, rien n'a été débité.", "info");
      router.replace(pathname);
    } else if (sellerError) {
      toast.show(`Configuration du compte vendeur impossible : ${sellerError}`, "error");
      router.replace(pathname);
    } else if (sellerOnboarding === "done") {
      toast.show("Compte vendeur configuré.", "success");
      router.replace(pathname);
    } else if (marketplaceError) {
      toast.show(`Achat impossible : ${marketplaceError}`, "error");
      router.replace(pathname);
    } else if (marketplacePurchase === "success") {
      toast.show("Achat confirmé. Le titre arrive sur ton profil dans quelques secondes.", "success");
      router.replace(pathname);
      pickUpGrant();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
