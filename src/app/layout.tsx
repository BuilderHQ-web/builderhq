import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// UI workhorse — Inter Variable. ss01/ss02 alts enabled in globals.css.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Display — Space Grotesk. Geometric, characterful, suits a construction-tech brand.
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

// Mono — JetBrains. Used for tabular figures, ABNs, prices, IDs.
const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://builderhq.com.au"),
  title: {
    default: "BuilderHQ — Upload once. Tender smarter. Build better.",
    template: "%s · BuilderHQ",
  },
  description:
    "Australia's residential construction tendering marketplace. Project owners upload once. Suitable builders unlock projects, communicate, and submit tenders.",
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
  openGraph: {
    type: "website",
    siteName: "BuilderHQ",
    title: "BuilderHQ — Upload once. Tender smarter. Build better.",
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${display.variable} ${mono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans text-text">{children}</body>
    </html>
  );
}
