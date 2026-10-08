"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { BADGE_HEIGHT, BADGE_WIDTH } from "@/lib/badge";

export interface BadgeSnippets {
  imageUrl: string;
  html: string;
  markdown: string;
  link: string;
  pngUrl: string;
}

const SNIPPETS: { key: keyof BadgeSnippets; label: string; hint: string }[] = [
  { key: "html", label: "Site web", hint: "À coller dans ton site, ta page de vente ou un bloc HTML (Webflow, WordPress, Framer…)." },
  { key: "markdown", label: "Markdown", hint: "Pour un README GitHub, Notion ou un article." },
  { key: "pngUrl", label: "Signature e-mail", hint: "Image PNG à insérer dans ta signature Gmail ou Outlook, avec un lien vers ton profil." },
  { key: "link", label: "Lien du profil", hint: "Pour ta bio TikTok, Instagram ou Linktree." },
];

export function BadgeCard({ snippets, verified }: { snippets: BadgeSnippets; verified: boolean }) {
  const [copied, setCopied] = useState<keyof BadgeSnippets | null>(null);
  const toast = useToast();

  async function copy(key: keyof BadgeSnippets) {
    try {
      await navigator.clipboard.writeText(snippets[key]);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.show("Impossible de copier. Sélectionne le texte à la main.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-text-secondary">
        {verified
          ? "Affiche tes revenus vérifiés partout où tu vends : le badge renvoie vers ton profil, où chacun peut constater que tes chiffres viennent de la source."
          : "Ton badge affiche « Membre ASCEND » tant que tes revenus ne sont pas vérifiés. Il passe en « Revenus vérifiés » dès que tu connectes une source."}{" "}
        Ta ligue n&apos;apparaît que si tu affiches le montant exact de tes revenus.
      </p>

      <div className="flex justify-center rounded-md border border-border-strong bg-bg-secondary p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={snippets.imageUrl} alt="Aperçu du badge" width={BADGE_WIDTH} height={BADGE_HEIGHT} />
      </div>

      <div className="flex flex-col gap-4">
        {SNIPPETS.map(({ key, label, hint }) => (
          <div key={key}>
            <p className="text-sm font-medium text-text-primary">{label}</p>
            <p className="mb-2 text-xs text-text-muted">{hint}</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={snippets[key]}
                onFocus={(e) => e.target.select()}
                aria-label={label}
                className="w-full min-w-0 flex-1 rounded-md border border-border-strong bg-card px-3.5 py-2.5 font-mono text-xs text-text-secondary"
              />
              <button
                type="button"
                onClick={() => copy(key)}
                aria-label={`Copier : ${label}`}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-3 py-2.5 text-xs font-medium text-gold hover:border-gold/60 hover:bg-gold/20"
              >
                {copied === key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === key ? "Copié" : "Copier"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
