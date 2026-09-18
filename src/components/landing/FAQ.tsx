"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";

const ITEMS = [
  {
    q: "ASCEND est-il gratuit ?",
    a: "Oui. Le compte Gratuit donne accès au profil, à la vérification, au classement, aux accomplissements et aux défis, sans carte bancaire. Pro et Elite débloquent des avantages supplémentaires.",
  },
  {
    q: "Comment fonctionne la vérification des revenus ?",
    a: "Connecte Stripe et ASCEND récupère tes vraies données de transaction côté serveur — vérifié automatiquement, instantanément. Pas de Stripe ? Déclare tes revenus manuellement avec une preuve (facture, export comptable...) : un administrateur la vérifie avant qu'elle ne compte comme un revenu vérifié.",
  },
  {
    q: "Puis-je masquer mes revenus exacts ?",
    a: "Oui. Dans les Réglages, choisis d'afficher ton revenu exact, une fourchette de 10 000 €, ou de le garder entièrement privé. Ton classement peut rester visible sans exposer le montant.",
  },
  {
    q: "Mes données financières sont-elles en sécurité ?",
    a: "Tes données de revenus sont protégées par une sécurité au niveau de la base de données — toi seul peux accéder à tes connexions et chiffres bruts. Les pages publiques ne montrent que ce que tes réglages de confidentialité autorisent.",
  },
  {
    q: "Que se passe-t-il après la bêta ?",
    a: "Les fonctionnalités du compte Gratuit resteront gratuites pour toujours. Pro et Elite sont déjà disponibles dès aujourd'hui, résiliables à tout moment depuis les Réglages.",
  },
  {
    q: "Puis-je essayer Elite gratuitement ?",
    a: "Oui, si tu n'as jamais eu d'abonnement payant : 14 jours d'essai gratuit, carte bancaire requise à l'inscription. Tu peux annuler à tout moment pendant l'essai depuis les Réglages ; sinon, la facturation démarre automatiquement à la fin des 14 jours.",
  },
  {
    q: "Y a-t-il une réduction pour un engagement annuel ?",
    a: "Oui. L'abonnement annuel Pro équivaut à 2 mois offerts, et l'abonnement annuel Elite à 3 mois offerts par rapport au tarif mensuel.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="border-b border-border">
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="h2" className="text-center text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Questions fréquentes
        </Reveal>
        <Reveal as="div" delay={0.1} className="mt-10 divide-y divide-border rounded-lg border border-border">
          {ITEMS.map((item, i) => (
            <div key={item.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={open === i}
              >
                <span className="text-sm font-medium text-text-primary">{item.q}</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", open === i && "rotate-180")}
                />
              </button>
              {open === i && <p className="px-5 pb-4 text-sm text-text-secondary">{item.a}</p>}
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
