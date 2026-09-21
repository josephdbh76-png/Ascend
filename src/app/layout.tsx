import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { PageviewTracker } from "@/components/layout/PageviewTracker";
import { getAppUrl } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION =
  "ASCEND est le réseau de performance des entrepreneurs ambitieux. Vérifie tes performances, grimpe au classement et construis ta réputation.";

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "ASCEND — Construis. Prouve. Progresse.",
    template: "%s — ASCEND",
  },
  description: DESCRIPTION,
  openGraph: {
    title: "ASCEND — Construis. Prouve. Progresse.",
    description: DESCRIPTION,
    siteName: "ASCEND",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "ASCEND — Construis. Prouve. Progresse.",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} h-full overflow-x-hidden antialiased`}>
      <body className="min-h-full flex flex-col overflow-x-hidden bg-bg-primary text-text-primary">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-gold focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-[#0a0a0a]"
        >
          Aller au contenu principal
        </a>
        <PageviewTracker />
        <ToastProvider>{children}</ToastProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
