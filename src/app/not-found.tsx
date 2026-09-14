import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-primary px-4 text-center">
      <span className="text-sm font-semibold uppercase tracking-wide text-gold">404</span>
      <h1 className="text-2xl font-semibold text-text-primary">Cette page n&apos;existe pas.</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        La page que tu cherches a peut-être changé d&apos;adresse, ou le fondateur que tu cherches n&apos;a pas
        encore rejoint ASCEND.
      </p>
      <Button href="/" className="mt-2">
        Retour à ASCEND
      </Button>
      <Link href="/leaderboard" className="text-sm text-text-muted hover:text-text-primary">
        Ou explorer le classement
      </Link>
    </div>
  );
}
