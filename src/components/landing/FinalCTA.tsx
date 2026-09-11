import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(245,196,81,0.08),transparent)]" />
      <div className="mx-auto max-w-[1440px] px-4 py-24 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Your rise starts with one connection.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-text-secondary">
          Build your profile in minutes. Free during beta. No credit card required.
        </p>
        <div className="mt-8">
          <Button href="/signup" size="lg">
            Join the Beta <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
