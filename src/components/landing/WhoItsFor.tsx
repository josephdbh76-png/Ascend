const AUDIENCE = [
  { title: "SaaS founders", description: "Verify MRR and compare growth against peers in your category." },
  { title: "E-commerce operators", description: "Turn Stripe revenue into a credible, verified track record." },
  { title: "Solo consultants & agencies", description: "Build a reputation that outlasts any single client relationship." },
  { title: "Ambitious builders", description: "You already track your numbers obsessively. Now show them." },
];

export function WhoItsFor() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Who ASCEND is for
        </h2>
        <div className="mt-10 grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {AUDIENCE.map((a) => (
            <div key={a.title} className="px-2 py-6 sm:px-8">
              <h3 className="text-base font-semibold text-text-primary">{a.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{a.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
