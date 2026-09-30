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
  "Vérifie tes revenus via Stripe, Shopify, PayPal ou ta banque et découvre ton rang parmi les entrepreneurs. Profil public, saisons, titres et réseau de fondateurs.";
const DEFAULT_TITLE = "ASCEND · Le classement des entrepreneurs aux revenus vérifiés";

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  applicationName: "ASCEND",
  title: {
    default: DEFAULT_TITLE,
    template: "%s — ASCEND",
  },
  description: DESCRIPTION,
  keywords: [
    "classement entrepreneurs",
    "revenus vérifiés",
    "MRR vérifié",
    "classement startups",
    "fondateurs SaaS",
    "e-commerce",
    "build in public",
    "réseau d'entrepreneurs",
    "Stripe",
    "Shopify",
  ],
  creator: "ASCEND",
  publisher: "ASCEND",
  category: "business",
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DESCRIPTION,
    siteName: "ASCEND",
    type: "website",
    locale: "fr_FR",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
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
