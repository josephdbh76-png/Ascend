import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-lg font-semibold tracking-tight text-text-primary">ASCEND</span>
            <p className="mt-2 text-sm text-text-muted">Construis. Prouve. Progresse.</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Produit</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link href="/#produit" className="hover:text-text-primary">Fonctionnalités</Link></li>
              <li><Link href="/#classement" className="hover:text-text-primary">Classement</Link></li>
              <li><Link href="/#tarifs" className="hover:text-text-primary">Tarifs</Link></li>
              <li><Link href="/verification" className="hover:text-text-primary">Comment on vérifie</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Entreprise</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link href="/#faq" className="hover:text-text-primary">FAQ</Link></li>
              <li><Link href="/signup" className="hover:text-text-primary">Rejoindre ASCEND</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Mentions légales</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link href="/legal/privacy" className="hover:text-text-primary">Confidentialité</Link></li>
              <li><Link href="/legal/terms" className="hover:text-text-primary">Conditions</Link></li>
              <li><Link href="/legal/cookies" className="hover:text-text-primary">Cookies</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ASCEND. Tous droits réservés.</span>
          <span>Bêta privée — les données affichées sur cette page sont fictives, à titre d&apos;illustration.</span>
        </div>
      </div>
    </footer>
  );
}
