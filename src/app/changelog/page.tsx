import type { Metadata } from "next";
import { Sparkles, Compass } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { CHANGELOG, ROADMAP } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Nouveautés",
  description: "Ce qui vient d'arriver sur ASCEND, et ce qui s'en vient.",
};

export default function ChangelogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      <main id="main-content">
        <section className="border-b border-border">
          <Reveal as="div" className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
              <Sparkles className="h-6 w-6 text-gold" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Nouveautés</h1>
            <p className="mt-4 text-base text-text-secondary">
              ASCEND est en bêta et évolue vite. Voici ce qui vient d&apos;arriver — et ce qui s&apos;en
              vient.
            </p>
          </Reveal>
        </section>

        <section className="border-b border-border bg-bg-secondary">
          <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
            <RevealGroup className="flex flex-col gap-px" stagger={0.05}>
              {CHANGELOG.map((entry) => (
                <RevealItem
                  key={entry.title}
                  className="flex flex-col gap-1 border-b border-border bg-bg-secondary py-5 first:pt-0 last:border-0"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gold">
                    {entry.period}
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary">{entry.title}</h3>
                  <p className="text-sm text-text-secondary">{entry.description}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
            <Reveal as="h2" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-text-primary">
              <Compass className="h-4 w-4 text-gold" /> Sur la feuille de route
            </Reveal>
            <RevealGroup className="mt-6 flex flex-col gap-4" stagger={0.05}>
              {ROADMAP.map((item) => (
                <RevealItem key={item.title} className="rounded-lg border border-dashed border-border-strong p-4">
                  <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        <section>
          <Reveal as="div" className="mx-auto max-w-[1200px] px-4 py-20 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
              Rejoins ASCEND pendant qu&apos;il grandit
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/signup" size="lg">
                Rejoindre ASCEND
              </Button>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
