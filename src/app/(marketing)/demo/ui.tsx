"use client";

/**
 * The demo's shared primitives: everything a scripted surface needs
 * that is not specific to one script. The homeowner and architect
 * demos both build their screens from these, so the two feel like
 * one product rather than two demos.
 */

import * as React from "react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Landmark, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export const EASE = [0.22, 1, 0.36, 1] as const;

export interface SurfaceProps {
  /** Index of the CURRENT step within this surface's stage. */
  stepIdx: number;
  /** The current click step's target, spotlit with a pulse. */
  spot: string | null;
  /** The current note step's target, ringed softly. */
  soft: string | null;
  /** Fired by the surface's real controls. */
  onAction: (target: string) => void;
  reduceMotion: boolean;
}

/** The pulsing halo for the control a click beat asks for. Carries
 *  the anchor id so the engine's callout can sit right beside it.
 *  It never scrolls: the engine is the one scroll authority, on
 *  desktop through the callout's measure and on phones through the
 *  step effect, so the page cannot be pulled two ways at once. */
export function Spot({
  id,
  active,
  children,
  className,
  reduceMotion,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
  reduceMotion?: boolean;
}) {
  return (
    <span
      data-demo-target={id}
      className={cn("relative inline-flex", className)}
    >
      {active ? (
        <motion.span
          aria-hidden
          className="absolute -inset-[6px] rounded-[14px] border-2 border-accent pointer-events-none"
          initial={{ opacity: 0.9, scale: 1 }}
          animate={
            reduceMotion
              ? { opacity: 0.9 }
              : { opacity: [0.9, 0.35, 0.9], scale: [1, 1.035, 1] }
          }
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 0 6px rgba(0,212,200,0.14)" }}
        />
      ) : null}
      {children}
    </span>
  );
}

/** The quiet ring a note beat draws around the block it explains. */
export function softRing(active: boolean): string {
  return active
    ? "ring-2 ring-[rgba(0,166,155,0.45)] ring-offset-2 ring-offset-bg"
    : "";
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
      {children}
    </p>
  );
}

export function Card({
  children,
  className,
  target,
}: {
  children: React.ReactNode;
  className?: string;
  target?: string;
}) {
  return (
    <div
      data-demo-target={target}
      className={cn(
        "rounded-lg border border-border-subtle bg-surface-1 card-elev transition-shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TealButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] transition-colors",
        disabled
          ? "opacity-40 cursor-default"
          : "hover:bg-accent-hover shadow-[0_0_0_1px_rgba(0,212,200,0.35),_0_10px_28px_-12px_rgba(0,212,200,0.45)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Count-up that runs while `active`; settled cases derive. */
export function useCountUp(
  target: number,
  active: boolean,
  settled: boolean,
  durationMs: number,
  reduceMotion: boolean,
) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    if (!active || settled || reduceMotion) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimated(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, settled, durationMs, reduceMotion]);
  if (settled || (active && reduceMotion)) return target;
  return active ? animated : 0;
}

/* ── the close screen, shared by every script ───────────────────────── */

export interface CloseCopy {
  kicker: string;
  title: string;
  recap: string[];
  truth: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}

export function CloseSurface({
  reduceMotion,
  onPrimary,
  close,
  disclaimer,
}: {
  reduceMotion: boolean;
  onPrimary: () => void;
  close: CloseCopy;
  disclaimer: string;
}) {
  return (
    <div className="max-w-[560px] mx-auto text-center pt-6 sm:pt-14">
      <div className="relative mx-auto size-[84px]" aria-hidden>
        <svg viewBox="0 0 92 92" className="absolute inset-0">
          <circle cx="46" cy="46" r="43" fill="none" stroke="rgba(24,34,44,0.08)" strokeWidth="2" />
          <motion.circle
            cx="46" cy="46" r="43" fill="none" stroke="#00a69b" strokeWidth="2"
            strokeLinecap="round" transform="rotate(-90 46 46)"
            initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: EASE }}
          />
          <motion.path
            d="M32 47.5 L42 57.5 L61 37.5" fill="none" stroke="#0a7d73"
            strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
            initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.9, ease: EASE }}
          />
        </svg>
      </div>

      <p className="mt-6 text-[10px] tracking-[0.3em] uppercase text-accent-light font-ui font-semibold">
        {close.kicker}
      </p>
      <h2 className="mt-3 font-ui font-semibold tracking-[-0.03em] text-[30px] sm:text-[38px] leading-[1.08] text-text">
        {close.title}
      </h2>

      <ul className="mt-6 space-y-2 text-left inline-block">
        {close.recap.map((r, i) => (
          <motion.li
            key={r}
            initial={reduceMotion ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.5 + i * 0.15, ease: EASE }}
            className="flex items-start gap-2.5 text-[13.5px] text-text-muted"
          >
            <Check className="size-4 text-accent-light shrink-0 mt-[2px]" />
            {r}
          </motion.li>
        ))}
      </ul>

      <p className="mt-6 text-[13.5px] leading-[1.75] text-text-muted max-w-[46ch] mx-auto">
        <Sparkles className="inline size-3.5 text-accent-light mr-1 align-[-2px]" />
        {close.truth}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href={close.primary.href}
          onClick={onPrimary}
          className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] transition-colors hover:bg-accent-hover shadow-[0_0_0_1px_rgba(0,212,200,0.35),_0_10px_28px_-12px_rgba(0,212,200,0.45)]"
        >
          {close.primary.label}
          <ArrowRight className="size-4" />
        </a>
        <a
          href={close.secondary.href}
          className="text-[12.5px] text-text-dim hover:text-text transition-colors"
        >
          {close.secondary.label}
        </a>
      </div>

      <p className="mt-10 text-[11px] text-text-muted inline-flex items-center gap-1.5">
        <Landmark className="size-3" />
        {disclaimer}
      </p>
    </div>
  );
}
