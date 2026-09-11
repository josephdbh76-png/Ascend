import { ShieldAlert, PieChart, BadgeCheck } from "lucide-react";

const CARDS = [
  {
    icon: ShieldAlert,
    title: "Claims",
    description: "Anyone can claim a number. Without verification, revenue screenshots mean nothing.",
  },
  {
    icon: PieChart,
    title: "Fragmented Data",
    description: "Performance lives across Stripe, Shopify, spreadsheets, and private reports.",
  },
  {
    icon: BadgeCheck,
    title: "No Reputation Layer",
    description: "Achievements are difficult to prove, compare, and share credibly.",
  },
];

export function Problem() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Your business has numbers. Your reputation should reflect them.
          </h2>
          <p className="mt-4 text-base text-text-secondary">
            Entrepreneurs have their performance scattered across Stripe, Shopify, spreadsheets,
            analytics dashboards, private reports and social media. ASCEND brings performance and
            entrepreneurial identity together.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CARDS.map((card) => (
            <div key={card.title} className="rounded-lg border border-border bg-card p-6">
              <card.icon className="h-5 w-5 text-gold" />
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-text-primary">
                {card.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
