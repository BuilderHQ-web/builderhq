import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Auth shell — Resend-inspired silk composition.
 *
 * Single locked viewport, no scroll. Two soft silk highlights drape
 * the corners (top-right brighter, bottom-left subtler) over a near-
 * black field, with a faint teal tint that reads as our brand rather
 * than a generic monochrome login. A tiny "Home" affordance sits
 * top-left so users can back out without hunting for a logo click
 * target.
 *
 * Layout intentionally fixes `h-dvh overflow-hidden` so the silk
 * never crops or repeats on scroll — every auth page is composed to
 * fit a single screen. Pages with denser content (signup, settings-
 * adjacent flows) should keep their own internal layout tight enough
 * to honour that contract.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh overflow-hidden bg-[#050a10]">
      <SilkBackdrop />

      {/* Top-left back-to-home affordance. */}
      <Link
        href="/"
        aria-label="Back to home"
        className="absolute z-20 top-5 left-5 sm:top-7 sm:left-8 inline-flex items-center gap-1.5 text-[12.5px] sm:text-[13px] text-text-muted hover:text-text transition-colors font-ui"
        style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
      >
        <ChevronLeft size={14} strokeWidth={2} />
        Home
      </Link>

      <main className="relative z-10 h-full flex items-center justify-center px-5 sm:px-8">
        <div className="w-full max-w-[420px] reveal">{children}</div>
      </main>
    </div>
  );
}

/**
 * Silk backdrop — three layered gradients to imitate draped fabric.
 *
 *   1. A wide top-right conic, rotated slightly, gives the bright
 *      diagonal fold-and-highlight that defines the look.
 *   2. A subtler mirrored bottom-left conic balances the composition.
 *   3. A soft inner vignette darkens the centre just enough to keep
 *      typography readable without dulling the silk.
 *
 * Heavy blur on the conic layers turns the discrete colour stops into
 * smooth, organic shading. Tints are predominantly white with small
 * pulses of brand teal so it reads as ours, not Resend's.
 */
function SilkBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {/* Top-right silk — primary highlight. */}
      <div
        className="absolute -top-[30%] -right-[25%] w-[110vmax] h-[110vmax]"
        style={{
          background: `conic-gradient(from 210deg at 50% 50%,
            transparent 0deg,
            rgba(255,255,255,0.14) 25deg,
            rgba(255,255,255,0.05) 60deg,
            transparent 95deg,
            rgba(0,212,200,0.08) 130deg,
            transparent 170deg,
            rgba(255,255,255,0.12) 215deg,
            rgba(255,255,255,0.04) 255deg,
            transparent 300deg,
            rgba(0,212,200,0.05) 335deg,
            transparent 360deg
          )`,
          filter: "blur(70px)",
          transform: "rotate(-18deg)",
          opacity: 0.95,
        }}
      />

      {/* Bottom-left silk — mirrored, dimmer. */}
      <div
        className="absolute -bottom-[35%] -left-[30%] w-[100vmax] h-[100vmax]"
        style={{
          background: `conic-gradient(from 30deg at 50% 50%,
            transparent 0deg,
            rgba(255,255,255,0.08) 35deg,
            transparent 80deg,
            rgba(0,212,200,0.05) 120deg,
            transparent 160deg,
            rgba(255,255,255,0.06) 210deg,
            transparent 260deg
          )`,
          filter: "blur(80px)",
          transform: "rotate(14deg)",
          opacity: 0.55,
        }}
      />

      {/* Inner vignette to anchor the form against the silk. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 50% 50%, rgba(0,0,0,0.45), transparent 70%)",
        }}
      />
    </div>
  );
}
