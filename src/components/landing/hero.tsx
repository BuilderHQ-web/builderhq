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
import { BuildingReveal } from "./building-reveal";

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
      className="relative isolate pt-16 lg:pt-32 pb-10 lg:pb-32 px-5 md:px-12 lg:px-20 xl:px-28 overflow-hidden"
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

      <div className="mx-auto max-w-[1280px] grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4 sm:gap-10 lg:gap-20 items-center">
        {/* Visual — building reveal. Order is intentional: on mobile +
            tablet (single-column) the visual leads, just like Resend's
            cube-on-top hero. On desktop (lg grid) it sits on the
            right via `lg:order-2` so the headline reads first L→R. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center order-1 lg:order-2 mt-1 sm:mt-2 lg:mt-0"
        >
          <BuildingReveal />
        </motion.div>

        {/* Copy. Centred on mobile + tablet, left-aligned on desktop. */}
        <div
          className="text-center lg:text-left order-2 lg:order-1"
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

          {/* Headline — Instrument Serif. Bigger than the section
              headlines (this is THE hero) and "In days." gets the
              same accent-italic gradient treatment (now with a more
              dominant teal). font-weight 500 nudges Instrument Serif
              slightly heavier via faux-bold so the whole headline
              feels more present. */}
          <h1
            className="mt-4 lg:mt-8 tracking-[-0.02em] leading-[1.02] text-[clamp(3rem,6vw+1rem,6.25rem)]"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}
          >
            <FadeRow delay={0}>
              <span className="block">Tender your build.</span>
            </FadeRow>
            <FadeRow delay={0.12}>
              <span className="block accent-italic">In days.</span>
            </FadeRow>
          </h1>

          {/* Subhead — short, declarative. No em dashes. */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 lg:mt-9 mx-auto lg:mx-0 max-w-[32rem] text-[15px] sm:text-[17px] leading-[1.55] text-text-subtle"
          >
            Upload your plans. We match verified builders. You pick the winner.
          </motion.p>

          {/* Primary CTA + ghost secondary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 lg:mt-10 flex flex-col items-stretch lg:items-start sm:flex-row sm:items-center sm:justify-center lg:justify-start gap-3 sm:gap-5"
          >
            <Link
              href={cta.primary.href}
              className={cn(
                "group inline-flex items-center justify-center gap-2 h-[52px] sm:h-12 px-7 rounded-full",
                "bg-accent text-accent-contrast text-[15px] sm:text-[14px] font-semibold tracking-[0.01em]",
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

// ── HeroCube — 6-faced 3D rotating product preview ────────────────

/**
 * The hero centrepiece. A true 3D cube with six BuilderHQ product
 * faces, slowly auto-rotating around the Y axis at a -16° tilt so
 * the top face is partially visible. Hover pauses the rotation and
 * the cursor controls a responsive tilt — like grabbing a tangible
 * object.
 *
 * Built with pure CSS 3D transforms (`transform: rotateX/Y` +
 * `transform-style: preserve-3d` + `backface-visibility: hidden`).
 * Driven by an imperative requestAnimationFrame loop — the same
 * proven-stable pattern from HowItWorks v4. No Motion useScroll
 * hooks in the rotation path, zero production crash surface.
 *
 * Six faces, in rotation order (front first, then right, back,
 * left as the cube spins; top + bottom visible at the tilt):
 *
 *   front   Tender comparison bars (3 builders, winner highlighted)
 *   right   Verified builder profile (avatar, ABN+L checks)
 *   back    Project pulse KPIs (4 tiles)
 *   left    Live activity feed (recent events)
 *   top     Floor plan thumbnail (SVG architectural sketch)
 *   bottom  Awarded state (trophy + signed contract)
 *
 * Sized through the `--cube-size` CSS variable so the cube responds
 * to breakpoint changes purely from CSS — no resize listeners,
 * no rerenders.
 */
function HeroCube() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);
  const hoveringRef = useRef(false);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let raf = 0;
    let lastTime = performance.now();
    let autoY = -22;
    let currentX = -16;
    let currentY = autoY;

    const update = (now: number) => {
      raf = requestAnimationFrame(update);
      const delta = now - lastTime;
      lastTime = now;

      let targetX: number;
      let targetY: number;

      if (hoveringRef.current) {
        // Mouse controls tilt. Auto-rotate frozen so the cube
        // doesn't drift while the user is inspecting it.
        targetX = -16 + mouseRef.current.y * -22;
        targetY = autoY + mouseRef.current.x * 38;
      } else {
        // Auto-rotate — about 18 degrees per second on Y.
        autoY += delta * 0.018;
        targetX = -16;
        targetY = autoY;
      }

      // Lerp toward target — smooth transitions between modes.
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;

      const cube = cubeRef.current;
      if (cube) {
        cube.style.transform = `rotateX(${currentX}deg) rotateY(${currentY}deg)`;
      }
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
    };
  };

  return (
    <div
      ref={sceneRef}
      onMouseEnter={() => {
        hoveringRef.current = true;
      }}
      onMouseLeave={() => {
        hoveringRef.current = false;
        mouseRef.current = { x: 0, y: 0 };
      }}
      onMouseMove={handleMouseMove}
      className={cn(
        "relative mx-auto",
        // Cube size — CSS variable adjusts at breakpoints.
        "[--cube-size:240px] sm:[--cube-size:300px] lg:[--cube-size:400px]",
      )}
      style={{
        width: "var(--cube-size)",
        height: "var(--cube-size)",
        perspective: 1400,
        cursor: "grab",
      }}
    >
      {/* Ambient halo behind the cube. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-16 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.22) 0%, rgba(0,212,200,0.06) 32%, transparent 65%)",
        }}
      />

      {/* Soft floor shadow — ellipse below the cube. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{
          width: "calc(var(--cube-size) * 0.85)",
          height: "calc(var(--cube-size) * 0.08)",
          bottom: "calc(var(--cube-size) * -0.18)",
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)",
          filter: "blur(14px)",
        }}
      />

      {/* The cube. */}
      <div
        ref={cubeRef}
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform",
          transform: "rotateX(-16deg) rotateY(-22deg)",
        }}
      >
        <CubeFace position="front">
          <FaceTender />
        </CubeFace>
        <CubeFace position="back">
          <FacePulse />
        </CubeFace>
        <CubeFace position="right">
          <FaceVerified />
        </CubeFace>
        <CubeFace position="left">
          <FaceActivity />
        </CubeFace>
        <CubeFace position="top">
          <FaceFloor />
        </CubeFace>
        <CubeFace position="bottom">
          <FaceAward />
        </CubeFace>
      </div>
    </div>
  );
}

