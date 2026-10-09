import Link from "next/link";
import { AscendLogotype } from "@/components/brand/AscendLogo";
import { LEGAL } from "@/lib/legal";
import { CATEGORY_PAGES } from "@/lib/seo";

// The most searched activities get a direct link (internal linking for search engines).
const FOOTER_CATEGORIES = ["saas", "e-commerce", "mode", "agences", "createurs-de-contenu", "freelances"];

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <AscendLogotype className="h-[18px] text-text-primary" />
            <p className="mt-2 text-sm text-text-muted">Construis. Prouve. Progresse.</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Produit</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link href="/#produit" className="hover:text-text-primary">Fonctionnalités</Link></li>
              <li><Link href="/classement" className="hover:text-text-primary">Classement public</Link></li>
              <li><Link href="/ligues" className="hover:text-text-primary">Classement des ligues</Link></li>
              <li><Link href="/#tarifs" className="hover:text-text-primary">Tarifs</Link></li>
              <li><Link href="/verification" className="hover:text-text-primary">Comment on vérifie</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Classements</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {CATEGORY_PAGES.filter((c) => FOOTER_CATEGORIES.includes(c.slug)).map((c) => (
                <li key={c.slug}>
                  <Link href={`/classement/${c.slug}`} className="hover:text-text-primary">
                    {c.audience.charAt(0).toUpperCase() + c.audience.slice(1)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Entreprise</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link href="/#faq" className="hover:text-text-primary">FAQ</Link></li>
              <li><Link href="/changelog" className="hover:text-text-primary">Nouveautés</Link></li>
              <li><Link href="/signup" className="hover:text-text-primary">Rejoindre ASCEND</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Légal</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link href="/legal/mentions" className="hover:text-text-primary">Mentions légales</Link></li>
              <li><Link href="/legal/terms" className="hover:text-text-primary">CGU / CGV</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-text-primary">Confidentialité</Link></li>
              <li><Link href="/legal/cookies" className="hover:text-text-primary">Cookies</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ASCEND. Tous droits réservés.</span>
          <a href={`mailto:${LEGAL.contactEmail}`} className="hover:text-text-primary">
            Une question ? {LEGAL.contactEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
