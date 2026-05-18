import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Auth shell — single-viewport silk composition.
 *
 * Two large silk drapes anchor the corners of the screen — a primary
 * bright drape from the top-right and a quieter mirrored one from the
 * bottom-left — over a near-black field with a centred vignette that
 * keeps the form readable. Tints lean white with deliberate teal
 * pulses so the silk feels branded rather than generic.
 *
 * Locked to `h-dvh overflow-hidden` so the silk never crops or
 * scrolls — every auth page composes itself to fit a single screen.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh overflow-hidden bg-[#03070d] antialiased">
      <SilkBackdrop />

      {/* Top-left back-to-home affordance. */}
      <Link
        href="/"
        aria-label="Back to home"
        className="absolute z-20 top-5 left-5 sm:top-7 sm:left-8 inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text transition-colors font-ui font-medium"
        style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
      >
        <ChevronLeft size={15} strokeWidth={2.2} />
        Home
      </Link>

      <main className="relative z-10 h-full flex items-center justify-center px-5 sm:px-8">
        <div className="w-full max-w-[420px] reveal">{children}</div>
      </main>
    </div>
  );
}

/**
 * Silk backdrop — two draped highlights plus fold streaks.
 *
 *   1. **Top-right drape** — a large bright radial gradient with a
 *      teal-tinted secondary glow. This is the primary visual mass.
 *   2. **Top-right folds** — diagonal linear-gradient striations laid
 *      over the drape with `mix-blend-mode: screen` so they read as
 *      fabric highlights rather than opaque overlays. Sells the silk.
 *   3. **Bottom-left drape** — mirrored, softer, dimmer. Balances
 *      the composition without competing with the primary.
 *   4. **Centre vignette** — a soft inner darkening that pushes the
 *      form into the spotlight against the silk.
 *
 * Heavy Gaussian blur turns the discrete colour stops into organic
 * shading. All layers are absolute-positioned within the locked
 * viewport so nothing scrolls.
 */
function SilkBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {/* Top-right drape body — bright peak fading out. */}
      <div
        className="absolute -top-[15%] -right-[10%] w-[72vw] h-[125vh]"
        style={{
          background: `
            radial-gradient(ellipse 48% 58% at 52% 38%, rgba(255,255,255,0.32), transparent 65%),
            radial-gradient(ellipse 34% 42% at 60% 48%, rgba(0,212,200,0.10), transparent 60%),
            radial-gradient(ellipse 80% 90% at 50% 50%, rgba(255,255,255,0.05), transparent 70%)
          `,
          filter: "blur(48px)",
          transform: "rotate(18deg)",
        }}
      />

      {/* Top-right fold streaks — diagonal highlight bands. */}
      <div
        className="absolute -top-[15%] -right-[10%] w-[72vw] h-[125vh]"
        style={{
          background: `linear-gradient(122deg,
            transparent 28%,
            rgba(255,255,255,0.10) 33%,
            rgba(255,255,255,0.03) 38%,
            transparent 42%,
            transparent 54%,
            rgba(255,255,255,0.07) 59%,
            transparent 63%,
            transparent 72%,
            rgba(255,255,255,0.05) 76%,
            transparent 80%,
            transparent 88%,
            rgba(0,212,200,0.05) 92%,
            transparent 96%
          )`,
          filter: "blur(22px)",
          transform: "rotate(18deg)",
          mixBlendMode: "screen",
        }}
      />

      {/* Bottom-left drape body — mirrored, softer. */}
      <div
        className="absolute -bottom-[25%] -left-[15%] w-[55vw] h-[105vh]"
        style={{
          background: `
            radial-gradient(ellipse 50% 60% at 50% 55%, rgba(255,255,255,0.18), transparent 65%),
            radial-gradient(ellipse 32% 42% at 45% 60%, rgba(0,212,200,0.06), transparent 60%)
          `,
          filter: "blur(56px)",
          transform: "rotate(-14deg)",
        }}
      />

      {/* Bottom-left fold streaks. */}
      <div
        className="absolute -bottom-[25%] -left-[15%] w-[55vw] h-[105vh]"
        style={{
          background: `linear-gradient(132deg,
            transparent 28%,
            rgba(255,255,255,0.06) 36%,
            transparent 44%,
            transparent 58%,
            rgba(255,255,255,0.04) 66%,
            transparent 74%
          )`,
          filter: "blur(18px)",
          transform: "rotate(-14deg)",
          mixBlendMode: "screen",
        }}
      />

      {/* Centre vignette — spotlight effect on the form. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 55% at 50% 50%, rgba(0,0,0,0.55), transparent 75%)",
        }}
      />
    </div>
  );
}
