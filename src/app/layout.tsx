import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/index.css";
import "@fontsource-variable/inter/index.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";
import { Providers } from "@/components/Providers";
import { TabBar, TopBar } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SiteSchema } from "@/components/SiteSchema";

import { siteName, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Valence — free USNCO practice with every past exam question", template: "%s · Valence" },
  description:
    "Practice every past U.S. National Chemistry Olympiad question, free. Adaptive practice by topic, timed mock exams, and Part II free response graded against the official key.",
  alternates: { canonical: "/" },
  applicationName: siteName,
  openGraph: { type: "website", siteName, url: siteUrl, title: "Valence — free USNCO practice", description: "Every past USNCO question, adaptive practice, and AI-graded Part II free response." },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#151311" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <ThemeScript />
        <SiteSchema />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <TopBar />
          <main className="mx-auto w-full max-w-[1040px] px-5 md:px-7 pt-8 md:pt-12 flex-1">{children}</main>
          <Footer />
          <TabBar />
        </Providers>
      </body>
    </html>
  );
}
