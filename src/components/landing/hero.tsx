"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpRight,
  ShieldCheck,
  Trophy,
  Activity,
  Wallet,
  Files,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CtaLinks } from "./cta-links";

/**
 * Hero — horizontal composition: copy left, card-stack right.
 *
 *   ┌──────────────────────────┐ ┌────────────────────┐
 *   │ live badge               │ │                    │
 *   │ display headline         │ │   stack of 3       │
 *   │ subhead                  │ │   cards            │
 *   │ primary CTA + ghost      │ │   (shuffling)      │
 *   └──────────────────────────┘ └────────────────────┘
 *
 * Right column hosts <HeroCardStack /> — three product previews
 * stacked in perspective. Auto-rotates every 5s. Hover pauses the
 * rotation and lifts the front card with a stronger glow. Click
 * anywhere on the stack to advance manually.
 *
 * On mobile we drop the stack entirely and show the single front
 * card centred below the copy — keeps the hero short and breathable
 * on a phone.
 *
 * Atmosphere (Ambient, GridOverlay, FibreCanvas, CustomCursor,
 * NoiseLayer) lives at the page level and floats behind every
 * section. This hero just composes content on top of it.
 */
export function Hero({ cta }: { cta: CtaLinks }) {

  return (
    <section
      id="hero"
      className="relative isolate pt-20 lg:pt-32 pb-16 lg:pb-32 px-5 md:px-10 overflow-hidden"
    >
      {/* Single scan-line sweep on mount — subtle premium signal */}
      <motion.span
        aria-hidden
        initial={{ y: "-30vh", opacity: 0 }}
        animate={{ y: "120vh", opacity: [0, 0.5, 0.5, 0] }}
        transition={{
          duration: 1.8,
          ease: [0.22, 1, 0.36, 1],
          delay: 0.25,
          times: [0, 0.15, 0.85, 1],
        }}
        className="pointer-events-none absolute left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.8), transparent)",
        }}
      />

      <div className="mx-auto max-w-[1320px] grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-20 items-center">
        {/* Left — copy. */}
        <div
          className="text-center lg:text-left"
          style={{ fontFamily: "var(--font-geist)" }}
        >
          {/* Live badge */}
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2.5 pl-2.5 pr-4 py-1.5 rounded-full border border-border-subtle bg-[rgba(255,255,255,0.025)] backdrop-blur-sm text-[12px] text-text-muted"
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative size-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
            </span>
            <span className="text-accent-light font-medium">Now live in Australia</span>
          </motion.span>

          {/* Headline — Instrument Serif with right-side fade. */}
          <h1
            className="mt-6 lg:mt-8 tracking-[-0.025em] leading-[1.0] text-[clamp(3rem,7vw+1rem,6.5rem)]"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}
          >
            <FadeRow delay={0}>
              <span className="block">Tender your build.</span>
            </FadeRow>
            <FadeRow delay={0.12} faded>
              <span className="block">In days.</span>
            </FadeRow>
          </h1>

          {/* Subhead — short, declarative. No em dashes. */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 lg:mt-9 mx-auto lg:mx-0 max-w-[32rem] text-[16px] sm:text-[17px] leading-[1.55] text-text-subtle"
          >
            Upload your plans. We match verified builders. You pick the winner.
          </motion.p>

          {/* Primary CTA + ghost secondary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 lg:mt-10 flex flex-col items-stretch lg:items-start sm:flex-row sm:items-center sm:justify-center lg:justify-start gap-3 sm:gap-5"
          >
            <Link
              href={cta.primary.href}
              className={cn(
                "group inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full",
                "bg-accent text-accent-contrast text-[14px] font-semibold tracking-[0.01em]",
                "transition-[background-color,box-shadow,transform] duration-[180ms]",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_0_0_1px_rgba(0,212,200,0.45),0_0_28px_-4px_rgba(0,212,200,0.55),0_10px_28px_-8px_rgba(0,212,200,0.5)]",
                "hover:bg-accent-hover hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_0_0_1px_rgba(0,212,200,0.55),0_0_36px_-4px_rgba(0,212,200,0.75),0_14px_32px_-8px_rgba(0,212,200,0.65)]",
                "active:translate-y-[0.5px]",
              )}
            >
              {cta.primary.label}
              <ArrowUpRight
                className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2.4}
              />
            </Link>
            <Link
              href={cta.secondary.href}
              className="group inline-flex items-center justify-center sm:justify-start gap-1.5 px-2 py-3 text-[14px] text-text-muted hover:text-text transition-colors"
            >
              {cta.secondary.label}
              <ArrowUpRight className="size-3.5 opacity-60 transition-all duration-[180ms] group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          </motion.div>
        </div>

        {/* Right — card stack. Visible on lg+. On mobile a compact
            single-card cycler renders below the CTA strip. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block"
        >
          <HeroCardStack />
        </motion.div>

        {/* Mobile-only compact card, below CTAs. Cleaner than the
            previous "above headline" placement which crowded the
            top of the phone screen. */}
        <div className="lg:hidden mt-4 flex justify-center">
          <MobileHeroCard />
        </div>
      </div>
    </section>
  );
}

