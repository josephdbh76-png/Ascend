import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <header className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-lg font-medium tracking-tight text-text-primary">
          ASCEND
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
