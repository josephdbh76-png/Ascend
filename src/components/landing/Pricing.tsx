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
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
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
