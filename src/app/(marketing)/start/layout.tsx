import type { Metadata, Viewport } from "next";
import * as React from "react";

import { Ambient } from "@/components/landing/ambient";
import { GridOverlay } from "@/components/landing/grid-overlay";

/**
 * /start route group — conversion funnel layout for Google Ads.
 *
 * Intentionally LIGHTER than the marketing root (`/`):
 *   · No FibreCanvas (heavy WebGL — wastes LCP budget for paid traffic)
 *   · No CustomCursor (custom cursors hurt usability metrics)
 *   · No marketing nav (single CTA per page = no escape hatches)
 *   · No footer with broad links — minimal legal-only footer instead
 *
 * Keeps the brand backdrop (Ambient gradient + GridOverlay) so the
 * page still feels like BuilderHQ, just stripped of nav distractions.
 */

export const metadata: Metadata = {
  title: "Upload your project — BuilderHQ",
  description:
    "BuilderHQ is the only marketplace where verified Australian builders tender for your residential project. Free for owners. Up to three tenders per project.",
  // Don't crawl funnel sub-pages; we only want the landing indexed.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06080f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh bg-bg text-text overflow-hidden">
      <Ambient />
      <GridOverlay />
      <main className="relative z-10">{children}</main>
      <FunnelFooter />
    </div>
  );
}

function FunnelFooter() {
  return (
    <footer className="relative z-10 mt-20 px-5 md:px-10 pb-10">
      <div className="mx-auto max-w-[1320px] flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-6 text-[11px] text-text-faint">
        <span className="font-ui">
          © {new Date().getFullYear()} BuilderHQ Pty Ltd · Australia-wide
          residential tendering
        </span>
        <nav className="flex items-center gap-5">
          <a
            href="/privacy"
            className="hover:text-text transition-colors"
          >
            Privacy
          </a>
          <a
            href="/terms"
            className="hover:text-text transition-colors"
          >
            Terms
          </a>
          <a
            href="mailto:info@builderhq.com.au"
            className="hover:text-text transition-colors"
          >
            info@builderhq.com.au
          </a>
        </nav>
      </div>
    </footer>
  );
}
