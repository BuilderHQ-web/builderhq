"use client";

/**
 * Mock primitives — the friendly little UI language the landing's
 * product scenes are built from. Deliberately un-techy: generous
 * radii, spacious rows, plain words, one accent at a time. Every
 * scene in scenes.tsx composes these.
 */

import * as React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* Stagger variants — scenes set the parent, rows just declare `item`. */
export const sceneVariants = {
  from: { opacity: 0, y: 14 },
  in: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE, staggerChildren: 0.08, delayChildren: 0.05 },
  },
  out: { opacity: 0, y: -10, transition: { duration: 0.18, ease: "easeIn" as const } },
};

export const itemVariants = {
  from: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE } },
};

export function MockItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/** Window frame: dots, a plain title, optional live dot. */
export function Frame({
  title,
  live,
  accent,
  children,
  toast,
}: {
  title: string;
  live?: boolean;
  accent: string;
  children: React.ReactNode;
  /** Optional looping toast rendered over the top-right of the frame. */
  toast?: React.ReactNode;
}) {
  return (
    <div
      className="relative w-full rounded-2xl border overflow-hidden"
      style={{
        borderColor: "rgba(255,255,255,0.09)",
        background: "linear-gradient(180deg, rgba(13,28,44,0.92), rgba(6,14,24,0.97))",
        boxShadow: `0 30px 70px -34px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <div className="flex items-center justify-between px-4.5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex gap-1.5 shrink-0" aria-hidden>
            <i className="size-2 rounded-full bg-[#ff5f57]" />
            <i className="size-2 rounded-full bg-[#febc2e]" />
            <i className="size-2 rounded-full bg-[#28c840]" />
          </span>
          <span className="text-[11.5px] font-medium text-text-muted truncate">{title}</span>
        </div>
        {live ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.08em] uppercase" style={{ color: accent }}>
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: accent, opacity: 0.7 }} />
              <span className="relative size-1.5 rounded-full" style={{ background: accent }} />
            </span>
            Live
          </span>
        ) : null}
      </div>
      <div className="p-4 sm:p-5 flex flex-col gap-2.5">{children}</div>
      {toast}
    </div>
  );
}

/** A friendly list row. */
export function Row({
  icon,
  title,
  sub,
  right,
  accent,
  highlight,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  accent?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
      style={{
        borderColor: highlight && accent ? accent + "45" : "rgba(255,255,255,0.06)",
        background: highlight && accent ? accent + "0f" : "rgba(255,255,255,0.028)",
      }}
    >
      {icon ? (
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: (accent ?? "#7ef5ed") + "1a", color: accent ?? "#7ef5ed" }}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-text leading-tight truncate">{title}</p>
        {sub ? <p className="mt-0.5 text-[11px] text-text-dim leading-tight truncate">{sub}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

/** Tiny status pill. */
export function Pill({
  children,
  accent,
  solid,
}: {
  children: React.ReactNode;
  accent: string;
  solid?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[9.5px] font-semibold tracking-[0.06em] uppercase whitespace-nowrap"
      style={
        solid
          ? { background: accent, color: "#04141c" }
          : { background: accent + "16", color: accent, border: `1px solid ${accent}40` }
      }
    >
      {children}
    </span>
  );
}

/** Verified tick chip — the platform's signature mark. */
export function Tick({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full pl-1 pr-2 py-[2.5px] text-[10px] font-medium"
      style={{ background: accent + "14", color: accent }}
    >
      <span className="inline-flex size-3.5 items-center justify-center rounded-full" style={{ background: accent + "28" }}>
        <Check className="size-2.5" strokeWidth={3.5} />
      </span>
      {label}
    </span>
  );
}

/** Primary action button (always brand teal — the one action colour). */
export function MockButton({ children, ghost }: { children: React.ReactNode; ghost?: boolean }) {
  return (
    <span
      className={
        ghost
          ? "inline-flex items-center justify-center h-9 px-4 rounded-full border border-white/12 text-[12px] font-semibold text-text-muted"
          : "inline-flex items-center justify-center h-9 px-4 rounded-full bg-accent text-accent-contrast text-[12px] font-semibold shadow-[0_6px_18px_-6px_rgba(0,212,200,0.55)]"
      }
    >
      {children}
    </span>
  );
}

/** Looping toast — the "something just happened" life signal. */
export function LoopToast({
  icon,
  text,
  accent,
  delay = 1.2,
}: {
  icon: React.ReactNode;
  text: string;
  accent: string;
  delay?: number;
}) {
  return (
    <motion.div
      aria-hidden
      className="absolute top-12 right-3.5 flex items-center gap-2 rounded-xl border px-3 py-2 pointer-events-none"
      style={{
        borderColor: accent + "45",
        background: "rgba(7,17,28,0.96)",
        boxShadow: `0 14px 34px -14px ${accent}80`,
      }}
      initial={{ opacity: 0, y: 8, x: 6 }}
      animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -8], x: [6, 0, 0, 0] }}
      transition={{
        duration: 4.6,
        times: [0, 0.12, 0.82, 1],
        delay,
        repeat: Infinity,
        repeatDelay: 3.4,
        ease: EASE,
      }}
    >
      <span className="inline-flex size-6 items-center justify-center rounded-full" style={{ background: accent + "1f", color: accent }}>
        {icon}
      </span>
      <span className="text-[11.5px] font-medium" style={{ color: "#e9f1f9" }}>{text}</span>
    </motion.div>
  );
}

/** Soft bar chart for the market-update scene. */
export function Bars({ accent }: { accent: string }) {
  const bars = [34, 52, 41, 66, 58, 78];
  return (
    <div className="flex items-end gap-2 h-[72px] px-1">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="flex-1 rounded-t-md"
          style={{ background: `linear-gradient(180deg, ${accent}cc, ${accent}22)` }}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 + i * 0.07 }}
        />
      ))}
    </div>
  );
}
