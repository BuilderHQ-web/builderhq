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
import {
  ArrowRight,
  BadgeCheck,
  Check,
  FileText,
  Landmark,
  Lock,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

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

/** The consistent screen header: where you are, what this is, what
 *  you are looking at. One shape on every surface of both demos. */
export function Head({
  kicker,
  title,
  sub,
  right,
}: {
  kicker: string;
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <Kicker>{kicker}</Kicker>
        <h2 className="mt-2 font-ui font-semibold tracking-[-0.02em] text-[22px] sm:text-[27px] leading-[1.15] text-text">
          {title}
        </h2>
        {sub ? (
          <p className="mt-2 text-[13px] leading-[1.65] text-text-muted max-w-[62ch]">
            {sub}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

/* ── the product frame ──────────────────────────────────────────────── */

/**
 * The app, seen through its own window. Every demo screen sits inside
 * this frame: browser chrome on top, the product's bar under it, the
 * screen below. The homepage mockups taught the lesson here: the same
 * content reads as a shipped product inside the frame and as a
 * wireframe without it.
 */
export function AppFrame({
  crumb,
  children,
}: {
  crumb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden shadow-[0_1px_2px_rgba(24,34,44,0.05),_0_28px_80px_-32px_rgba(24,34,44,0.3)]">
      {/* browser chrome */}
      <div className="relative flex items-center h-10 px-4 border-b border-border-subtle/60 bg-bg-elev/50">
        <span className="flex items-center gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#e8a9a0]" />
          <span className="size-2.5 rounded-full bg-[#e6cf9d]" />
          <span className="size-2.5 rounded-full bg-[#a9d3b5]" />
        </span>
        <span className="absolute left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-6 px-3.5 rounded-full bg-[rgba(24,34,44,0.05)] text-[11px] text-text-dim">
          <Lock className="size-3" />
          builderhq.com.au
        </span>
      </div>
      {/* the product's own bar */}
      <div className="flex items-center justify-between h-12 px-5 sm:px-7 border-b border-border-subtle/60">
        <span className="flex items-center gap-2.5 min-w-0">
          <Logo height={18} tone="dark" />
          <span className="text-text-faint" aria-hidden>/</span>
          <span className="text-[12px] text-text-muted truncate">{crumb}</span>
        </span>
        <span
          className="size-7 rounded-full bg-accent-muted flex items-center justify-center text-accent-light shrink-0"
          aria-hidden
        >
          <UserRound className="size-3.5" />
        </span>
      </div>
      {/* the screen */}
      <div className="px-4 sm:px-8 py-6 sm:py-8">{children}</div>
    </div>
  );
}

/* ── the document register ──────────────────────────────────────────── */

/**
 * The uploaded set, filed: name, kind, pages, filling row by row.
 * The kind chips land a beat after the names, which is the point:
 * first the files arrive, then the product shows it knows what each
 * one is.
 */
export function DocRegister({
  project,
  docs,
  totalLabel,
  reduceMotion,
  target,
  ringed,
}: {
  project: string;
  docs: Array<{ name: string; pages: number; kind: string }>;
  totalLabel: string;
  reduceMotion: boolean;
  target: string;
  ringed: boolean;
}) {
  return (
    <Card target={target} className={cn("overflow-hidden", softRing(ringed))}>
      <div className="px-5 py-3.5 border-b border-border-subtle/60 flex items-center justify-between gap-3">
        <p className="text-[12.5px] font-ui font-semibold text-text truncate">
          {project}
        </p>
        <p className="text-[11.5px] text-text-dim tabular-nums shrink-0">
          {totalLabel}
        </p>
      </div>
      <ul className="divide-y divide-border-subtle/50">
        {docs.map((d, i) => (
          <motion.li
            key={d.name}
            initial={reduceMotion ? false : { opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: reduceMotion ? 0 : i * 0.06, ease: EASE }}
            className="px-5 py-2.5 flex items-center gap-3"
          >
            <FileText className="size-4 text-text-dim shrink-0" />
            <span className="min-w-0 flex-1 text-[13px] text-text truncate">
              {d.name}
            </span>
            <motion.span
              initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: reduceMotion ? 0 : 0.55 + i * 0.06, duration: 0.25, ease: EASE }}
              className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-accent-muted text-accent-light text-[10.5px] font-ui font-semibold shrink-0"
            >
              {d.kind}
            </motion.span>
            <span className="text-[11.5px] text-text-dim tabular-nums shrink-0 w-14 text-right">
              {d.pages} pages
            </span>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * The rail beside the register: each discipline ticked as the product
 * recognises it. Answers the reader's quiet question, "did it
 * understand what I gave it?", without a word of copy.
 */
export function SetChecklist({
  docs,
  reduceMotion,
}: {
  docs: Array<{ kind: string }>;
  reduceMotion: boolean;
}) {
  const kinds = [...new Set(docs.map((d) => d.kind.split(" · ")[0]!))];
  return (
    <Card className="px-5 py-4">
      <Kicker>Your set, checked</Kicker>
      <ul className="mt-3 space-y-2">
        {kinds.map((k, i) => (
          <motion.li
            key={k}
            initial={reduceMotion ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, delay: reduceMotion ? 0 : 0.7 + i * 0.09, ease: EASE }}
            className="flex items-center gap-2.5 text-[12.5px] text-text"
          >
            <span className="size-5 rounded-full bg-accent-muted flex items-center justify-center text-accent-light shrink-0">
              <Check className="size-3" strokeWidth={3} />
            </span>
            {k}
          </motion.li>
        ))}
      </ul>
      <p className="mt-3.5 pt-3 border-t border-border-subtle/60 text-[11.5px] text-text-muted">
        Every discipline identified.
      </p>
    </Card>
  );
}

/* ── the reading set piece ──────────────────────────────────────────── */

/**
 * The stage where the product earns belief: the scope writes itself,
 * line by line, each line arriving with the page it came from. A
 * page skeleton scans on the left; the draft grows on the right.
 * State moves only inside the interval; settled cases derive.
 */
export function ScopeWriter({
  feed,
  watching,
  settled,
  reduceMotion,
}: {
  feed: Array<{ line: string; cite: string }>;
  watching: boolean;
  settled: boolean;
  reduceMotion: boolean;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!watching || reduceMotion) return;
    const t = setInterval(
      () => setN((i) => Math.min(i + 1, feed.length)),
      950,
    );
    return () => clearInterval(t);
  }, [watching, reduceMotion, feed.length]);
  const shown =
    settled || (watching && reduceMotion) ? feed.length : watching ? n : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-[168px_1fr]">
      {/* the page being read */}
      <div className="hidden sm:block">
        <div className="relative rounded-md border border-border-subtle bg-bg-elev/40 p-3.5 overflow-hidden">
          <div className="space-y-2" aria-hidden>
            {[92, 100, 78, 100, 88, 62, 100, 84, 96, 70].map((w, i) => (
              <div
                key={i}
                className="h-[5px] rounded-full bg-[rgba(24,34,44,0.08)]"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
          {watching && !reduceMotion ? (
            <motion.div
              aria-hidden
              className="absolute inset-x-0 h-7 bg-[linear-gradient(180deg,rgba(0,212,200,0)_0%,rgba(0,212,200,0.16)_50%,rgba(0,212,200,0)_100%)] border-y border-[rgba(0,212,200,0.35)]"
              initial={{ top: "-15%" }}
              animate={{ top: "105%" }}
              transition={{ duration: 2.1, repeat: Infinity, ease: "linear" }}
            />
          ) : null}
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] text-text-dim">
          <ScanLine className="size-3" />
          {settled ? "Every page read" : "Reading each page"}
        </p>
      </div>

      {/* the draft, writing itself */}
      <div className="rounded-md border border-border-subtle bg-surface-1 px-4.5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
            Scope of works · draft
          </p>
          {settled ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-ui font-semibold text-accent-light">
              <ShieldCheck className="size-3" />
              Checked
            </span>
          ) : null}
        </div>
        <ul className="mt-3 space-y-2.5 min-h-[178px]">
          {feed.slice(0, shown).map((f) => (
            <motion.li
              key={f.line}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <p className="text-[12.5px] leading-[1.5] text-text">{f.line}</p>
              <motion.p
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.3 }}
                className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-text-muted"
              >
                <FileText className="size-2.5" />
                {f.cite}
              </motion.p>
            </motion.li>
          ))}
          {!settled && shown < feed.length ? (
            <li aria-hidden className="flex items-center gap-1.5 text-[12px] text-text-faint">
              <span className={cn("size-1.5 rounded-full bg-accent", !reduceMotion && "animate-pulse")} />
              writing
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

/* ── the tender document ────────────────────────────────────────────── */

/**
 * A landed tender, drawn as the document it is: letterhead band,
 * price, firmness, verification. Same card in both demos.
 */
export function TenderDoc({
  tender,
  here,
  reduceMotion,
  priceNote,
}: {
  tender: {
    name: string;
    initials: string;
    price: number;
    firmPct: number;
    movingAud: number;
  };
  here: boolean;
  reduceMotion: boolean;
  priceNote: string;
}) {
  const t = tender;
  return (
    <div
      className={cn(
        "rounded-lg border min-h-[150px] transition-colors overflow-hidden",
        here
          ? "border-border-subtle bg-white shadow-[0_1px_2px_rgba(24,34,44,0.06),_0_14px_36px_-18px_rgba(24,34,44,0.25)]"
          : "border-dashed border-border-subtle",
      )}
    >
      {here ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <div className="px-4 pt-3.5 pb-2.5 border-b border-border-subtle/50 flex items-center justify-between bg-bg-elev/30">
            <span className="flex items-center gap-2 min-w-0">
              <span className="size-6 rounded-full bg-accent-muted flex items-center justify-center text-[9.5px] font-ui font-bold text-accent-light shrink-0">
                {t.initials}
              </span>
              <span className="text-[11.5px] font-ui font-medium text-text truncate">
                {t.name}
              </span>
            </span>
            <span className="text-[8.5px] tracking-[0.14em] uppercase text-accent-light font-ui font-semibold shrink-0">
              Submitted
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="font-display text-[21px] leading-none text-text tabular-nums">
              ${t.price.toLocaleString("en-AU")}
            </p>
            <p className="mt-1 text-[10.5px] text-text-muted">{priceNote}</p>
            <div className="mt-2.5 h-[4px] rounded-full overflow-hidden flex bg-[rgba(24,34,44,0.07)]">
              <span className="h-full bg-[#0a7d73]" style={{ width: `${t.firmPct}%` }} />
              {t.firmPct < 100 ? (
                <span className="h-full bg-[#c99422]" style={{ width: `${100 - t.firmPct}%` }} />
              ) : null}
            </div>
            <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-text-muted">
              <BadgeCheck className="size-3 text-accent-light" />
              Verified · profile attached
            </p>
          </div>
        </motion.div>
      ) : (
        <p className="text-[11.5px] text-text-dim pt-[62px] text-center">
          Awaiting tender
        </p>
      )}
    </div>
  );
}
