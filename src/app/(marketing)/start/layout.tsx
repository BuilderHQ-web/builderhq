import type { Metadata, Viewport } from "next";
import * as React from "react";

import { Ambient } from "@/components/landing/ambient";

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
  // Draw the page under the iOS notch + dynamic island so the sticky
  // glass header can extend continuously from the very top of the
  // screen. We add `env(safe-area-inset-top)` padding inside the
  // header so the logo + CTA still sit below the notch.
  viewportFit: "cover",
};

export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // No `overflow-hidden` on the outermost element — that breaks
    // position: sticky on every descendant header. The Ambient + grid
    // are themselves `pointer-events-none fixed` so they don't need
    // a clip on the parent.
    //
    // `flex flex-col` on the inner shell + `flex-1` on <main> gives
    // every page (landing + every quiz step) a full-viewport flex
    // container to vertically centre its content in.
    <div className="relative min-h-svh bg-bg text-text">
      <Ambient />
      <FunnelGrid />
      <div className="relative z-10 min-h-svh flex flex-col">
        <main className="flex-1 flex flex-col">{children}</main>
        <FunnelFooter />
      </div>
    </div>
  );
}

/**
 * Funnel-local grid overlay. The shared marketing GridOverlay has a
 * radial mask centred at 50%/30% of the viewport — which "wanders"
 * as the user scrolls past short content (visible as a colour shift
 * on every quiz step). This version uses a much softer, edge-only
 * mask and tighter spacing so the texture stays consistent at every
 * scroll position.
 */
function FunnelGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage:
          "linear-gradient(rgba(120,200,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(120,200,255,0.035) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}
    />
  );
}

function FunnelFooter() {
  return (
    <footer className="px-5 md:px-10 pb-6 pt-4">
      <div className="mx-auto max-w-[1240px] flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-text-faint font-ui">
        <span>© {new Date().getFullYear()} BuilderHQ Pty Ltd</span>
        <nav className="flex items-center gap-4">
          <a href="/privacy" className="hover:text-text transition-colors">
            Privacy
          </a>
          <a href="/terms" className="hover:text-text transition-colors">
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
