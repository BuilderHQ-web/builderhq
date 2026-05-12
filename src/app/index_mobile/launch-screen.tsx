"use client";

/**
 * LaunchScreen — the animated body of /index_mobile.
 *
 * Marked client because it ticks a countdown each second, runs motion
 * entry animations, and adapts to viewport changes. Pure visuals, no
 * network calls.
 *
 * Reading order on screen (top → bottom):
 *
 *   1. BuilderHQ logo (small, breathing entry)
 *   2. Kicker — "BUILDERHQ"
 *   3. Hero "2.0" — Bebas Neue at hero scale, teal glow halo,
 *      breathing brightness, framed in corner brackets
 *   4. "DROPPING IN" label
 *   5. DAYS — big animated count-up on mount, then live tick
 *   6. HH·MM·SS sub-row — live tick, smaller
 *   7. Tagline copy
 *   8. CTA — "Use the web" → builderhq.com.au in native browser
 *   9. Footer signature
 *
 * Background:
 *   - Faded blueprint grid (radial-masked so it never feels like wallpaper)
 *   - Teal aurora blob top (slow breathe)
 *   - Violet aurora blob bottom (slower breathe, lower amplitude)
 *   - Diagonal scanline sweep (slow, infinite)
 *   - SVG noise overlay (very subtle)
 *
 * Motion choreography:
 *   - 200ms stagger between elements, easeOutQuart [0.32, 0.72, 0, 1]
 *   - The 2.0 scale-ins from 0.92 → 1 over 1s
 *   - Background blobs breathe on 6–8s loops
 *   - The seconds digit live-ticks every 1s; minutes/hours/days update
 *     when their boundaries cross
 */

import { useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

interface Props {
  /** ISO-with-offset string. Static so SSR + client agree on the diff. */
  launchAt: string;
}

export function LaunchScreen({ launchAt }: Props) {
  const targetMs = useMemo(() => new Date(launchAt).getTime(), [launchAt]);
  const { days, hours, minutes, seconds, isLaunched } = useCountdown(targetMs);

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-bg-deep text-text flex flex-col">
      <Background />

      {/* Top — logo */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        className="relative z-10 flex justify-center pt-10 pb-4"
      >
        <Logo height={26} />
      </motion.header>

      {/* Middle — hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Kicker */}
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-[10.5px] tracking-[0.32em] uppercase text-accent font-ui font-medium"
        >
          BuilderHQ
        </motion.span>

        {/* 2.0 hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="relative mt-3 mb-8"
        >
          {/* glow halo */}
          <div
            aria-hidden
            className="absolute -inset-16 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(0,212,200,0.28) 0%, rgba(0,212,200,0.08) 30%, transparent 65%)",
            }}
          />
          {/* breathing scale loop on the digits */}
          <motion.span
            animate={{ opacity: [0.92, 1, 0.92] }}
            transition={{
              duration: 3.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative inline-block font-display"
            style={{
              fontSize: "clamp(120px, 40vw, 220px)",
              lineHeight: 0.85,
              letterSpacing: "-0.04em",
              color: "var(--color-text)",
              textShadow:
                "0 0 60px rgba(0,212,200,0.45), 0 0 120px rgba(0,212,200,0.15)",
            }}
          >
            2.0
          </motion.span>
          {/* corner brackets framing the hero */}
          <BracketsTight />
        </motion.div>

        {/* Dropping in */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="text-[10.5px] tracking-[0.34em] uppercase text-text-dim font-ui font-medium mb-3"
        >
          {isLaunched ? "Now Live" : "Dropping In"}
        </motion.span>

        {/* Animated big DAYS */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0, ease: [0.32, 0.72, 0, 1] }}
          className="flex items-baseline gap-2"
        >
          <AnimatedDigits
            target={isLaunched ? 0 : days}
            className="font-display tabular-nums"
            style={{
              fontSize: "clamp(72px, 24vw, 132px)",
              lineHeight: 0.9,
              letterSpacing: "-0.025em",
            }}
          />
          <span className="font-ui text-[12px] tracking-[0.24em] uppercase text-text-muted pb-2">
            {days === 1 ? "Day" : "Days"}
          </span>
        </motion.div>

        {/* HH · MM · SS sub */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.3 }}
          className="mt-3 flex items-center gap-3 font-mono tabular-nums text-[11.5px] tracking-[0.18em] uppercase text-text-dim"
        >
          <TickCell value={hours} label="hrs" />
          <Dot />
          <TickCell value={minutes} label="min" />
          <Dot />
          <TickCell value={seconds} label="sec" />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.55 }}
          className="mt-10 text-[13px] leading-[21px] text-text-muted max-w-[300px]"
        >
          We&apos;ve rebuilt BuilderHQ from the ground up — faster, sharper,
          native. The new mobile app drops in days. In the meantime,
          everything works on the web.
        </motion.p>

        {/* CTA */}
        <motion.a
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.75, ease: [0.32, 0.72, 0, 1] }}
          href="https://builderhq.com.au"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full",
            "bg-accent text-accent-contrast text-[13px] font-ui font-semibold tracking-[0.04em] uppercase",
            "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_14px_36px_-14px_rgba(0,212,200,0.6)]",
            "active:scale-[0.97] transition-transform duration-[160ms]",
          )}
        >
          Open in browser
          <ArrowUpRight className="size-4" />
        </motion.a>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2.0 }}
        className="relative z-10 pb-8 pt-4 px-6 flex flex-col items-center gap-2"
      >
        <div className="flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase text-text-faint font-ui">
          <span>v1</span>
          <span className="h-px w-8 bg-gradient-to-r from-text-faint/0 via-text-faint to-accent/60" />
          <span className="text-accent-light">v2</span>
        </div>
        <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui">
          Australia&apos;s residential tendering marketplace
        </span>
      </motion.footer>

      {/* Scanline sweep */}
      <Scanline />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Countdown hook — live ticks once per second
   ────────────────────────────────────────────────────────────────── */