/**
 * Headline row with optional right-side fade. Uses Tailwind's
 * background-clip:text to fade the second line into the page, the
 * Resend signature treatment on their "developers" word.
 */
function FadeRow({
  children,
  delay,
  faded,
}: {
  children: React.ReactNode;
  delay: number;
  faded?: boolean;
}) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className={cn("block", faded && "bg-clip-text text-transparent")}
        initial={{ y: "105%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ delay, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
        style={
          faded
            ? {
                // Fade right edge into muted, evoking Resend's
                // "developers" gradient ghost effect — done in our
                // teal-tinted palette so it stays on-brand.
                backgroundImage:
                  "linear-gradient(110deg, #eef6ff 0%, #eef6ff 35%, rgba(126,245,237,0.55) 90%)",
              }
            : { color: "#eef6ff" }
        }
      >
        {children}
      </motion.span>
    </span>
  );
}

// ── Card stack — 3 previews shuffling in perspective ──────────────

const STACK_CARDS = [
  { Component: PulseCard, key: "pulse" },
  { Component: BuilderVerifyCard, key: "verify" },
  { Component: CompareCard, key: "compare" },
] as const;

const STACK_LEN = STACK_CARDS.length;
const ROTATE_MS = 5000;

/**
 * Stack of three uniform-sized product cards in perspective.
 *
 *   · All cards share a fixed `h-[480px]` container so they look
 *     visually identical in size — only the content inside differs.
 *   · Front card sits flat, sharp, opaque.
 *   · Two cards behind sit offset down + right at smaller scale +
 *     lower opacity + slight blur. Reads as a real deck.
 *   · Auto-rotates every 5s. Front card flicks to the back; the
 *     others step forward one position.
 *   · Continuous gentle float (y oscillation) on the whole stack
 *     so it feels alive even at rest, similar to Resend's cube.
 *   · Mouse-tracking tilt: as the cursor moves over the stack, the
 *     deck tilts a few degrees in response. Subtle premium signal.
 *   · Hover pauses the auto-rotate, intensifies the halo, lifts
 *     the front card 6px and scales it 1.015.
 *   · Click / Enter / Space advances manually. Cursor is pointer.
 */
