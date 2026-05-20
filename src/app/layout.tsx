import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import {
  Bebas_Neue,
  Space_Grotesk,
  DM_Sans,
  JetBrains_Mono,
  Instrument_Serif,
  Geist,
} from "next/font/google";
import "./globals.css";

import { SmoothScroll } from "@/components/smooth-scroll";
import { ToastProvider } from "@/components/ui/toast";
import { RouteProgress } from "@/components/app/route-progress";

// Display — Bebas Neue. Tall, condensed, dramatic. Brand-locked for hero
// titles and section headlines (rendered ALL CAPS).
const bebas = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

// UI — Space Grotesk. Geometric. Used for headings under display, button
// text, labels, mid-size copy in cards.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Body — DM Sans. Optimized for long-form readability.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

// Mono — JetBrains. Tabular figures: ABNs, prices, IDs.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

// Serif display — Instrument Serif. Premium, Resend-grade. Used for the
// marketing hero headline and any moments that benefit from a softer,
// more "editorial" tone than Bebas Neue's all-caps display.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

// Geist Sans — Vercel's open-source UI sans. Same family as Linear /
// Resend / Vercel / v0. Used alongside Instrument Serif for the new
// premium hero treatment.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://builderhq.com.au"),
  title: {
    default: "BuilderHQ — Australia's Residential Tender Platform",
    template: "%s · BuilderHQ",
  },
  description:
    "Upload your project once. Reach builders ready to tender, compare responses with clarity, and keep every document and conversation in one place.",
  applicationName: "BuilderHQ",
  authors: [{ name: "BuilderHQ" }],
  keywords: [
    "residential construction",
    "tendering",
    "Australian builders",
    "home builders",
    "construction marketplace",
    "renovation",
    "townhouse development",
    "project tendering",
  ],
  icons: {
    icon: [
      { url: "/brand/BuilderHQ_White_Text.png", type: "image/png", sizes: "500x500" },
    ],
    apple: "/brand/BuilderHQ_White_Text.png",
  },
  openGraph: {
    type: "website",
    siteName: "BuilderHQ",
    title: "BuilderHQ — Upload. Compare. Build.",
    description:
      "Stop chasing builders. Upload your project once and let suitable builders come to you.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#03090f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Extend the page behind the notch and home indicator so the body
  // background colour bleeds into the iOS safe-area chrome — no visible
  // band between the page and the status bar.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${jetbrains.variable} ${instrumentSerif.variable} ${geistSans.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans text-text">
        <SmoothScroll>
          <ToastProvider>
            <Suspense fallback={null}>
              <RouteProgress />
            </Suspense>
            {children}
          </ToastProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
