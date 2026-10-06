import Link from "next/link";
import { AscendLogotype } from "@/components/brand/AscendLogo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <header className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-text-primary" aria-label="ASCEND, accueil">
          <AscendLogotype className="h-[17px]" />
        </Link>
      </header>
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