function HeroCardStack() {
  const [frontIdx, setFrontIdx] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-rotate (paused on hover).
  useEffect(() => {
    if (hovering) return;
    const id = window.setInterval(() => {
      setFrontIdx((i) => (i + 1) % STACK_LEN);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [hovering]);

  const advance = () => setFrontIdx((i) => (i + 1) % STACK_LEN);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // -1..1 across the element, then scaled to a few degrees.
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    setTilt({ x: -ny * 3, y: nx * 4 });
  };
  const handleMouseLeave = () => {
    setHovering(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={advance}
      role="button"
      aria-label="Cycle product preview"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          advance();
        }
      }}
      className="relative w-full max-w-[520px] mx-auto h-[480px] cursor-pointer select-none [perspective:1600px]"
    >
      {/* Ambient halo behind the stack — intensifies on hover. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-12 rounded-[40px]"
        animate={{ opacity: hovering ? 1 : 0.7 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(0,212,200,0.22), transparent 65%)",
        }}
      />

      {/* Continuous gentle float — wraps all three cards. */}
      <motion.div
        className="absolute inset-0"
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 6,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
          transformStyle: "preserve-3d",
        }}
      >
        {STACK_CARDS.map(({ Component, key }, i) => {
          const order = (i - frontIdx + STACK_LEN) % STACK_LEN;
          // order 0 = front, 1 = mid, 2 = back
          return (
            <motion.div
              key={key}
              initial={false}
              animate={{
                x: order * 22,
                y: order * 24 + (order === 0 && hovering ? -6 : 0),
                scale:
                  order === 0
                    ? hovering
                      ? 1.015
                      : 1
                    : 1 - order * 0.05,
                opacity: order === 0 ? 1 : order === 1 ? 0.7 : 0.4,
                rotateY: order * -3,
                rotateZ: order * -1.5,
                zIndex: STACK_LEN - order,
                filter: order === 0 ? "blur(0px)" : `blur(${order * 0.6}px)`,
              }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
              style={{
                transformOrigin: "50% 100%",
                willChange: "transform, opacity",
              }}
            >
              <FixedHeightCard>
                <Component />
              </FixedHeightCard>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Stack indicator — three dots showing which card is front. */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
        {STACK_CARDS.map((_, i) => (
          <motion.span
            key={i}
            animate={{
              width: i === frontIdx ? 20 : 6,
              opacity: i === frontIdx ? 1 : 0.4,
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-1.5 rounded-full bg-accent"
            style={{
              boxShadow:
                i === frontIdx
                  ? "0 0 8px rgba(0,212,200,0.7)"
                  : "0 0 4px rgba(0,212,200,0.3)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Forces every card to render at the same 100% width / 100% height
 * of the stack slot. The card's internal layout flows naturally
 * inside; if a card is content-shorter than the slot, empty space
 * sits at the bottom — visually all three reads as the same object.
 */
function FixedHeightCard({ children }: { children: React.ReactNode }) {
  return <div className="w-full h-full [&>*]:h-full">{children}</div>;
}

/**
 * Mobile-only single card cycler. Renders solo (no stack) so the
 * phone hero stays compact. Cross-fades through the same three
 * cards on the 5s rotation.
 */
function MobileHeroCard() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % STACK_LEN);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative w-full max-w-[380px] h-[440px]">
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-8 rounded-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(0,212,200,0.16), transparent 70%)",
        }}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={STACK_CARDS[idx]!.key}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <FixedHeightCard>
            {(() => {
              const Card = STACK_CARDS[idx]!.Component;
              return <Card />;
            })()}
          </FixedHeightCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Single small product preview that sits above the headline on mobile.
 * Resend uses a tiny 3D cube as a hero anchor — we use a compact
 * "Best value" tender row so the visual sells the actual product, not
 * just decoration. Float animation gives it a gentle dynamism without
 * the deck's complexity.
 */
function FloatingHeroChip() {
  return (
    <motion.div
      // Gentle continuous float — 4.5s sinusoidal, low amplitude.
      // Reduces perceived "static-ness" without being distracting.
      animate={{ y: [0, -6, 0] }}
      transition={{
        duration: 4.5,
        ease: "easeInOut",
        repeat: Infinity,
      }}
      className="relative w-full max-w-[300px]"
    >
      {/* Glow halo behind the chip */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-8 rounded-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,212,200,0.18), transparent 70%)",
        }}
      />
      <div
        className="relative rounded-lg border border-[rgba(100,180,255,0.16)] backdrop-blur-xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
        style={{
          background:
            "linear-gradient(160deg, rgba(10,30,48,0.94), rgba(6,18,30,0.97))",
        }}
      >
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(126,245,237,0.55), transparent)",
          }}
        />
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[rgba(255,255,255,0.05)]">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 rounded-full bg-accent-light opacity-75 animate-ping" />
            <span className="relative size-1.5 rounded-full bg-accent-light shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
          </span>
          <span className="text-[9px] tracking-[0.18em] uppercase text-text-muted font-ui">
            Best tender
          </span>
          <span className="ml-auto text-[8.5px] tracking-[0.14em] uppercase text-accent border border-border-accent px-1.5 py-0.5 rounded-sm">
            Live
          </span>
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <span
            className="size-9 rounded-full flex items-center justify-center text-[11px] font-bold border border-border-accent text-accent-light shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
            }}
          >
            JS
          </span>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-[12px] font-semibold text-text truncate">
              Smith Builders
            </div>
            <div className="text-[9.5px] text-text-dim">
              ABN ✓ · Licence ✓
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              className="font-display tabular-nums leading-none text-accent-light"
              style={{ fontSize: 17 }}
            >
              $1.78M
            </div>
            <div className="text-[9px] mt-0.5 text-accent-light/80">-4% median</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Row({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: "105%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ delay, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function ProofItem({ label }: { label: string }) {
  return (
    <li className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="size-[5px] rounded-full bg-accent-light"
        style={{ boxShadow: "0 0 8px rgba(0,212,200,0.55)" }}
      />
      {label}
    </li>
  );
}

// ── HeroCardCycler ──────────────────────────────────────────────────────
//
// Stacked carousel of four product views. Auto-advances every 5s.
// Visual model: a small "deck" of cards. The active card sits on
// top in full focus; two cards behind are ghosted with a subtle
// translate-down + scale-down to give depth. On advance, the front
// card slides up + fades out, the next-in-line cards each step
// forward one slot. Smooth, calm, premium.

const HERO_CARDS = [
  { id: "compare", render: () => <CompareCard /> },
  { id: "pulse", render: () => <PulseCard /> },
  { id: "verify", render: () => <BuilderVerifyCard /> },
  { id: "tender", render: () => <TenderInProgressCard /> },
] as const;

// Carousel timing. The leaving card's animation needs to be SLOWER
// than the standard slot-to-slot interpolation so the user can
// actually track its path: card lifts off the front, hovers above
// the deck for a beat, then descends slowly behind the others and
// settles at the back. 1.6s gives each phase room to breathe.
//
// CYCLE_MS controls how long between auto-advances. We keep it
// noticeably longer than FLICK_MS so the new active card has time
// to settle before another flick begins.
const CYCLE_MS = 4400;
const FLICK_MS = 1600;
const SETTLE_MS = 800;

function HeroCardCycler() {
  const [active, setActive] = useState(0);
  // Index of the card that was JUST active (the one being flicked to
  // the back). Clears once the flick animation completes so the card
  // settles into its real back-of-deck slot for subsequent renders.
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  // Advance the deck. Captures the current active as "leaving" so its
  // motion node animates the keyframe arc instead of the standard slot
  // interpolation.
  const advance = (next: number) => {
    setActive((cur) => {
      if (next === cur) return cur;
      setLeavingIndex(cur);
      window.setTimeout(
        () => setLeavingIndex((v) => (v === cur ? null : v)),
        FLICK_MS + 40,
      );
      return next;
    });
  };

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      advance((active + 1) % HERO_CARDS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(t);
  }, [paused, active]);

  return (
    <div
      // Responsive deck. Constrained to a sensible card width on phones
      // so the deck doesn't blow past the viewport, and centred under
      // the hero text on mobile (lg+ keeps the side-by-side layout).
      // The flick arc translates +90px on the x axis at peak — we leave
      // a little breathing room so the leaving card stays visible
      // before fading out.
      className="relative mx-auto w-full max-w-[380px] sm:max-w-[440px] lg:max-w-none h-[420px] sm:h-[480px] lg:h-[540px] [perspective:1400px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Each card's animation comes from one of two paths:
            - leavingIndex matches → 4-keyframe arc the user can
              actually track: front (slot 0) → LIFT up above the deck
              → HOLD above for a beat → DESCEND behind the others →
              SETTLE at the back (slot N).
            - otherwise → standard interpolation to its slot styles.
          The leaving card stays VISIBLE for most of the journey
          (opacity stays high until the descent's final third) so the
          eye can follow the path. Z-index is animated through the
          keyframes so the card visibly passes BEHIND each deck layer
          on its way down — that's the bit that sells "it went to the
          back," not just "it disappeared and reappeared." */}
      {HERO_CARDS.map((card, i) => {
        const slot = (i - active + HERO_CARDS.length) % HERO_CARDS.length;
        const isActive = slot === 0;
        const isLeaving = i === leavingIndex;
        const target = slotTarget(slot);

        return (
          <motion.div
            key={card.id}
            className="absolute inset-x-0 top-0 [transform-style:preserve-3d] [will-change:transform,opacity,filter]"
            style={{
              pointerEvents: isActive ? "auto" : "none",
              transformOrigin: "50% 80%",
            }}
            animate={
              isLeaving
                ? {
                    // Lift → hover → descend behind → settle at back
                    //
                    // y arc: 0 (front) → -120 (high above the deck) →
                    //        -120 (held — give the eye time to read it) →
                    //         target.y (settled at back, below front)
                    //
                    // rotate: subtle 2D tilt during the journey, settles
                    //         flat at rest.
                    //
                    // rotateX: deeper perspective tilt as the card
                    //          leans away while descending.
                    //
                    // scale: shrinks slightly to suggest "going far"
                    //        before settling.
                    //
                    // opacity: STAYS HIGH (0.85+) until the final
                    //          descent so the user can track the path.
                    //
                    // zIndex: starts above all (40), then SINKS through
                    //         the deck — 22 (passes the front), 12
                    //         (passes the next), 5 (lands behind all).
                    y: [0, -120, -120, 30, target.y],
                    rotate: [0, -3, 4, 1, 0],
                    rotateX: [0, -8, 0, 12, target.rotateX ?? 14],
                    scale: [1, 0.96, 0.94, 0.90, target.scale],
                    opacity: [1, 1, 1, 0.55, target.opacity],
                    filter: [
                      "blur(0px)",
                      "blur(0px)",
                      "blur(0.5px)",
                      "blur(2px)",
                      target.filter,
                    ],
                    zIndex: [40, 40, 22, 12, target.z],
                  }
                : {
                    x: target.x ?? 0,
                    y: target.y,
                    rotate: 0,
                    rotateX: target.rotateX ?? 0,
                    scale: target.scale,
                    opacity: target.opacity,
                    filter: target.filter,
                    zIndex: target.z,
                  }
            }
            transition={
              isLeaving
                ? {
                    duration: FLICK_MS / 1000,
                    // Heavy bias on the descent: lift is fast (0–22%),
                    // hover is short (22–42%), then descent gets 58%
                    // of the duration so the user can clearly track
                    // the card going behind the deck.
                    times: [0, 0.22, 0.42, 0.78, 1],
                    ease: [0.4, 0.05, 0.25, 1],
                  }
                : {
                    duration: SETTLE_MS / 1000,
                    ease: [0.16, 1, 0.3, 1],
                  }
            }
          >
            {card.render()}
          </motion.div>
        );
      })}

      {/* Dot indicators with progress fill — calm sense of "next in
          1.2s" without being a loading bar. Resets cleanly on
          click + hover-pause. */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 z-40">
        {HERO_CARDS.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => advance(i)}
            aria-label={`Show ${card.id} card`}
            className="group inline-flex items-center justify-center h-11 px-2"
          >
            <span
              className={cn(
                "relative block h-1.5 rounded-full overflow-hidden transition-[width,background-color] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                i === active
                  ? "w-7 bg-[rgba(0,212,200,0.18)]"
                  : "w-1.5 bg-text-faint group-hover:bg-text-dim",
              )}
            >
              {i === active ? (
                <motion.span
                  key={`${active}-${paused}`}
                  className="absolute inset-y-0 left-0 bg-accent shadow-[0_0_8px_rgba(0,212,200,0.7)]"
                  initial={{ width: "0%" }}
                  animate={{ width: paused ? "0%" : "100%" }}
                  transition={{
                    duration: paused ? 0 : CYCLE_MS / 1000,
                    ease: "linear",
                  }}
                />
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Resting transform for a card based on its slot offset from active.
 * Cards behind the front get a small rotateX (~6° / 12°) so the deck
 * leans away from the viewer — that's the bit that makes the flick
 * feel like a real card going back, not just shrinking.
 */
function slotTarget(slot: number): {
  y: number;
  x?: number;
  scale: number;
  opacity: number;
  filter: string;
  z: number;
  rotateX?: number;
} {
  if (slot === 0) {
    return {
      y: 0,
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
      z: 30,
      rotateX: 0,
    };
  }
  if (slot === 1) {
    return {
      y: 28,
      scale: 0.955,
      opacity: 0.55,
      filter: "blur(1px)",
      z: 20,
      rotateX: 6,
    };
  }
  if (slot === 2) {
    return {
      y: 50,
      scale: 0.91,
      opacity: 0.24,
      filter: "blur(2px)",
      z: 10,
      rotateX: 12,
    };
  }
  // slot 3+ — full back-of-deck. Same direction as slot 2 but pushed
  // further with even less opacity. Cards naturally land here at the
  // end of the flick keyframe arc.
  return {
    y: 64,
    scale: 0.88,
    opacity: 0.10,
    filter: "blur(3px)",
    z: 5,
    rotateX: 16,
  };
}

// ── Hero card 1 — the original tender comparison preview ────────────────
// Same shape as the real comparison page so the hero shows what owners
// land on. Keeps the ABN/Licence chips and Best value badge.

function CompareCard() {
  return <ProjectCard />;
}

// ── Hero card 2 — pulse / KPIs ──────────────────────────────────────────
// Mirrors the ProjectPulseHeader on the comparison page: a 4-tile KPI
// strip + a CSS sparkline of price distribution. Says "you'll see the
// whole project's tender story at a glance."

function PulseCard() {
  return (
    <CardShell>
      <CardHeader
        kicker="Project pulse"
        title="At-a-glance signal"
        badge="Live"
      />
      <div className="grid grid-cols-2 divide-x divide-y divide-[rgba(255,255,255,0.05)]">
        <PulseTile
          icon={<Activity className="size-3.5" />}
          label="Tenders"
          value="3"
          sub="2 unique builders"
        />
        <PulseTile
          icon={<Wallet className="size-3.5" />}
          label="Median"
          value="$1.86M"
          sub="$1.78M – $1.91M"
        />
        <PulseTile
          icon={<ShieldCheck className="size-3.5" />}
          label="Verified"
          value="100%"
          sub="ABN + Licence"
          tone="accent"
        />
        <PulseTile
          icon={<Files className="size-3.5" />}
          label="Spread"
          value="7%"
          sub="Tight — builders agree"
          tone="accent"
        />
      </div>
      <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.05)]">
        <div className="text-[9px] tracking-[0.18em] uppercase text-text-dim mb-2">
          Price distribution
        </div>
        <PulseSparkline />
      </div>
    </CardShell>
  );
}

function PulseTile({
  icon,
  label,
  value,
  sub,
  tone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "muted" | "accent";
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-text-dim mb-1.5">
        <span className="size-5 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)] flex items-center justify-center text-text-muted">
          {icon}
        </span>
        <span className="text-[8.5px] tracking-[0.18em] uppercase">{label}</span>
      </div>
      <div
        className={cn(
          "font-display tabular-nums leading-none",
          tone === "accent" ? "text-accent-light" : "text-text",
        )}
        style={{ fontSize: 22 }}
      >
        {value}
      </div>
      <div className="text-[10px] text-text-dim mt-1">{sub}</div>
    </div>
  );
}

function PulseSparkline() {
  // Three ticks on a rail with the median marker centred — same
  // language as the real ProjectPulseHeader sparkline.
  return (
    <div className="relative h-7">
      <div className="absolute inset-x-0 top-1/2 h-px bg-border-subtle -translate-y-1/2" />
      <div
        className="absolute top-1/2 h-px bg-accent/40 -translate-y-1/2"
        style={{ left: 0, width: "50%" }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-px h-3.5 bg-text"
        style={{ left: "50%" }}
      />
      <span className="absolute left-0 -bottom-0.5 text-[8.5px] text-text-dim">
        $1.78M
      </span>
      <span className="absolute right-0 -bottom-0.5 text-[8.5px] text-text-dim">
        $1.91M
      </span>
      {[15, 50, 85].map((pct, idx) => (
        <span
          key={idx}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full bg-accent border border-border-accent shadow-[0_0_0_2px_rgba(0,212,200,0.20)]"
          style={{ left: `${pct}%` }}
        />
      ))}
    </div>
  );
}

// ── Hero card 3 — builder verification ──────────────────────────────────
// Says "every builder is real, ABR-active, licence-active." Two big
// tick badges + builder identity + a "trusted on platform" stat row.

function BuilderVerifyCard() {
  return (
    <CardShell>
      <CardHeader
        kicker="Verified builder"
        title="Trust, before tender"
        badge="ABR ✓"
      />
      <div className="px-5 py-5">
        <div className="flex items-center gap-3 mb-5">
          <span
            className="size-12 rounded-full flex items-center justify-center text-[14px] font-bold border border-border-accent text-accent-light shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
            }}
          >
            JS
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-text">
              Smith Builders
            </div>
            <div className="text-[11px] text-text-dim">
              Registered VIC · 12 years
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <VerifyRow
            label="Australian Business Register"
            sub="ABN active · Smith Builders Pty Ltd"
          />
          <VerifyRow
            label="Victorian Building Authority"
            sub="Domestic Builder Unlimited · DB-U 1234"
          />
          <VerifyRow
            label="Public Liability Insurance"
            sub="$20M · CGU · valid through Mar 2027"
          />
        </div>

        <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.05)] grid grid-cols-3 gap-2">
          <MiniStat label="Won on BHQ" value="3" />
          <MiniStat label="Service area" value="Inner VIC" />
          <MiniStat label="Match rate" value="94%" />
        </div>
      </div>
    </CardShell>
  );
}

function VerifyRow({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-sm border border-border-accent/40 bg-[rgba(0,212,200,0.04)]">
      <span className="size-5 rounded-sm border border-border-accent bg-accent-muted text-accent-light flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle2 className="size-3" />
      </span>
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold text-text">{label}</div>
        <div className="text-[10px] text-text-dim leading-[1.4]">{sub}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-2 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.018)]">
      <div className="text-[8px] tracking-[0.16em] uppercase text-text-dim mb-0.5">
        {label}
      </div>
      <div className="text-[12px] font-semibold text-text tabular-nums">
        {value}
      </div>
    </div>
  );
}

// ── Hero card 4 — tender in progress / activity ─────────────────────────
// "You won't be staring at silence — here's the live activity feed."

function TenderInProgressCard() {
  const events = [
    {
      icon: <Trophy className="size-3" />,
      title: "Smith Builders awarded",
      sub: "Niddrie Townhouse · just now",
      tone: "accent" as const,
    },
    {
      icon: <Files className="size-3" />,
      title: "Roberts & Co submitted",
      sub: "Tender · $1.88M · 28w · 2h ago",
      tone: "muted" as const,
    },
    {
      icon: <ShieldCheck className="size-3" />,
      title: "Chen Construction unlocked",
      sub: "Address + docs revealed · 5h ago",
      tone: "muted" as const,
    },
    {
      icon: <Activity className="size-3" />,
      title: "Project published",
      sub: "Visible to 18 verified builders · 2d ago",
      tone: "muted" as const,
    },
  ];
  return (
    <CardShell>
      <CardHeader
        kicker="Project activity"
        title="What's happening, live"
        badge="Stream"
      />
      <ul className="px-5 py-5 space-y-3">
        {events.map((e, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-3 px-3 py-2.5 rounded-sm border",
              e.tone === "accent"
                ? "border-border-accent/55 bg-[rgba(0,212,200,0.04)]"
                : "border-border-subtle bg-[rgba(255,255,255,0.012)]",
            )}
          >
            <span
              className={cn(
                "size-6 rounded-sm flex items-center justify-center shrink-0 mt-0.5",
                e.tone === "accent"
                  ? "border border-border-accent bg-accent-muted text-accent-light"
                  : "border border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-muted",
              )}
            >
              {e.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "text-[12.5px] font-semibold",
                  e.tone === "accent" ? "text-accent-light" : "text-text",
                )}
              >
                {e.title}
              </div>
              <div className="text-[10.5px] text-text-dim leading-[1.45]">
                {e.sub}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

// ── card chrome — shared shell + header used by all 4 hero cards ────────

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative h-full flex flex-col rounded-lg border border-[rgba(100,180,255,0.12)] backdrop-blur-xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
      style={{
        background:
          "linear-gradient(160deg, rgba(10,30,48,0.94), rgba(6,18,30,0.97))",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.6), transparent)",
        }}
      />
      <span
        aria-hidden
        className="absolute -inset-px rounded-lg pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(0,212,200,0.12), transparent 60%)",
        }}
      />
      <div className="relative flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function CardHeader({
  kicker,
  title,
  badge,
}: {
  kicker: string;
  title: string;
  badge: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-2">
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-accent-light opacity-75 animate-ping" />
          <span className="relative size-1.5 rounded-full bg-accent-light shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
        </span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-text-muted font-ui">
          {kicker} · {title}
        </span>
      </div>
      <span className="px-2.5 py-1 border border-border-accent rounded-sm text-[9px] tracking-[0.16em] uppercase text-accent">
        {badge}
      </span>
    </div>
  );
}

