"use client";

/**
 * Scene kit — the atoms every product scene on the how-it-works deck is
 * built from.
 *
 * These are miniatures of the real app, so every value here is lifted
 * from what the app actually renders rather than invented to look like
 * it. The source of truth is the @theme block in globals.css and the
 * TONE table the evaluation surface defines for itself.
 *
 * Two rules carried over from the app and easy to break by accident:
 *
 *   · Bright teal #00d4c8 is a FILL. As type on paper it measures
 *     1.76:1 and fails. Teal type is #0a7d73, everywhere, always.
 *   · Cards are warm paper #fbf9f4 on a warm canvas #f4f1ea, not white
 *     on grey. Rules between rows are almost invisible on purpose.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import type { LucideIcon } from "lucide-react";

import { Logo } from "@/components/brand/logo";

/* ── The palette, straight out of globals.css ────────────────────── */

export const C = {
  canvas: "#f4f1ea",   // --color-bg
  paper: "#fbf9f4",    // --color-surface-1, the card fill
  paper2: "#f6f3ec",   // --color-surface-2
  ink: "#161c22",      // --color-text
  muted: "#48535d",    // --color-text-muted
  dim: "#78828d",      // --color-text-dim
  faint: "rgba(22,28,34,0.46)",
  line: "rgba(24,34,44,0.10)",   // --color-border-subtle
  line2: "rgba(24,34,44,0.14)",  // --color-border
  line3: "rgba(24,34,44,0.22)",  // --color-border-strong
  wash: "rgba(24,34,44,0.025)",  // the ink wash rows sit on
  teal: "#00d4c8",     // --color-accent, FILL ONLY
  tealInk: "#0a7d73",  // --color-accent-light, teal as type
  tealLine: "rgba(9,148,137,0.35)",
  tealWash: "rgba(0,212,200,0.06)",
  tealMuted: "rgba(9,148,137,0.12)",
  onTeal: "#031118",   // --color-accent-contrast
  blue: "#2d63d6",
} as const;

/** The editorial tone table the evaluation surface defines at
 *  owner/projects/[slug]/tenders/evaluation-ui.tsx:95. The app uses this
 *  rather than the semantic success/warning tokens, so the scenes do too. */
export const TONE = {
  good: { text: "#0a7d73", bg: "rgba(0,166,155,0.10)", border: "rgba(0,166,155,0.28)" },
  warn: { text: "#8a6414", bg: "rgba(217,164,65,0.14)", border: "rgba(217,164,65,0.34)" },
  risk: { text: "#a8433e", bg: "rgba(168,67,62,0.10)", border: "rgba(168,67,62,0.30)" },
  ink: { text: "#18222c", bg: "rgba(24,34,44,0.05)", border: "rgba(24,34,44,0.14)" },
} as const;

export type ToneKey = keyof typeof TONE;

/** The card shadow the app uses. Barely there, but it is the difference
 *  between paper resting on the canvas and paper printed onto it. */
export const ELEV = "0 1px 2px rgba(24,34,44,0.04), 0 8px 20px -14px rgba(24,34,44,0.18)";

/* ── Chrome ──────────────────────────────────────────────────────── */

/**
 * The app window. Topbar with the wordmark and a breadcrumb, then the
 * canvas. `pad` off lets a scene bleed to the edges, which the register
 * and evaluation screens need.
 */
export function Frame({
  crumb,
  avatar = "AV",
  right,
  children,
  overlay,
}: {
  crumb: string;
  avatar?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: C.canvas }}>
      <div
        className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b shrink-0"
        style={{ borderColor: C.line2, background: C.paper }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo height={16} tone="dark" />
          <span className="text-[11.5px] truncate" style={{ color: C.dim }}>/ {crumb}</span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {right}
          <span
            className="size-[26px] rounded-full text-[9.5px] font-bold inline-flex items-center justify-center"
            style={{ background: C.tealMuted, color: C.tealInk }}
          >
            {avatar}
          </span>
        </div>
      </div>
      <div className="relative flex-1 min-h-0 p-4 sm:p-5 overflow-hidden flex flex-col gap-2.5">
        {children}
      </div>
      {overlay}
    </div>
  );
}

