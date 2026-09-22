import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";
import { Providers } from "@/components/Providers";
import { TabBar, TopBar } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", axes: ["opsz"], display: "swap" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Valence", template: "%s · Valence" },
  description: "Free, adaptive USNCO practice with real explanations and AI-graded free response.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`h-full ${display.variable} ${sans.variable}`}>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <TopBar />
          <main className="mx-auto w-full max-w-[1040px] px-4 md:px-6 pt-5 md:pt-8 flex-1">{children}</main>
          <Footer />
          <TabBar />
        </Providers>
      </body>
    </html>
  );
}