// ── single product preview card ─────────────────────────────────────────
//
// The original card — kept as <CompareCard/>, the first slide in the
// cycler. The real visual that mirrors the comparison page UI.

function ProjectCard() {
  return (
    <div
      className="relative rounded-lg border border-[rgba(100,180,255,0.12)] backdrop-blur-xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
      style={{
        background:
          "linear-gradient(160deg, rgba(10,30,48,0.92), rgba(6,18,30,0.96))",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.6), transparent)",
        }}
      />
      <span
        aria-hidden
        className="absolute -inset-px rounded-lg pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(0,212,200,0.12), transparent 60%)",
        }}
      />

      {/* Top bar — mimics the tender comparison page header */}
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 rounded-full bg-accent-light opacity-75 animate-ping" />
            <span className="relative size-1.5 rounded-full bg-accent-light shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-text-muted font-ui">
            Niddrie Townhouse · 3 tenders
          </span>
        </div>
        <span className="px-2.5 py-1 border border-border-accent rounded-sm text-[9px] tracking-[0.16em] uppercase text-accent">
          Comparing
        </span>
      </div>

      {/* Pulse strip — three KPI cells echoing the real ProjectPulseHeader */}
      <div className="relative grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.05)] border-b border-[rgba(255,255,255,0.05)]">
        <PulseCell label="Median" value="$1.86M" />
        <PulseCell label="Spread" value="7%" tone="accent" />
        <PulseCell label="Verified" value="100%" tone="accent" />
      </div>

      {/* Two stacked tender rows — preview of the comparison cards.
          Top row carries a "Best value" recommendation badge so the
          card matches the actual product UI. */}
      <div className="p-5 space-y-3">
        <TenderRow
          initials="JS"
          name="Smith Builders"
          price="$1.78M"
          delta="-4% median"
          recommendation="Best value"
          highlight
        />
        <TenderRow
          initials="AC"
          name="Chen Construction"
          price="$1.91M"
          delta="+3% median"
        />
        <TenderRow
          initials="MR"
          name="Roberts &amp; Co"
          price="$1.88M"
          delta="+1% median"
        />
      </div>
    </div>
  );
}

