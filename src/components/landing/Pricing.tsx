import { Reveal } from "@/components/motion/Reveal";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { createClient } from "@/lib/supabase/server";
import { isTrialEligible } from "@/services/subscription.service";

export async function Pricing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const trialEligible = user ? await isTrialEligible(user.id) : true;

  return (
    <section id="tarifs" className="border-b border-border">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">Les tarifs</span>
          <h2 className="mt-5 font-display text-4xl font-medium tracking-tight text-text-primary sm:text-5xl">
            Des tarifs simples, qui grandissent avec toi.
          </h2>
        </Reveal>
        <Reveal as="div" delay={0.1}>
          <PricingPlans trialEligible={trialEligible} loggedIn={!!user} className="mt-12" />
        </Reveal>
      </div>
    </section>
  );
}
