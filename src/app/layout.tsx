import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import {
  JetBrains_Mono,
  Instrument_Serif,
  Geist,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { ToastProvider } from "@/components/ui/toast";
import { RouteProgress } from "@/components/app/route-progress";

// Brand typography is two families end-to-end:
//   • Instrument Serif (display) — section headlines, hero, "editorial"
//     moments. Resend-tier serif voice.
//   • Geist Sans (UI + body) — Vercel's open-source UI sans, same
//     family as Linear / Resend / Vercel. Buttons, labels, copy.
//   • JetBrains Mono — tabular figures (prices, ABNs, IDs).

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://builderhq.com.au"),
  title: {
    default: "BuilderHQ · Australia's residential tendering platform",
    template: "%s · BuilderHQ",
  },
  description:
    "Upload your plans and we write out the full scope of works. Every builder prices that same scope, so you can see what sits behind each number.",
  applicationName: "BuilderHQ",
  authors: [{ name: "BuilderHQ" }],
  keywords: [
    "residential construction",
    "tendering",
    "Australian builders",
    "home builders",
    "scope of works",
    "compare builder quotes",
    "renovation",
    "townhouse development",
    "project tendering",
  ],
  openGraph: {
    type: "website",
    siteName: "BuilderHQ",
    title: "BuilderHQ · Upload. Compare. Build.",
    description:
      "One scope of works, priced by every builder, so the numbers finally compare. Free for homeowners, and no commission either side.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f4f1ea",
  // Light, and left over from before the theme flip. The CSS
  // `color-scheme: light` on :root already wins, but this meta tag was
  // still telling the browser to render form controls, scrollbars and
  // the default canvas dark.
  colorScheme: "light",
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
      className={`${instrumentSerif.variable} ${geistSans.variable} ${jetbrains.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans text-text">
        {/* Native scroll, deliberately. Lenis smooth-scroll came out in the
            landing v2 overhaul: it fought the role-morph choreography and
            JS scroll-jacking reads "techy" to the exact audience the page
            needs to reassure. */}
        <ToastProvider>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          {children}
        </ToastProvider>
        {/* Vercel Web Analytics — pageviews everywhere; custom events fire
            through src/lib/analytics.ts. */}
        <Analytics />
      </body>
    </html>
  );
}
