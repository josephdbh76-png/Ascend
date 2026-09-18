import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
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

// Display serif for headlines — the editorial voice that sets ASCEND apart
// from the generic sans-only SaaS look. Body copy stays on Inter.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// Mono used sparingly — eyebrows, data labels, tabular figures — for the
// "precision instrument" contrast against the serif headlines.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
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
    <html
      lang="fr"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-bg-primary text-text-primary">
        <div aria-hidden className="grain-overlay" />
        <PageviewTracker />
        <ToastProvider>{children}</ToastProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
