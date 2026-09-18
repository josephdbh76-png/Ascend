import { Gem, Medal, Flame, Crown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { createClient } from "@/lib/supabase/server";
import { cn, formatCurrency } from "@/lib/utils";

const TITLES = [
  { id: "founding-member", icon: Gem, name: "Membre fondateur", exclusive: false, fallbackNote: "500 exemplaires" },
  { id: null, icon: Medal, name: "Top 100", exclusive: false, fallbackNote: "Classement" },
  { id: null, icon: Flame, name: "Growth Machine", exclusive: false, fallbackNote: "+30 % de croissance" },
  { id: "the-business-man", icon: Crown, name: "The Business Man", exclusive: true, fallbackNote: "1 exemplaire" },
] as const;

export async function TitlesPreview() {
  const supabase = await createClient();
  const { data: supplyRows } = await supabase
    .from("titles")
    .select("id, supply, remaining_supply")
    .in(
      "id",
      TITLES.map((t): string | null => t.id).filter((id): id is string => id != null),
    );
  const supplyById = new Map((supplyRows ?? []).map((r) => [r.id, r]));

  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">Le statut</span>
          <h2 className="mt-5 font-display text-4xl font-medium tracking-tight text-text-primary sm:text-5xl">
            Ton profil mérite un statut.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-text-secondary">
            Certains titres se débloquent en progressant. D&apos;autres sont extrêmement limités — un
            seul entrepreneur au monde pourra les porter.
          </p>
        </Reveal>

        <RevealGroup className="mt-14 grid grid-cols-2 border-t border-l border-border sm:grid-cols-4" stagger={0.08}>
          {TITLES.map((t) => {
            const supply = t.id ? supplyById.get(t.id) : null;
            const remaining = supply?.remaining_supply ?? null;
            const total = supply?.supply ?? null;
            const isScarce = total != null && remaining != null && remaining / total <= 0.2;
            const note =
              total != null && remaining != null
                ? remaining <= 0
                  ? "Épuisé"
                  : `${remaining} / ${total} restant${remaining > 1 ? "s" : ""}`
                : t.fallbackNote;

            return (
              <RevealItem
                key={t.name}
                className={cn(
                  "relative flex flex-col items-center gap-3 border-r border-b border-border p-7 text-center transition-colors duration-200",
                  t.exclusive && "bg-gold/5",
                )}
              >
                {t.exclusive && <div className="hairline-gold absolute inset-x-0 top-0" />}
                <t.icon className={cn("h-5 w-5", t.exclusive ? "text-gold" : "text-text-secondary")} />
                <span className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-text-primary">{t.name}</span>
                <span className={cn("font-mono text-[10px]", isScarce ? "font-medium text-error" : "text-text-muted")}>
                  {note}
                  {t.exclusive && remaining !== 0 && ` · ${formatCurrency(50000)}`}
                </span>
              </RevealItem>
            );
          })}
        </RevealGroup>

        <Reveal as="div" delay={0.15} className="mt-10 text-center">
          <Button href="/signup" variant="secondary">
            Découvrir les titres
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