function PulseCell({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "accent";
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="text-[8.5px] tracking-[0.18em] uppercase text-text-dim mb-1">
        {label}
      </div>
      <div
        className={
          tone === "accent"
            ? "font-display tabular-nums leading-none text-accent-light"
            : "font-display tabular-nums leading-none text-text"
        }
        style={{ fontSize: 18 }}
      >
        {value}
      </div>
    </div>
  );
}

function TenderRow({
  initials,
  name,
  price,
  delta,
  recommendation,
  highlight,
}: {
  initials: string;
  name: string;
  price: string;
  delta: string;
  recommendation?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "relative flex items-center gap-3 px-3.5 py-3 rounded-sm border",
        highlight
          ? "border-border-accent/55 bg-[rgba(0,212,200,0.05)]"
          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.012)]",
      ].join(" ")}
    >
      {/* Avatar */}
      <span
        className="size-8 rounded-full flex items-center justify-center text-[10px] font-bold border border-border-accent text-accent-light shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
        }}
      >
        {initials}
      </span>

      {/* Builder block */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-text truncate">
            {name}
          </span>
          {recommendation ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-border-accent bg-accent-muted/40 text-[8.5px] tracking-[0.16em] uppercase text-accent-light font-semibold">
              {recommendation}
            </span>
          ) : null}
        </div>
        <div className="text-[10px] text-text-dim">
          ABN ✓ · Licence ✓
        </div>
      </div>

      {/* Price + delta */}
      <div className="text-right shrink-0">
        <div
          className={[
            "font-display tabular-nums leading-none",
            highlight ? "text-accent-light" : "text-text",
          ].join(" ")}
          style={{ fontSize: 18 }}
        >
          {price}
        </div>
        <div
          className={[
            "text-[9.5px] mt-0.5 tabular-nums",
            highlight ? "text-accent-light/80" : "text-text-dim",
          ].join(" ")}
        >
          {delta}
        </div>
      </div>
    </div>
  );
}
