import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "ASCEND — Build. Prove. Rise.",
    template: "%s — ASCEND",
  },
  description:
    "The performance network for ambitious entrepreneurs. Verify your business performance, climb the leaderboard and build your entrepreneurial reputation.",
  openGraph: {
    title: "ASCEND — Build. Prove. Rise.",
    description:
      "The performance network for ambitious entrepreneurs. Verify your business performance, climb the leaderboard and build your entrepreneurial reputation.",
    siteName: "ASCEND",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ASCEND — Build. Prove. Rise.",
    description:
      "The performance network for ambitious entrepreneurs. Verify your business performance, climb the leaderboard and build your entrepreneurial reputation.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
