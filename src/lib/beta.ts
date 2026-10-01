// What members read wherever the beta closes something (kept in one place
// so every screen gives the same, honest reason).

export const BETA_COPY = {
  short: "Bêta : Elite offert",
  subscriptions:
    "Pendant la bêta, toutes les fonctionnalités Elite te sont offertes et aucun paiement ne passe par ASCEND. Les abonnements ouvriront au lancement officiel : on te préviendra avant, et rien ne sera jamais débité sans ton accord.",
  titles:
    "Pendant la bêta, aucun paiement ne passe par ASCEND : les titres payants seront en vente au lancement officiel. Les titres à débloquer, eux, se gagnent déjà.",
  marketplace:
    "Le Marché ouvrira au lancement officiel. Pendant la bêta, aucun achat ni aucune vente ne passe par ASCEND, pour que personne ne paie quoi que ce soit avant l'ouverture.",
  landing:
    "Bêta ouverte : l'accès Elite est offert à tous les inscrits. Aucun paiement, aucune carte bancaire, jusqu'au lancement officiel.",
} as const;

/** Query parameter set when a payment route is reached during the beta. */
export const BETA_PAYMENTS_PARAM = "beta";