/** A card on the canvas: warm paper, hairline, the faintest lift. */
export function Card({
  children,
  className = "",
  tone,
  style,
  cursorKey,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "plain" | "accent" | "wash";
  style?: React.CSSProperties;
  cursorKey?: string;
}) {
  const skin =
    tone === "accent"
      ? { borderColor: C.tealLine, background: "rgba(0,212,200,0.05)" }
      : tone === "wash"
        ? { borderColor: C.line, background: C.wash }
        : { borderColor: C.line, background: C.paper, boxShadow: ELEV };
  return (
    <div data-cursor={cursorKey} className={"rounded-lg border " + className} style={{ ...skin, ...style }}>
      {children}
    </div>
  );
}

/** 10px uppercase teal, the app's section label. */
export function Kicker({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <p
      className="inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.22em] uppercase font-semibold"
      style={{ color: C.tealInk }}
    >
      {Icon ? <Icon className="size-3 shrink-0" strokeWidth={2.2} /> : null}
      {children}
    </p>
  );
}

/** The stat tile from the app's stats bands. */
export function Stat({ v, l, tone = "ink" }: { v: string; l: string; tone?: ToneKey }) {
  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: C.line, background: C.paper }}>
      <p
        className="font-ui font-semibold text-[17px] leading-none tabular-nums"
        style={{ color: tone === "ink" ? C.ink : TONE[tone].text }}
      >
        {v}
      </p>
      <p className="mt-1.5 text-[9px] uppercase tracking-[0.1em]" style={{ color: C.dim }}>{l}</p>
    </div>
  );
}

/** The app's small status pill. */
export function Pill({
  children,
  tone = "good",
  solid,
}: {
  children: React.ReactNode;
  tone?: ToneKey;
  solid?: boolean;
}) {
  const t = TONE[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-[3px] text-[9px] tracking-[0.08em] uppercase font-bold whitespace-nowrap"
      style={
        solid
          ? { borderColor: "transparent", background: C.teal, color: C.onTeal }
          : { borderColor: t.border, background: t.bg, color: t.text }
      }
    >
      {children}
    </span>
  );
}

/** The teal action button. Bright teal plate, near-black type. */
export function TealBtn({ children, cursorKey }: { children: React.ReactNode; cursorKey?: string }) {
  return (
    <span
      data-cursor={cursorKey}
      className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full text-[11.5px] font-bold"
      style={{ background: C.teal, color: C.onTeal }}
    >
      {children}
    </span>
  );
}

/** An outline button, the app's secondary. */
export function GhostBtn({
  children,
  cursorKey,
  hot,
}: {
  children: React.ReactNode;
  cursorKey?: string;
  hot?: boolean;
}) {
  return (
    <span
      data-cursor={cursorKey}
      className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border text-[11px] font-medium transition-colors duration-200"
      style={{
        borderColor: hot ? C.tealLine : C.line3,
        background: hot ? C.tealWash : "transparent",
        color: hot ? C.tealInk : C.muted,
      }}
    >
      {children}
    </span>
  );
}

/** A progress track. The app runs these at 3px with a teal fill. */
export function Track({ pct, h = 3 }: { pct: number; h?: number }) {
  return (
    <span className="block w-full rounded-full overflow-hidden" style={{ height: h, background: "rgba(24,34,44,0.09)" }}>
      <motion.span
        className="block h-full rounded-full"
        style={{ background: C.teal }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />
    </span>
  );
}

/** Initials avatar, the app's 44px circle at scene scale. */
export function Avatar({ txt, size = 34 }: { txt: string; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-full inline-flex items-center justify-center font-semibold border"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        borderColor: C.line,
        background: "rgba(24,34,44,0.04)",
        color: C.ink,
      }}
    >
      {txt}
    </span>
  );
}

