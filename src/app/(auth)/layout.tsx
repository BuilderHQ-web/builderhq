import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Auth shell — single-viewport silk composition.
 *
 * Two SVG silk drapes anchor the corners — a primary bright drape
 * from the top-right with visible curved fold lines, and a smaller
 * mirrored drape from the bottom-left. SVG (not CSS gradients) is
 * the right tool here: the fold curves need to be actual paths so
 * the eye reads them as fabric ribs, not noise. Heavy Gaussian
 * blur via SVG filter turns the crisp paths into soft silk.
 *
 * Tints lean white with a single deliberate teal warmth woven into
 * the top-right drape so it reads as BuilderHQ, not a generic
 * monochrome login.
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
    <div className="relative h-dvh overflow-hidden bg-[#02060c] antialiased">
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
 * Silk backdrop — SVG curves with Gaussian blur.
 *
 * `viewBox="0 0 600 1000"` gives a tall canvas that mirrors the
 * shape of a silk panel hanging from a corner. `preserveAspectRatio
 * ="xMidYMid slice"` ensures the SVG covers its container even when
 * the viewport's aspect ratio doesn't match the canvas.
 *
 * Each drape has:
 *   1. An ellipse for the drape body (broad, soft glow).
 *   2. A teal-tinted secondary ellipse for the brand pulse.
 *   3. Three curved fold paths with stroke-gradients running along
 *      them, each at a slightly different curve so they look like
 *      parallel fabric ribs draping from the corner.
 *   4. A shared Gaussian blur filter (`stdDeviation`) that softens
 *      all of the above into silk.
 */
function SilkBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {/* ── Top-right silk — primary drape ─────────────────────────── */}
      <svg
        className="absolute -top-[18%] -right-[6%] w-[68vw] h-[125vh]"
        viewBox="0 0 600 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="tr-body" cx="0.6" cy="0.28" r="0.55">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.36" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tr-teal" cx="0.62" cy="0.42" r="0.38">
            <stop offset="0%" stopColor="#00d4c8" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#00d4c8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="tr-fold" x1="0.85" y1="0" x2="0.15" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tr-fold-soft" x1="0.85" y1="0" x2="0.15" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter
            id="tr-blur"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>

        {/* Drape body — broad bright glow. */}
        <g filter="url(#tr-blur)">
          <ellipse cx="360" cy="280" rx="290" ry="460" fill="url(#tr-body)" />
          <ellipse cx="380" cy="420" rx="200" ry="320" fill="url(#tr-teal)" />
        </g>

        {/* Fold ribs — curved highlights running diagonally from the
            top-right corner down into the body. */}
        <g filter="url(#tr-blur)">
          <path
            d="M 620,-80 Q 480,220 380,520 T 200,1080"
            stroke="url(#tr-fold)"
            strokeWidth="56"
            fill="none"
          />
          <path
            d="M 620,80 Q 510,360 420,640 T 280,1100"
            stroke="url(#tr-fold-soft)"
            strokeWidth="44"
            fill="none"
          />
          <path
            d="M 600,-160 Q 420,140 320,420 T 160,940"
            stroke="url(#tr-fold-soft)"
            strokeWidth="38"
            fill="none"
          />
          <path
            d="M 640,260 Q 560,500 480,760 T 360,1120"
            stroke="url(#tr-fold-soft)"
            strokeWidth="32"
            fill="none"
            opacity="0.7"
          />
        </g>
      </svg>

      {/* ── Bottom-left silk — mirrored, dimmer ────────────────────── */}
      <svg
        className="absolute -bottom-[22%] -left-[6%] w-[54vw] h-[100vh]"
        viewBox="0 0 600 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="bl-body" cx="0.4" cy="0.7" r="0.55">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bl-fold" x1="0.15" y1="1" x2="0.85" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bl-fold-soft" x1="0.15" y1="1" x2="0.85" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter
            id="bl-blur"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="26" />
          </filter>
        </defs>

        <g filter="url(#bl-blur)">
          <ellipse cx="240" cy="720" rx="260" ry="400" fill="url(#bl-body)" />
        </g>

        <g filter="url(#bl-blur)">
          <path
            d="M -80,1080 Q 160,820 260,540 T 420,-20"
            stroke="url(#bl-fold)"
            strokeWidth="44"
            fill="none"
          />
          <path
            d="M -80,860 Q 200,640 300,400 T 460,40"
            stroke="url(#bl-fold-soft)"
            strokeWidth="36"
            fill="none"
          />
          <path
            d="M -100,1120 Q 100,920 200,640 T 380,120"
            stroke="url(#bl-fold-soft)"
            strokeWidth="30"
            fill="none"
            opacity="0.6"
          />
        </g>
      </svg>

      {/* ── Centre vignette — spotlight on the form ────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 45% 50% at 50% 50%, rgba(0,0,0,0.50), transparent 75%)",
        }}
      />
    </div>
  );
}
