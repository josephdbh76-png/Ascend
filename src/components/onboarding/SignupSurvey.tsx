"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { track } from "@/lib/analytics";
import {
  DISCOVERY_SOURCES,
  MAIN_GOALS,
  PAYMENT_PLATFORMS,
  REVENUE_RANGES,
  SOURCES_WITH_REFERRER,
  type SurveyOption,
} from "@/lib/signupSurvey";
import { getMemberNumberAction, saveSignupSurveyAction } from "@/app/(auth)/actions";

const QUESTION_COUNT = 4;

const GOAL_PITCH: Record<string, string> = {
  credibility: "Un profil vérifié parle pour toi. Connecte ta source de revenus à l'étape suivante pour obtenir ton badge.",
  ranking: "Le classement se remplit maintenant. Vérifie tes revenus à l'étape suivante pour y entrer avant les prochains inscrits.",
  network: "Les membres vérifiés sont ceux qu'on contacte en premier. Vérifie ton profil pour être visible dans le Réseau.",
  opportunities: "Les opportunités vont d'abord aux profils vérifiés. Vérifie tes revenus pour passer devant.",
  motivation: "Tes défis et ta progression démarrent dès que tes revenus sont vérifiés. C'est l'étape suivante.",
};

export function SignupSurvey({ onDone }: { onDone: (platforms: string[]) => void }) {
  const [q, setQ] = useState(0);
  const [source, setSource] = useState("");
  const [referrer, setReferrer] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [revenue, setRevenue] = useState("");
  const [goal, setGoal] = useState("");
  const [memberNumber, setMemberNumber] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getMemberNumberAction().then(setMemberNumber).catch(() => {});
  }, []);

  function pickSource(value: string) {
    setSource(value);
    if (!SOURCES_WITH_REFERRER.has(value)) setQ(1);
  }

  function pickGoal(value: string) {
    setGoal(value);
    startTransition(async () => {
      await saveSignupSurveyAction({
        discoverySource: source,
        referrerName: SOURCES_WITH_REFERRER.has(source) ? referrer : undefined,
        paymentPlatforms: platforms,
        monthlyRevenueRange: revenue,
        mainGoal: value,
      });
      track("signup_survey_completed");
      setQ(QUESTION_COUNT);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {q < QUESTION_COUNT && (
        <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
          <span>
            Question {q + 1}/{QUESTION_COUNT}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: QUESTION_COUNT }, (_, i) => (
              <span key={i} className={`h-1 w-5 rounded-full transition-colors ${i <= q ? "bg-gold" : "bg-border"}`} />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={q}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-4"
        >
          {q === 0 && (
            <>
              <Heading title="Comment as-tu découvert ASCEND ?" subtitle="4 questions, 20 secondes. Ça nous aide à construire ce dont tu as besoin." />
              <Choices options={DISCOVERY_SOURCES} selected={[source]} onPick={pickSource} columns />
              {SOURCES_WITH_REFERRER.has(source) && (
                <div className="flex flex-col gap-3">
                  <Input
                    autoFocus
                    value={referrer}
                    maxLength={80}
                    onChange={(e) => setReferrer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setQ(1)}
                    placeholder="Par qui ? Nom ou @ (optionnel)"
                    aria-label="Par qui as-tu découvert ASCEND ?"
                  />
                  <Button onClick={() => setQ(1)}>
                    Continuer <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {q === 1 && (
            <>
              <Heading title="Où reçois-tu tes paiements ?" subtitle="Plusieurs choix possibles." />
              <Choices
                options={PAYMENT_PLATFORMS}
                selected={platforms}
                onPick={(v) => setPlatforms((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))}
                columns
                multi
              />
              <Button onClick={() => setQ(2)} disabled={platforms.length === 0}>
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {q === 2 && (
            <>
              <Heading title="Ton chiffre d'affaires mensuel aujourd'hui ?" subtitle="Reste privé. Seuls tes revenus vérifiés apparaissent sur ton profil." />
              <Choices
                options={REVENUE_RANGES}
                selected={[revenue]}
                onPick={(v) => {
                  setRevenue(v);
                  setQ(3);
                }}
              />
            </>
          )}

          {q === 3 && (
            <>
              <Heading title="Qu'est-ce que tu viens chercher ici ?" subtitle="Ton objectif principal." />
              <Choices options={MAIN_GOALS} selected={[goal]} onPick={pickGoal} disabled={pending} />
            </>
          )}

          {q === QUESTION_COUNT && (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-gold/30 bg-gold/5 px-6 py-8 text-center">
              <motion.div
                initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15"
              >
                <Crown className="h-7 w-7 text-gold" />
              </motion.div>
              {memberNumber ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gold">Membre fondateur</p>
                  <p className="mt-1 text-4xl font-semibold tabular-nums text-text-primary">n°{memberNumber}</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Tu fais partie des premiers à rejoindre ASCEND pendant la bêta privée.
                  </p>
                </div>
              ) : (
                <p className="text-lg font-semibold text-text-primary">Bienvenue dans la bêta privée</p>
              )}
              <p className="text-sm text-text-secondary">{GOAL_PITCH[goal]}</p>
              <Button onClick={() => onDone(platforms)} className="mt-2 w-full">
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
    </div>
  );
}

function Choices({
  options,
  selected,
  onPick,
  columns = false,
  multi = false,
  disabled = false,
}: {
  options: SurveyOption[];
  selected: string[];
  onPick: (value: string) => void;
  columns?: boolean;
  multi?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={columns ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"} role={multi ? "group" : "radiogroup"}>
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            role={multi ? "checkbox" : "radio"}
            aria-checked={active}
            onClick={() => onPick(o.value)}
            className={`flex items-center justify-between gap-2 rounded-md border px-3.5 py-3 text-left text-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-60 ${
              active
                ? "border-gold bg-gold/10 text-text-primary"
                : "border-border bg-card text-text-secondary hover:border-border-strong hover:text-text-primary"
            }`}
          >
            {o.label}
            {active && <Check className="h-4 w-4 shrink-0 text-gold" />}
          </button>
        );
      })}
    </div>
  );
}
