import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
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
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
