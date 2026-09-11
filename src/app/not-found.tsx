import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-primary px-4 text-center">
      <span className="text-sm font-semibold uppercase tracking-wide text-gold">404</span>
      <h1 className="text-2xl font-semibold text-text-primary">This page doesn&apos;t exist.</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        The page you&apos;re looking for may have moved, or the founder you searched for hasn&apos;t joined ASCEND yet.
      </p>
      <Button href="/" className="mt-2">
        Back to ASCEND
      </Button>
      <Link href="/leaderboard" className="text-sm text-text-muted hover:text-text-primary">
        Or browse the leaderboard
      </Link>
    </div>
  );
}
