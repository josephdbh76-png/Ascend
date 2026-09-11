import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h1>
        <div className="prose-legal mt-6 flex flex-col gap-4 text-sm leading-relaxed text-text-secondary">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
