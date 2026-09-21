import type { Metadata } from "next";
import { CreditCard, ShoppingBag, FileCheck2, UserCheck, ShieldCheck, EyeOff, Landmark } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Comment fonctionne la vérification",
  description: "Comment ASCEND vérifie que les revenus et l'identité affichés sur un profil sont réels.",
};

const METHODS = [
  {
    icon: CreditCard,
    title: "Stripe",
    description:
      "Connecte ton compte Stripe en lecture seule : ASCEND récupère tes revenus mensuels agrégés directement depuis les paiements réellement encaissés — jamais un chiffre que tu tapes toi-même.",
  },
  {
    icon: ShoppingBag,
    title: "Shopify",
    description:
      "Même principe pour les boutiques Shopify : le chiffre d'affaires est calculé à partir des commandes réelles de ta boutique, récupérées directement via l'API de ta boutique.",
  },
  {
    icon: Landmark,
    title: "Compte bancaire",
    description:
      "Connecte ton compte bancaire via un agrégateur agréé (accès en lecture seule, tes identifiants bancaires ne sont jamais vus par ASCEND) et indique toi-même quels virements entrants sont ton revenu professionnel — le reste (virements personnels, remboursements) n'est jamais compté.",
  },
  {
    icon: FileCheck2,
    title: "Déclaration manuelle avec preuve",
    description:
      "Sans Stripe ni Shopify, tu peux déclarer un revenu à la main — mais chaque déclaration doit être accompagnée d'un justificatif (facture, export comptable, capture bancaire) et est examinée manuellement par un administrateur avant d'être comptée.",
  },
  {
    icon: UserCheck,
    title: "Numéro SIRET",
    description:
      "Le badge « Entreprise vérifiée » ne se contente pas de vérifier qu'un SIRET existe : ASCEND compare le prénom et le nom de ton profil aux dirigeants réellement déclarés de l'entreprise auprès du registre officiel français. Un SIRET qui ne t'appartient pas est automatiquement refusé.",
  },
];

export default function VerificationInfoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      <main id="main-content">
        <section className="border-b border-border">
          <Reveal as="div" className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
              <ShieldCheck className="h-6 w-6 text-gold" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
              Des revenus vérifiés, pas déclarés
            </h1>
            <p className="mt-4 text-base text-text-secondary">
              N&apos;importe qui peut écrire un chiffre sur un profil LinkedIn ou dans un post Twitter.
              Sur ASCEND, chaque badge « vérifié » correspond à une donnée réellement contrôlée — jamais
              une simple déclaration sur l&apos;honneur.
            </p>
          </Reveal>
        </section>

        <section className="border-b border-border bg-bg-secondary">
          <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
            <Reveal as="h2" className="text-center text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
              Comment on vérifie
            </Reveal>
            <RevealGroup className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2" stagger={0.1}>
              {METHODS.map((m) => (
                <RevealItem key={m.title} className="rounded-lg border border-border bg-card p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold/10">
                    <m.icon className="h-4 w-4 text-gold" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-text-primary">{m.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{m.description}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        <section className="border-b border-border">
          <Reveal as="div" className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-6">
              <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Tu contrôles ce qui est visible</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  ASCEND vérifie tes revenus en coulisses, mais tu choisis ce qui apparaît sur ton profil
                  public : montant exact, fourchette, ou entièrement privé. Le badge « vérifié » et ton
                  classement restent visibles, jamais le détail de tes transactions.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        <section>
          <Reveal as="div" className="mx-auto max-w-[1200px] px-4 py-20 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
              Prêt à prouver ce que tu as construit ?
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/signup" size="lg">
                Rejoindre ASCEND
              </Button>
              <Button href="/#classement" variant="secondary" size="lg">
                Voir le classement
              </Button>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
