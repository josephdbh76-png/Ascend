import { Users, Compass, Gauge } from "lucide-react";

const ITEMS = [
  {
    icon: Users,
    title: "Founder Network",
    description: "Discover and connect with founders at your level, category and stage.",
  },
  {
    icon: Compass,
    title: "Opportunities",
    description: "Surface partnerships, hiring and collaboration opportunities from the network.",
  },
  {
    icon: Gauge,
    title: "ASCEND Score",
    description: "A single reputation score combining verified performance, growth and consistency.",
  },
];

export function ComingSoonStrip() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            What&apos;s next for ASCEND
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            The foundation is built for what&apos;s coming. Not implemented yet — but architected for it.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ITEMS.map((item) => (
            <div key={item.title} className="rounded-lg border border-dashed border-border-strong p-6">
              <item.icon className="h-5 w-5 text-text-muted" />
              <h3 className="mt-4 text-sm font-semibold text-text-primary">{item.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
              <span className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