// ── Cube face shell ──────────────────────────────────────────────

type CubePosition = "front" | "back" | "right" | "left" | "top" | "bottom";

function CubeFace({
  position,
  children,
}: {
  position: CubePosition;
  children: React.ReactNode;
}) {
  const half = "calc(var(--cube-size) / 2)";
  const transforms: Record<CubePosition, string> = {
    front: `translateZ(${half})`,
    back: `rotateY(180deg) translateZ(${half})`,
    right: `rotateY(90deg) translateZ(${half})`,
    left: `rotateY(-90deg) translateZ(${half})`,
    top: `rotateX(90deg) translateZ(${half})`,
    bottom: `rotateX(-90deg) translateZ(${half})`,
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        transform: transforms[position],
        backfaceVisibility: "hidden",
        background:
          "linear-gradient(155deg, rgba(8,28,42,0.97) 0%, rgba(4,14,24,0.99) 100%)",
        border: "1px solid rgba(0,212,200,0.20)",
        borderRadius: 14,
        boxShadow:
          "inset 0 1px 0 0 rgba(255,255,255,0.06), inset 0 -1px 0 0 rgba(0,0,0,0.4)",
      }}
    >
      {/* Top edge hairline — catches "light". */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 inset-x-3 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.5), transparent)",
        }}
      />
      {/* Soft corner glow. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.20), transparent 70%)",
        }}
      />
      <div className="relative w-full h-full p-4 sm:p-5 flex flex-col">
        {children}
      </div>
    </div>
  );
}

// ── Face contents ────────────────────────────────────────────────

function FaceHeader({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[rgba(255,255,255,0.06)]">
      <span className="inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.16em] uppercase font-semibold text-text-muted">
        {left}
      </span>
      {right ? (
        <span className="text-[9.5px] tracking-[0.16em] uppercase font-semibold text-accent-light">
          {right}
        </span>
      ) : null}
    </div>
  );
}

// Front — tender comparison bars
function FaceTender() {
  return (
    <>
      <FaceHeader
        left={
          <>
            <Activity size={10} strokeWidth={2.4} />
            Tender
          </>
        }
        right="3 received"
      />
      <div className="flex-1 flex flex-col justify-center gap-2.5 mt-2">
        <TenderBar name="Atlas Build Co" price="$1.78M" pct={88} note="-4% median" />
        <TenderBar name="Northline Builders" price="$1.86M" pct={94} note="median" winner />
        <TenderBar name="Heritage Group" price="$1.91M" pct={97} note="+3% median" />
      </div>
      <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[9.5px] uppercase tracking-[0.16em]">
        <span className="text-text-dim">Spread 7%</span>
        <span className="text-accent-light font-semibold">Tight</span>
      </div>
    </>
  );
}

function TenderBar({
  name,
  price,
  pct,
  note,
  winner,
}: {
  name: string;
  price: string;
  pct: number;
  note: string;
  winner?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[10.5px] truncate",
            winner ? "text-text font-semibold" : "text-text-muted",
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            "text-[10px] font-mono tabular-nums shrink-0",
            winner ? "text-accent-light font-semibold" : "text-text-muted",
          )}
        >
          {price}
        </span>
      </div>
      <div className="relative h-1 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            winner
              ? "bg-accent shadow-[0_0_6px_rgba(0,212,200,0.55)]"
              : "bg-[rgba(255,255,255,0.15)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[8.5px] tracking-[0.04em]",
          winner ? "text-accent-light" : "text-text-dim",
        )}
      >
        {note}
      </span>
    </div>
  );
}

// Back — project pulse KPIs
function FacePulse() {
  return (
    <>
      <FaceHeader
        left={
          <>
            <Activity size={10} strokeWidth={2.4} />
            Project pulse
          </>
        }
        right="live"
      />
      <div className="flex-1 grid grid-cols-2 gap-2 mt-2">
        <PulseStat label="Tenders" value="3" sub="2 unique" />
        <PulseStat label="Median" value="$1.86M" sub="$1.78M to $1.91M" />
        <PulseStat label="Verified" value="100%" sub="ABN + L" accent />
        <PulseStat label="Spread" value="7%" sub="Tight" accent />
      </div>
    </>
  );
}

function PulseStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.018)] p-2.5 flex flex-col justify-between">
      <div className="text-[8.5px] tracking-[0.18em] uppercase text-text-dim">
        {label}
      </div>
      <div
        className={cn(
          "font-mono tabular-nums leading-none mt-1",
          accent ? "text-accent-light" : "text-text",
        )}
        style={{ fontSize: 17 }}
      >
        {value}
      </div>
      <div className="text-[8.5px] text-text-dim mt-1.5">{sub}</div>
    </div>
  );
}

// Right — verified builder profile
function FaceVerified() {
  return (
    <>
      <FaceHeader
        left={
          <>
            <ShieldCheck size={10} strokeWidth={2.4} />
            Verified
          </>
        }
        right="ABN + L"
      />
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2.5 mt-2">
        <div
          className="size-14 rounded-full flex items-center justify-center text-[15px] font-bold text-accent-contrast shadow-[0_0_0_2px_rgba(0,212,200,0.4),0_0_24px_-2px_rgba(0,212,200,0.5)]"
          style={{
            background:
              "linear-gradient(135deg, #7ef5ed, #00d4c8 50%, #1a5fd4)",
          }}
        >
          NB
        </div>
        <div>
          <div className="text-[13px] font-semibold text-text">
            Northline Builders
          </div>
          <div className="text-[9.5px] text-text-dim mt-0.5">
            Brunswick · 4 km
          </div>
        </div>
        <div className="flex flex-col gap-1 text-left mt-0.5">
          <VerifyCheck label="ABN active" />
          <VerifyCheck label="Builder licence" />
          <VerifyCheck label="Insurance current" />
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)] text-center text-[9px] uppercase tracking-[0.16em] text-text-dim">
        12 won · 100% on-time
      </div>
    </>
  );
}

function VerifyCheck({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
      <CheckCircle2
        size={10}
        strokeWidth={2.5}
        className="text-accent-light shrink-0"
      />
      {label}
    </div>
  );
}

// Left — live activity feed
function FaceActivity() {
  return (
    <>
      <FaceHeader
        left={
          <>
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative size-1.5 rounded-full bg-accent" />
            </span>
            Activity
          </>
        }
        right="3 now"
      />
      <div className="flex-1 flex flex-col justify-center gap-2.5 mt-2">
        <ActivityRow
          time="2m"
          actor="Northline"
          action="submitted $1.86M tender"
        />
        <ActivityRow
          time="18m"
          actor="Atlas"
          action="unlocked Brunswick project"
        />
        <ActivityRow time="1h" actor="Heritage" action="matched 3 projects" />
        <ActivityRow time="2h" actor="Chen" action="completed verification" />
      </div>
    </>
  );
}

function ActivityRow({
  time,
  actor,
  action,
}: {
  time: string;
  actor: string;
  action: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-[9px] font-mono tabular-nums text-text-dim mt-0.5 w-6 shrink-0">
        {time}
      </span>
      <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0 shadow-[0_0_6px_rgba(0,212,200,0.5)]" />
      <div className="text-[10.5px] leading-[1.4]">
        <span className="text-text font-semibold">{actor}</span>{" "}
        <span className="text-text-dim">{action}</span>
      </div>
    </div>
  );
}

// Top — floor plan SVG
function FaceFloor() {
  return (
    <>
      <FaceHeader
        left={
          <>
            <Files size={10} strokeWidth={2.4} />
            Floor plan
          </>
        }
        right="450 m²"
      />
      <div className="flex-1 flex items-center justify-center mt-2 mb-2">
        <svg
          viewBox="0 0 200 160"
          className="w-full h-full max-h-[140px]"
          fill="none"
          stroke="rgba(126,245,237,0.55)"
          strokeWidth="1.5"
        >
          {/* Outer walls */}
          <rect x="10" y="10" width="180" height="140" />
          {/* Interior walls */}
          <line x1="100" y1="10" x2="100" y2="80" />
          <line x1="10" y1="80" x2="190" y2="80" />
          <line x1="60" y1="80" x2="60" y2="150" />
          <line x1="130" y1="80" x2="130" y2="150" />
          {/* Door openings — match the face background to "cut" the wall */}
          <line
            x1="55"
            y1="10"
            x2="65"
            y2="10"
            stroke="rgba(8,28,42,0.97)"
            strokeWidth="3"
          />
          <line
            x1="95"
            y1="80"
            x2="105"
            y2="80"
            stroke="rgba(8,28,42,0.97)"
            strokeWidth="3"
          />
          <line
            x1="55"
            y1="80"
            x2="65"
            y2="80"
            stroke="rgba(8,28,42,0.97)"
            strokeWidth="3"
          />
          {/* Room labels */}
          <text
            x="55"
            y="50"
            fill="rgba(255,255,255,0.5)"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="middle"
          >
            BED 1
          </text>
          <text
            x="145"
            y="50"
            fill="rgba(255,255,255,0.5)"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="middle"
          >
            BED 2
          </text>
          <text
            x="35"
            y="120"
            fill="rgba(255,255,255,0.5)"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="middle"
          >
            LIVING
          </text>
          <text
            x="95"
            y="120"
            fill="rgba(255,255,255,0.5)"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="middle"
          >
            KITCHEN
          </text>
          <text
            x="160"
            y="120"
            fill="rgba(255,255,255,0.5)"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="middle"
          >
            DECK
          </text>
        </svg>
      </div>
      <div className="text-center text-[9px] uppercase tracking-[0.16em] text-text-dim border-t border-[rgba(255,255,255,0.06)] pt-2">
        45 Sydney Rd · Brunswick VIC
      </div>
    </>
  );
}

// Bottom — awarded
function FaceAward() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-2.5">
      <div
        className="size-12 rounded-full flex items-center justify-center text-accent-light shadow-[0_0_0_2px_rgba(0,212,200,0.4),0_0_28px_rgba(0,212,200,0.55)]"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.25) 0%, rgba(0,212,200,0.05) 70%)",
          border: "1px solid rgba(0,212,200,0.5)",
        }}
      >
        <Trophy size={20} strokeWidth={1.8} />
      </div>
      <div>
        <div className="text-[9px] tracking-[0.22em] uppercase text-accent-light font-semibold mb-1">
          Awarded
        </div>
        <div className="text-[13px] font-semibold text-text">
          Northline Builders
        </div>
        <div className="text-[11px] text-text-dim mt-1 font-mono tabular-nums">
          $1.86M
        </div>
      </div>
      <div className="text-[9px] text-text-dim border-t border-[rgba(255,255,255,0.06)] pt-2 mt-1 w-full uppercase tracking-[0.16em]">
        Contract signed · Sep 26
      </div>
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
