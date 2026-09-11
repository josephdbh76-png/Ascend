import { ShieldCheck, Trophy, Flag, Award, User, Users } from "lucide-react";

const FEATURES = [
  { icon: ShieldCheck, title: "Verified Performance", description: "Revenue verified directly from connected sources — not screenshots." },
  { icon: Trophy, title: "Leaderboards", description: "Global, country and category rankings updated from real data." },
  { icon: Flag, title: "Challenges", description: "Seasonal challenges that reward consistency and growth." },
  { icon: Award, title: "Achievements", description: "Collectible milestones that track your journey." },
  { icon: User, title: "Founder Profiles", description: "A shareable, premium identity for your business." },
  { icon: Users, title: "Founder Network", description: "Coming soon — connect with founders at your level." },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            One ecosystem for entrepreneurial performance
          </h2>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-border-strong">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold/10">
                <f.icon className="h-4 w-4 text-gold" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-text-primary">{f.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