/** The verification chip pair the app puts under a builder's name. */
export function VerifyChip({ label, pending }: { label: string; pending?: boolean }) {
  const t = pending ? TONE.warn : TONE.good;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-1.5 h-[17px] text-[8.5px] font-semibold whitespace-nowrap"
      style={{ borderColor: t.border, background: t.bg, color: t.text }}
    >
      <svg viewBox="0 0 24 24" className="size-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6">
        <path d="M12 3l7 3v5c0 4.2-2.9 7.7-7 9-4.1-1.3-7-4.8-7-9V6z" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

/** One division of the scope register, collapsed or open. */
export function Division({
  label,
  count,
  open,
  cursorKey,
  hot,
  children,
}: {
  label: string;
  count: string;
  open?: boolean;
  cursorKey?: string;
  hot?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border overflow-hidden transition-colors duration-200"
      style={{
        borderColor: hot || open ? C.tealLine : C.line,
        background: hot ? C.tealWash : C.paper,
        boxShadow: ELEV,
      }}
    >
      <div data-cursor={cursorKey} className="flex items-center gap-2.5 px-3 py-[7px]">
        <span className="min-w-0 flex-1 text-[11.5px] font-medium truncate" style={{ color: C.ink }}>{label}</span>
        <span className="shrink-0 text-[10px] tabular-nums" style={{ color: C.dim }}>{count}</span>
        <svg
          viewBox="0 0 24 24"
          className="size-3 shrink-0 transition-transform duration-[280ms]"
          style={{ color: C.dim, transform: open ? "rotate(180deg)" : undefined }}
          fill="none" stroke="currentColor" strokeWidth="2.4"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t px-3 py-2 flex flex-col gap-2" style={{ borderColor: C.line }}>{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** A scope line: the item, its plain sentence, its citation. */
export function ScopeLine({
  label,
  plain,
  cite,
  citeKey,
  citeHot,
  right,
}: {
  label: string;
  plain: string;
  cite?: string;
  citeKey?: string;
  citeHot?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium leading-tight" style={{ color: C.ink }}>{label}</p>
        <p className="mt-0.5 text-[10px] leading-[1.45] line-clamp-2" style={{ color: C.muted }}>{plain}</p>
        {cite ? (
          <p
            data-cursor={citeKey}
            className="mt-0.5 inline-block max-w-full truncate rounded px-1 -mx-1 text-[9px] transition-colors duration-200"
            style={citeHot ? { color: "#ffffff", background: C.tealInk, fontWeight: 600 } : { color: C.dim }}
          >
            {cite}
          </p>
        ) : null}
      </div>
      {right ? <span className="shrink-0 pt-0.5">{right}</span> : null}
    </div>
  );
}

/** The four marks a builder puts on a schedule line. Real strings from
 *  the tender deck: Included, Provisional sum, Excluded, N/A. */
export function Mark({
  label,
  on,
  cursorKey,
  hot,
  tone = "good",
}: {
  label: string;
  on?: boolean;
  cursorKey?: string;
  hot?: boolean;
  tone?: ToneKey;
}) {
  const t = TONE[tone];
  return (
    <span
      data-cursor={cursorKey}
      className="inline-flex items-center h-[21px] px-2 rounded-full border text-[9.5px] whitespace-nowrap transition-colors duration-200"
      style={
        on
          ? tone === "good"
            ? { borderColor: "transparent", background: C.teal, color: C.onTeal, fontWeight: 700 }
            : { borderColor: "transparent", background: t.text, color: "#ffffff", fontWeight: 700 }
          : {
              borderColor: hot ? C.tealLine : C.line2,
              background: hot ? C.tealWash : "transparent",
              color: hot ? C.tealInk : C.muted,
            }
      }
    >
      {label}
    </span>
  );
}

/** A row on an ink wash, the app's list-item-inside-a-card. */
export function WashRow({
  children,
  className = "",
  cursorKey,
  hot,
}: {
  children: React.ReactNode;
  className?: string;
  cursorKey?: string;
  hot?: boolean;
}) {
  return (
    <div
      data-cursor={cursorKey}
      className={"rounded-md border transition-colors duration-200 " + className}
      style={{
        borderColor: hot ? C.tealLine : C.line,
        background: hot ? C.tealWash : C.wash,
      }}
    >
      {children}
    </div>
  );
}

/** The bottom fade that says a list keeps going. */
export function ListFade() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
      style={{ background: `linear-gradient(180deg, rgba(244,241,234,0), ${C.canvas})` }}
    />
  );
}
