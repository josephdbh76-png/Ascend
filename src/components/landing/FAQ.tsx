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
    a: "Tu connectes ta source de revenus (Stripe) et ASCEND récupère tes vraies données de transaction côté serveur. Rien n'est vérifié tant que des données réelles n'ont pas été récupérées avec succès.",
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
    a: "Les fonctionnalités gratuites resteront gratuites. Des offres Pro et Elite payantes sont prévues, mais les membres de la bêta ne seront jamais facturés rétroactivement.",
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