function useCountdown(targetMs: number) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diffMs = Math.max(0, targetMs - now);
  return {
    days: Math.floor(diffMs / 86_400_000),
    hours: Math.floor((diffMs % 86_400_000) / 3_600_000),
    minutes: Math.floor((diffMs % 3_600_000) / 60_000),
    seconds: Math.floor((diffMs % 60_000) / 1000),
    isLaunched: diffMs <= 0,
  };
}

/* ──────────────────────────────────────────────────────────────────
   AnimatedDigits — counts up from 0 to target on mount with easing,
   then crossfades on subsequent value changes
   ────────────────────────────────────────────────────────────────── */

function AnimatedDigits({
  target,
  className,
  style,
}: {
  target: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.floor(v));
  const [display, setDisplay] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Only do the dramatic count-up once. On subsequent updates
    // (the countdown ticking each minute / day) just snap.
    if (!hasMounted) {
      const controls = animate(motionValue, target, {
        duration: 1.4,
        ease: [0.32, 0.72, 0, 1],
      });
      const unsub = rounded.on("change", (v) => setDisplay(v));
      setHasMounted(true);
      return () => {
        controls.stop();
        unsub();
      };
    } else {
      setDisplay(target);
    }
  }, [target, motionValue, rounded, hasMounted]);

  const str = String(display);

  return (
    <span className={className} style={style}>
      {str.split("").map((d, i) => (
        <AnimatePresence key={`pos-${i}`} mode="popLayout">
          <motion.span
            key={`${i}-${d}`}
            initial={{ y: "60%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-60%", opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            className="inline-block"
          >
            {d}
          </motion.span>
        </AnimatePresence>
      ))}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────
   TickCell — small live-ticking unit (hours / minutes / seconds)
   ────────────────────────────────────────────────────────────────── */

function TickCell({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, "0");
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={str}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -6, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="inline-block text-text font-semibold"
        >
          {str}
        </motion.span>
      </AnimatePresence>
      <span className="text-text-faint text-[10px]">{label}</span>
    </span>
  );
}

function Dot() {
  return <span className="text-text-faint">·</span>;
}

/* ──────────────────────────────────────────────────────────────────
   BracketsTight — corner brackets framing the "2.0", scaled down
   for a tighter "viewfinder" feel than the page-wide variant
   ────────────────────────────────────────────────────────────────── */

function BracketsTight() {
  const size = 22;
  const stroke = "1px solid rgba(0,212,200,0.45)";
  const inset = -10;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      <span
        className="absolute"
        style={{
          top: inset,
          left: inset,
          width: size,
          height: size,
          borderTop: stroke,
          borderLeft: stroke,
        }}
      />
      <span
        className="absolute"
        style={{
          top: inset,
          right: inset,
          width: size,
          height: size,
          borderTop: stroke,
          borderRight: stroke,
        }}
      />
      <span
        className="absolute"
        style={{
          bottom: inset,
          left: inset,
          width: size,
          height: size,
          borderBottom: stroke,
          borderLeft: stroke,
        }}
      />
      <span
        className="absolute"
        style={{
          bottom: inset,
          right: inset,
          width: size,
          height: size,
          borderBottom: stroke,
          borderRight: stroke,
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Background — composed grid + aurora blobs + noise. Each layer is
   z-0 and pointer-events-none so they never interfere with input.
   ────────────────────────────────────────────────────────────────── */

function Background() {
  return (
    <>
      {/* Blueprint grid, radial-masked */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 0.035) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.035) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 40%, black 25%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 40%, black 25%, transparent 80%)",
        }}
      />

      {/* Teal aurora — top center */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0.45, 0.65, 0.45], scale: [1, 1.06, 1] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 left-1/2 -translate-x-1/2 size-[560px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.28) 0%, transparent 65%)",
        }}
      />

      {/* Violet aurora — bottom left */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-20 -left-20 size-[440px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(120,90,255,0.22) 0%, transparent 65%)",
        }}
      />

      {/* Faint amber spark — bottom right, smaller */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-12 -right-12 size-[320px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,180,80,0.18) 0%, transparent 65%)",
        }}
      />

      {/* SVG noise overlay */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
        }}
      />
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Scanline — a thin teal-tinted horizontal line that sweeps top→bottom
   every ~10s. Adds "live broadcast / system online" energy.
   ────────────────────────────────────────────────────────────────── */

function Scanline() {
  return (
    <motion.div
      aria-hidden
      initial={{ y: "-10%", opacity: 0 }}
      animate={{ y: "110%", opacity: [0, 0.35, 0] }}
      transition={{
        duration: 9.5,
        repeat: Infinity,
        ease: "linear",
        delay: 1.5,
      }}
      className="pointer-events-none absolute left-0 right-0 z-[1] h-[140px]"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, rgba(0,212,200,0.06) 30%, rgba(0,212,200,0.18) 50%, rgba(0,212,200,0.06) 70%, transparent 100%)",
        mixBlendMode: "screen",
      }}
    />
  );
}
