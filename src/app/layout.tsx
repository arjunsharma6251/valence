import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { default: "Valence", template: "%s · Valence" },
  description: "Free, adaptive USNCO practice with real explanations and AI-graded free response.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <Nav />
          <main className="mx-auto w-full max-w-[640px] px-4 pt-6 pb-8 flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
