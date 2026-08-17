"use client";

/**
 * The demo's surfaces — the product, recreated on its own design
 * tokens.
 *
 * Deliberately NOT the real app components: the real screens are
 * auth-gated, database-backed, and cannot time-travel, and a demo
 * must show upload, analysis, review, live, tendering and comparison
 * inside four minutes. Each surface is a faithful, scripted
 * recreation, driven entirely by the step index the engine passes
 * down, so stepping BACK rewinds the world for free.
 *
 * Elements the walkthrough talks about carry data-demo-target ids:
 * the engine anchors its callouts to them and rings the active one.
 */

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  FileUp,
  Landmark,
  Lock,
  MessageCircleQuestion,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DEMO_ASKS,
  DEMO_BUILDERS,
  DEMO_COMPARE,
  DEMO_DIMENSIONS,
  DEMO_DIVISION,
  DEMO_DOCUMENTS,
  DEMO_PACKAGES,
  DEMO_PROJECT,
  DEMO_QUESTIONS,
  DEMO_RECEIPTS,
  DEMO_SCOPE_DIVISIONS,
  DEMO_SCOPE_DIVISIONS_AFTER,
  DEMO_SCOPE_MORE,
  DEMO_TENDERS,
  DEMO_TOTALS,
  fmtAud,
} from "./content";

const EASE = [0.22, 1, 0.36, 1] as const;

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

/* ── shared primitives ──────────────────────────────────────────────── */

/** The pulsing halo for the control a click beat asks for. */
function Spot({
  active,
  children,
  className,
  reduceMotion,
}: {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  reduceMotion?: boolean;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      ref.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    }, 120);
    return () => clearTimeout(t);
  }, [active, reduceMotion]);
  return (
    <span ref={ref} className={cn("relative inline-flex", className)}>
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
function softRing(active: boolean): string {
  return active
    ? "ring-2 ring-[rgba(0,166,155,0.45)] ring-offset-2 ring-offset-bg"
    : "";
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
      {children}
    </p>
  );
}

function Card({
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

function TealButton({
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
function useCountUp(
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

/* ── 1 · upload ─────────────────────────────────────────────────────── */

export function UploadSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  const filed = stepIdx >= 2;
  const roundOffered = stepIdx >= 3;
  const roundChosen = stepIdx >= 4;
  return (
    <div>
      <Kicker>New project</Kicker>
      <h2 className="mt-2 font-ui font-semibold tracking-[-0.02em] text-[24px] sm:text-[30px] leading-[1.15] text-text">
        Upload your plans
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-[1.7] text-text-muted max-w-[62ch]">
        Drop in the documents you already have. The reading works from
        PDFs exactly as your architect issued them.
      </p>

      {!filed ? (
        <Card className="mt-6 border-dashed border-border-strong bg-transparent">
          <div className="px-6 py-14 flex flex-col items-center text-center">
            <span className="size-12 rounded-full bg-accent-muted flex items-center justify-center text-accent-light">
              <FileUp className="size-5" />
            </span>
            <p className="mt-4 text-[14px] font-ui font-medium text-text">
              Drag your documents here
            </p>
            <p className="mt-1 text-[12.5px] text-text-dim">
              Plans, engineering, reports. PDF, up to 30 files.
            </p>
            <Spot active={spot === "add-plans"} reduceMotion={reduceMotion} className="mt-6">
              <TealButton onClick={() => onAction("add-plans")}>
                Add your plans
                <FileUp className="size-4" />
              </TealButton>
            </Spot>
          </div>
        </Card>
      ) : (
        <>
          <Card
            target="register"
            className={cn("mt-6 overflow-hidden", softRing(soft === "register"))}
          >
            <div className="px-5 py-3.5 border-b border-border-subtle/60 flex items-center justify-between">
              <p className="text-[12.5px] font-ui font-semibold text-text">
                {DEMO_PROJECT.title}
              </p>
              <p className="text-[11.5px] text-text-dim tabular-nums">
                {DEMO_TOTALS.documents} documents · {DEMO_TOTALS.pages} pages
              </p>
            </div>
            <ul className="divide-y divide-border-subtle/50">
              {DEMO_DOCUMENTS.map((d, i) => (
                <motion.li
                  key={d.name}
                  initial={reduceMotion ? false : { opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: reduceMotion ? 0 : i * 0.07, ease: EASE }}
                  className="px-5 py-2.5 flex items-center gap-3"
                >
                  <FileText className="size-4 text-text-dim shrink-0" />
                  <span className="min-w-0 flex-1 text-[13px] text-text truncate">
                    {d.name}
                  </span>
                  <motion.span
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reduceMotion ? 0 : 0.7 + i * 0.07 }}
                    className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-accent-muted text-accent-light text-[10.5px] font-ui font-semibold"
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

          {roundOffered ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <Card className="mt-4 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <Kicker>Who can tender</Kicker>
                  {roundChosen ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-ui font-semibold text-accent-light">
                      <Check className="size-3.5" />
                      Open round · 3 spots
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      id: "choose-open",
                      label: "Open to verified builders",
                      sub: "Builders near you take the spots",
                      pick: true,
                    },
                    {
                      id: "choose-invite",
                      label: "Invite your own",
                      sub: "Only builders you choose",
                      pick: false,
                    },
                    {
                      id: "choose-both",
                      label: "Both",
                      sub: "Your builders plus ours",
                      pick: false,
                    },
                  ].map((o) => {
                    const selected = roundChosen && o.pick;
                    const btn = (
                      <button
                        type="button"
                        onClick={() => o.pick && onAction("choose-open")}
                        className={cn(
                          "w-full text-left rounded-md border px-3.5 py-3 transition-colors",
                          selected
                            ? "border-border-accent bg-[rgba(0,212,200,0.05)]"
                            : "border-border-subtle hover:border-border-strong",
                        )}
                      >
                        <span className="block text-[12.5px] font-ui font-semibold text-text">
                          {o.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-text-muted">
                          {o.sub}
                        </span>
                      </button>
                    );
                    return o.pick ? (
                      <Spot
                        key={o.id}
                        active={spot === "choose-open"}
                        reduceMotion={reduceMotion}
                        className="w-full"
                      >
                        {btn}
                      </Spot>
                    ) : (
                      <span key={o.id}>{btn}</span>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          ) : null}

          {roundChosen ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="mt-5 flex items-center justify-between gap-4"
            >
              <p className="text-[12px] text-text-muted max-w-[46ch]">
                Nothing renamed, nothing converted. This register is what
                your round is priced from.
              </p>
              <Spot active={spot === "start-reading"} reduceMotion={reduceMotion}>
                <TealButton onClick={() => onAction("start-reading")}>
                  Start the reading
                  <ArrowRight className="size-4" />
                </TealButton>
              </Spot>
            </motion.div>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ── 2 · the reading ────────────────────────────────────────────────── */

const READING_FEED = [
  { line: "Waffle pod slab, 300mm pods with 85mm slab", cite: "Structural, page 6" },
  { line: "Colorbond roofing in Monument", cite: "Architectural, page 12" },
  { line: "Class H1 site, priced to the soil report", cite: "Soil report, page 4" },
  { line: "7.1 star thermal performance", cite: "Energy assessment, page 3" },
  { line: "No landscaping documented. Flagged for you.", cite: "Whole set" },
];

export function ReadingSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  const watching = stepIdx === 1;
  const settled = stepIdx >= 2;
  const pages = useCountUp(DEMO_TOTALS.pages, watching, settled, 4600, reduceMotion);
  const items = useCountUp(DEMO_TOTALS.items, watching, settled, 5000, reduceMotion);
  const cites = useCountUp(486, watching, settled, 5200, reduceMotion);

  const [feedIdx, setFeedIdx] = useState(0);
  useEffect(() => {
    if (!watching || reduceMotion) return;
    const t = setInterval(
      () => setFeedIdx((i) => (i + 1) % READING_FEED.length),
      1150,
    );
    return () => clearInterval(t);
  }, [watching, reduceMotion]);
  const feed = READING_FEED[settled ? READING_FEED.length - 1 : feedIdx]!;

  const stages: Array<{ label: string; done: boolean; active: boolean; human?: boolean }> = [
    { label: "Identify the documents", done: true, active: false },
    { label: "Read every page", done: settled || pages >= DEMO_TOTALS.pages, active: watching },
    { label: "Write the scope of works", done: settled, active: watching && pages > 100 },
    { label: "Checked by a person at BuilderHQ", done: settled, active: false, human: true },
  ];

  return (
    <div>
      <Kicker>Reading your documents</Kicker>
      <h2 className="mt-2 font-ui font-semibold tracking-[-0.02em] text-[24px] sm:text-[30px] leading-[1.15] text-text">
        {settled ? "Your pack is ready." : "Reading, page by page."}
      </h2>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="px-6 py-6">
          <ul className="space-y-4">
            {stages.map((s) => (
              <li
                key={s.label}
                data-demo-target={s.human ? "human-check" : undefined}
                className={cn(
                  "flex items-center gap-3.5 rounded-md",
                  s.human && softRing(soft === "human-check"),
                  s.human && soft === "human-check" && "px-2 py-1.5 -mx-2",
                )}
              >
                <span
                  className={cn(
                    "size-7 rounded-full flex items-center justify-center shrink-0 border",
                    s.done
                      ? "bg-accent-muted border-transparent text-accent-light"
                      : s.active
                        ? "border-accent text-accent-light"
                        : "border-border-subtle text-text-faint",
                  )}
                >
                  {s.done ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : s.human ? (
                    <UserRound className="size-3.5" />
                  ) : (
                    <ScanLine className={cn("size-3.5", s.active && !reduceMotion && "animate-pulse")} />
                  )}
                </span>
                <span
                  className={cn(
                    "text-[13.5px] font-ui",
                    s.done || s.active ? "text-text" : "text-text-dim",
                  )}
                >
                  {s.label}
                </span>
                {s.human && s.done ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-ui font-semibold text-accent-light">
                    <ShieldCheck className="size-3.5" />
                    Reviewed
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-5 border-t border-border-subtle/60">
            <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
              {settled ? "Among what it found" : "Being read now"}
            </p>
            <motion.div
              key={feed.line}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="mt-2"
            >
              <p className="text-[13.5px] text-text leading-[1.5]">{feed.line}</p>
              <p className="mt-0.5 text-[11px] text-text-muted">{feed.cite}</p>
            </motion.div>
          </div>
        </Card>

        <div className="grid grid-cols-3 lg:grid-cols-1 gap-4">
          {[
            { v: pages, label: "Pages read" },
            { v: items, label: "Scope items written" },
            { v: cites, label: "Citations recorded" },
          ].map((s) => (
            <Card key={s.label} className="px-4 py-4 lg:px-5 lg:py-5 text-center lg:text-left">
              <p className="font-display text-[28px] lg:text-[34px] leading-none text-text tabular-nums">
                {s.v.toLocaleString("en-AU")}
              </p>
              <p className="mt-1.5 text-[9.5px] lg:text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
                {s.label}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {settled ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-6 flex justify-end"
        >
          <Spot active={spot === "open-scope"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("open-scope")}>
              Open your scope of works
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 3 · the scope of works ─────────────────────────────────────────── */

export function ScopeSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  const expanded = stepIdx >= 2;
  const psSet = stepIdx >= 5;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>{DEMO_PROJECT.title}</Kicker>
          <h2 className="mt-2 font-ui font-semibold tracking-[-0.02em] text-[24px] sm:text-[30px] leading-[1.15] text-text">
            Scope of works
          </h2>
        </div>
        <div className="flex items-center gap-5 sm:gap-7">
          {[
            { v: DEMO_TOTALS.items, label: "Items" },
            { v: DEMO_TOTALS.trades, label: "Trades" },
            { v: DEMO_TOTALS.documents, label: "Documents" },
          ].map((s) => (
            <div key={s.label} className="text-right">
              <p className="font-display text-[24px] sm:text-[28px] leading-none text-text tabular-nums">
                {s.v}
              </p>
              <p className="mt-1 text-[9px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[12.5px] text-text-muted">
        <span className="font-ui font-semibold text-text">
          {DEMO_TOTALS.evidenced} lines
        </span>{" "}
        from your documents ·{" "}
        <span className="font-ui font-semibold text-[#2a5cae]">
          {DEMO_TOTALS.builderPriced} lines
        </span>{" "}
        added for the builders to price
      </p>

      {/* divisions */}
      <Card className="mt-5 overflow-hidden">
        <ul className="divide-y divide-border-subtle/50">
          {DEMO_SCOPE_DIVISIONS.map((d) => (
            <li key={d.label} className="px-5 py-3 flex items-center justify-between">
              <span className="text-[13px] font-ui text-text">{d.label}</span>
              <span className="text-[11.5px] text-text-dim tabular-nums">
                {d.count} items
              </span>
            </li>
          ))}
          <li>
            <Spot
              active={spot === "expand-division"}
              reduceMotion={reduceMotion}
              className="w-full"
            >
              <button
                type="button"
                onClick={() => onAction("expand-division")}
                className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-bg-elev/60 transition-colors"
              >
                <span className="text-[13px] font-ui font-semibold text-text">
                  {DEMO_DIVISION.label}
                </span>
                <span className="flex items-center gap-2 text-[11.5px] text-text-dim tabular-nums">
                  {DEMO_DIVISION.count} items
                  <ChevronDown
                    className={cn("size-4 transition-transform", expanded && "rotate-180")}
                  />
                </span>
              </button>
            </Spot>
            {expanded ? (
              <motion.ul
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.35, ease: EASE }}
                data-demo-target="division-lines"
                className={cn(
                  "border-t border-border-subtle/50 bg-[rgba(24,34,44,0.015)]",
                  softRing(soft === "division-lines"),
                )}
              >
                {DEMO_DIVISION.lines.map((l) => (
                  <li key={l.label} className="px-5 py-3">
                    <p className="text-[13px] font-ui font-medium text-text">
                      {l.label}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-[1.55] text-text-muted">
                      {l.note}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted">{l.cite}</p>
                  </li>
                ))}
                <li className="px-5 py-2.5 text-[11.5px] text-text-muted">
                  5 more lines in this division
                </li>
              </motion.ul>
            ) : null}
          </li>
          {DEMO_SCOPE_DIVISIONS_AFTER.map((d) => (
            <li key={d.label} className="px-5 py-3 flex items-center justify-between">
              <span className="text-[13px] font-ui text-text">{d.label}</span>
              <span className="text-[11.5px] text-text-dim tabular-nums">
                {d.count} items
              </span>
            </li>
          ))}
          <li className="px-5 py-3 text-[12px] text-text-muted">
            {DEMO_SCOPE_MORE}
          </li>
        </ul>
      </Card>

      {/* the provisional sum packages */}
      <div
        data-demo-target="packages"
        className={cn("mt-4 rounded-lg", softRing(soft === "packages"))}
      >
        <div className="flex items-baseline justify-between px-0.5">
          <Kicker>Provisional sums</Kicker>
          <p className="text-[11px] text-text-dim">
            Budgets for what your documents leave open
          </p>
        </div>
        <div className="mt-2 grid gap-2.5">
          {DEMO_PACKAGES.map((p) => {
            const set = p.preset || psSet;
            return (
              <Card
                key={p.id}
                className={cn(
                  "px-4.5 py-3.5",
                  !set && "border-[rgba(201,148,34,0.4)]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-[56ch]">
                    <p className="text-[13.5px] font-ui font-semibold text-text">
                      {p.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-[1.55] text-text-muted">
                      {p.covers}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-[1.55] text-text-dim">
                      {p.why}
                    </p>
                  </div>
                  {set ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-ui font-semibold text-accent-light shrink-0">
                      <Check className="size-3.5" />
                      Budget set: {fmtAud(p.amount)}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="h-10 px-3.5 rounded-md border border-border-subtle bg-surface-1 inline-flex items-center text-[13px] tabular-nums text-text">
                        {fmtAud(p.amount)}
                      </span>
                      <Spot active={spot === "set-budget"} reduceMotion={reduceMotion}>
                        <button
                          type="button"
                          onClick={() => onAction("set-budget")}
                          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-accent text-accent-contrast text-[12px] font-semibold hover:bg-accent-hover transition-colors"
                        >
                          <CircleDollarSign className="size-3.5" />
                          Set budget
                        </button>
                      </Spot>
                    </div>
                  )}
                </div>
                {p.id === "landscaping" && psSet ? (
                  <motion.p
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-[11.5px] leading-[1.6] text-text-dim"
                  >
                    Your budget covers this package as a whole. Builders
                    price against the one figure, not line by line.
                  </motion.p>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>

      {/* approve */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
          <ShieldCheck className="size-3.5 text-accent-light" />
          Reviewed by a person before you see it
        </p>
        <Spot active={spot === "publish"} reduceMotion={reduceMotion}>
          <TealButton onClick={() => onAction("publish")} disabled={!psSet}>
            Approve and publish
            <ArrowRight className="size-4" />
          </TealButton>
        </Spot>
      </div>
    </div>
  );
}

/* ── 4 · going live ─────────────────────────────────────────────────── */

export function RoundSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  const filling = stepIdx === 2;
  const full = stepIdx >= 3;
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (!filling || reduceMotion) return;
    const timers = [0, 1, 2, 3].map((n) =>
      setTimeout(() => setTicks(n), n === 0 ? 0 : 700 + (n - 1) * 1250),
    );
    return () => timers.forEach(clearTimeout);
  }, [filling, reduceMotion]);
  const filled = full || (filling && reduceMotion) ? 3 : filling ? ticks : 0;

  return (
    <div>
      <Kicker>Your round is live</Kicker>
      <h2 className="mt-2 font-ui font-semibold tracking-[-0.02em] text-[24px] sm:text-[30px] leading-[1.15] text-text">
        Builders take a spot.
      </h2>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card
          target="builder-view"
          className={cn("px-5 py-5", softRing(soft === "builder-view"))}
        >
          <Kicker>What builders see</Kicker>
          <p className="mt-3 text-[16px] font-ui font-semibold text-text">
            {DEMO_PROJECT.title}
          </p>
          <p className="mt-1 text-[12.5px] text-text-muted">{DEMO_PROJECT.facts}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            <Lock className="size-3.5" />
            Address shared only when a spot is secured
          </p>
          <div className="mt-4 pt-4 border-t border-border-subtle/60 grid grid-cols-3 gap-3 text-center">
            {[
              { v: String(DEMO_TOTALS.items), label: "Scope items" },
              { v: String(DEMO_TOTALS.trades), label: "Trades" },
              { v: "3", label: "Spots" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-[22px] leading-none text-text tabular-nums">
                  {s.v}
                </p>
                <p className="mt-1 text-[9px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="px-5 py-5">
          <div className="flex items-center justify-between">
            <Kicker>Tender spots</Kicker>
            <span className="text-[11.5px] font-ui font-semibold text-text tabular-nums">
              {filled} of 3
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {DEMO_BUILDERS.map((b, i) => {
              const taken = filled > i;
              return (
                <li
                  key={b.name}
                  className={cn(
                    "rounded-md border px-4 py-3 flex items-center gap-3 transition-colors",
                    taken
                      ? "border-border-accent/50 bg-[rgba(0,212,200,0.04)]"
                      : "border-dashed border-border-subtle",
                  )}
                >
                  {taken ? (
                    <motion.span
                      initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="size-8 rounded-full bg-accent-muted flex items-center justify-center text-[11px] font-ui font-bold text-accent-light shrink-0"
                    >
                      {b.initials}
                    </motion.span>
                  ) : (
                    <span className="size-8 rounded-full border border-dashed border-border-strong shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    {taken ? (
                      <motion.span
                        initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="block"
                      >
                        <span className="block text-[13px] font-ui font-medium text-text truncate">
                          {b.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10.5px] text-accent-light font-ui font-semibold">
                          <BadgeCheck className="size-3" />
                          ABN and licence verified
                        </span>
                      </motion.span>
                    ) : (
                      <span className="text-[12.5px] text-text-dim">
                        Spot open
                      </span>
                    )}
                  </span>
                  {taken ? (
                    <span className="text-[10.5px] font-ui font-semibold text-text-dim shrink-0">
                      Secured
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {full ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-6 flex justify-end"
        >
          <Spot active={spot === "see-tendering"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("see-tendering")}>
              See what the builders do
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 5 · tenders arrive ─────────────────────────────────────────────── */

const MARK_ROWS = [
  { label: "Waffle pod slab", state: "Included", tone: "teal" },
  { label: "Landscaping package", state: "Provisional sum · $47,000", tone: "amber" },
  { label: "Driveway and crossover", state: "Included", tone: "teal" },
];

export function TenderSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  const arriving = stepIdx === 3;
  const arrived = stepIdx >= 4;
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (!arriving || reduceMotion) return;
    const timers = [0, 1, 2, 3].map((n) =>
      setTimeout(() => setTicks(n), n === 0 ? 0 : 600 + (n - 1) * 1150),
    );
    return () => timers.forEach(clearTimeout);
  }, [arriving, reduceMotion]);
  const landed = arrived || (arriving && reduceMotion) ? 3 : arriving ? ticks : 0;

  return (
    <div>
      <Kicker>The builders&rsquo; side</Kicker>
      <h2 className="mt-2 font-ui font-semibold tracking-[-0.02em] text-[24px] sm:text-[30px] leading-[1.15] text-text">
        Every builder answers the same scope.
      </h2>

      <Card
        target="marking"
        className={cn("mt-6 px-5 py-4", softRing(soft === "marking"))}
      >
        <div className="flex items-center justify-between">
          <Kicker>Inside a builder&rsquo;s submission</Kicker>
          <span className="text-[11px] text-text-dim tabular-nums">
            Line 41 of {DEMO_TOTALS.items}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {MARK_ROWS.map((r, i) => (
            <motion.li
              key={r.label}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: reduceMotion ? 0 : 0.25 + i * 0.2, ease: EASE }}
              className="flex items-center justify-between gap-3 rounded-md border border-border-subtle px-3.5 py-2.5"
            >
              <span className="text-[12.5px] text-text">{r.label}</span>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10.5px] font-ui font-semibold",
                  r.tone === "teal"
                    ? "bg-accent-muted text-accent-light"
                    : "bg-[rgba(201,148,34,0.14)] text-[#8a6414]",
                )}
              >
                {r.state}
              </span>
            </motion.li>
          ))}
        </ul>
        <p className="mt-3 text-[11.5px] text-text-muted">
          Included, a provisional sum, or excluded. A builder declares
          every line in about thirty minutes.
        </p>
      </Card>

      <Card
        target="asks"
        className={cn("mt-4 px-5 py-4", softRing(soft === "asks"))}
      >
        <Kicker>And every builder answers</Kicker>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {DEMO_ASKS.map((a) => (
            <li
              key={a}
              className="px-2.5 py-1.5 rounded-full border border-border-subtle text-[11.5px] text-text-muted"
            >
              {a}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {DEMO_TENDERS.map((t, i) => {
          const here = landed > i;
          return (
            <div
              key={t.name}
              className={cn(
                "rounded-lg border px-4 py-4 min-h-[136px] transition-colors",
                here
                  ? "border-border-subtle bg-white shadow-[0_1px_2px_rgba(24,34,44,0.06),_0_14px_36px_-18px_rgba(24,34,44,0.25)]"
                  : "border-dashed border-border-subtle",
              )}
            >
              {here ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <div className="flex items-center justify-between">
                    <span className="size-7 rounded-full bg-accent-muted flex items-center justify-center text-[10px] font-ui font-bold text-accent-light">
                      {t.initials}
                    </span>
                    <span className="text-[9px] tracking-[0.14em] uppercase text-accent-light font-ui font-semibold">
                      Submitted
                    </span>
                  </div>
                  <p className="mt-2.5 text-[12px] font-ui font-medium text-text truncate">
                    {t.name}
                  </p>
                  <p className="mt-1 font-display text-[20px] leading-none text-text tabular-nums">
                    {fmtAud(t.price)}
                  </p>
                  <p className="mt-1 text-[10.5px] text-text-muted">
                    ex GST · same scope
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-text-muted">
                    <BadgeCheck className="size-3 text-accent-light" />
                    Verified · profile attached
                  </p>
                </motion.div>
              ) : (
                <p className="text-[11.5px] text-text-dim pt-10 text-center">
                  Awaiting tender
                </p>
              )}
            </div>
          );
        })}
      </div>

      {arrived ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-6 flex justify-end"
        >
          <Spot active={spot === "open-comparison"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("open-comparison")}>
              Open the comparison
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 6 · the comparison ─────────────────────────────────────────────── */

export function CompareSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 prices · 2 show-scores · 3 receipts ·
  //        4 show-differences · 5 breakeven · 6 ladder ·
  //        7 show-questions · 8 finish
  const scores = stepIdx >= 3;
  const differing = stepIdx >= 5;
  const questions = stepIdx >= 8;
  const reveal = (on: boolean) =>
    reduceMotion || !on
      ? {}
      : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: EASE } };

  return (
    <div>
      <Kicker>The comparison</Kicker>
      <h2 className="mt-2 font-ui font-semibold tracking-[-0.02em] text-[24px] sm:text-[30px] leading-[1.15] text-text">
        Three tenders, one scope, read together.
      </h2>

      {/* the tenders */}
      <div
        data-demo-target="price-row"
        className={cn("mt-6 grid gap-3 sm:grid-cols-3 rounded-lg", softRing(soft === "price-row"))}
      >
        {DEMO_TENDERS.map((t) => (
          <Card key={t.name} className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="size-7 rounded-full bg-accent-muted flex items-center justify-center text-[10px] font-ui font-bold text-accent-light">
                {t.initials}
              </span>
              {scores ? (
                <motion.span {...reveal(true)} className="text-right">
                  <span className="block font-display text-[18px] leading-none text-text tabular-nums">
                    {t.overall}
                  </span>
                  <span className="block text-[8px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold mt-0.5">
                    Weighted
                  </span>
                </motion.span>
              ) : null}
            </div>
            <p className="mt-2 text-[12px] font-ui font-medium text-text truncate">
              {t.name}
            </p>
            <p className="mt-1 font-display text-[24px] leading-none text-text tabular-nums">
              {fmtAud(t.price)}
            </p>

            <div className="mt-3">
              <div className="h-[5px] rounded-full overflow-hidden flex bg-[rgba(24,34,44,0.07)]">
                <span className="h-full bg-[#0a7d73]" style={{ width: `${t.firmPct}%` }} />
                {t.firmPct < 100 ? (
                  <span className="h-full bg-[#c99422]" style={{ width: `${100 - t.firmPct}%` }} />
                ) : null}
              </div>
              <p className="mt-1.5 text-[10.5px] text-text-muted">
                {t.firmPct === 100
                  ? "Fully priced. Nothing moves."
                  : `${t.firmPct}% firm · ${fmtAud(t.movingAud)} can still move`}
              </p>
            </div>

            {/* the six dimensions, when scoring is revealed */}
            {scores ? (
              <motion.ul {...reveal(true)} className="mt-3 pt-3 border-t border-border-subtle/60 space-y-1.5">
                {DEMO_DIMENSIONS.map((d, i) => (
                  <li key={d.label} className="flex items-center gap-2">
                    <span className="w-[86px] shrink-0 text-[9.5px] text-text-dim font-ui truncate">
                      {d.label}
                    </span>
                    <span className="flex-1 h-[3px] rounded-full bg-[rgba(24,34,44,0.07)] overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-[#0a7d73]"
                        style={{ width: `${t.dims[i]}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-[10px] tabular-nums text-text-muted">
                      {t.dims[i]}
                    </span>
                  </li>
                ))}
              </motion.ul>
            ) : null}

            <ul className="mt-3 pt-3 border-t border-border-subtle/60 space-y-1.5">
              <li className="flex items-center justify-between text-[11px]">
                <span className="text-text-dim">Landscaping</span>
                <span className="text-text-muted">{t.landscaping}</span>
              </li>
              <li
                className={cn(
                  "flex items-center justify-between text-[11px] rounded px-1 -mx-1 transition-colors",
                  differing && t.driveway === "Excluded" && "bg-[rgba(201,148,34,0.12)]",
                )}
              >
                <span className="text-text-dim">Driveway</span>
                <span
                  className={cn(
                    "font-ui",
                    t.driveway === "Excluded"
                      ? "text-[#8a6414] font-semibold"
                      : "text-text-muted",
                  )}
                >
                  {t.driveway}
                </span>
              </li>
              <li className="flex items-center justify-between text-[11px]">
                <span className="text-text-dim">Every line priced</span>
                <span
                  className={cn(
                    "font-ui",
                    t.fullyPriced
                      ? "text-accent-light font-semibold"
                      : "text-[#8a6414] font-semibold",
                  )}
                >
                  {t.fullyPriced ? "Yes" : "No"}
                </span>
              </li>
            </ul>
          </Card>
        ))}
      </div>

      {/* reveal: the scores */}
      {!scores ? (
        <div className="mt-5 flex justify-center">
          <Spot active={spot === "show-scores"} reduceMotion={reduceMotion}>
            <button
              type="button"
              onClick={() => onAction("show-scores")}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border-strong text-[12.5px] font-ui font-medium text-text hover:border-border-accent transition-colors"
            >
              Show the scores
              <ChevronDown className="size-3.5" />
            </button>
          </Spot>
        </div>
      ) : null}

      {/* the receipts behind one score */}
      {scores ? (
        <motion.div {...reveal(true)}>
          <Card
            target="receipts"
            className={cn("mt-4 px-5 py-4", softRing(soft === "receipts"))}
          >
            <div className="flex items-center justify-between gap-3">
              <Kicker>
                {DEMO_RECEIPTS.builder} · {DEMO_RECEIPTS.dimension}
              </Kicker>
              <span className="font-display text-[18px] leading-none text-text tabular-nums">
                {DEMO_RECEIPTS.score}
              </span>
            </div>
            <ul className="mt-2.5 space-y-1">
              {DEMO_RECEIPTS.lines.map((l) => (
                <li key={l.label} className="flex items-baseline gap-2.5">
                  <span
                    className={cn(
                      "w-9 shrink-0 text-right font-mono text-[10.5px] tabular-nums",
                      l.value.startsWith("+")
                        ? "font-semibold text-[#0a7d73]"
                        : l.value.startsWith("−")
                          ? "font-medium text-[#a8433e]"
                          : "text-text-dim",
                    )}
                  >
                    {l.value}
                  </span>
                  <span className="text-[11.5px] text-text-muted">{l.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      ) : null}

      {/* reveal: the differences */}
      {scores && !differing ? (
        <div className="mt-5 flex justify-center">
          <Spot active={spot === "show-differences"} reduceMotion={reduceMotion}>
            <button
              type="button"
              onClick={() => onAction("show-differences")}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border-strong text-[12.5px] font-ui font-medium text-text hover:border-border-accent transition-colors"
            >
              Where they differ
              <ChevronDown className="size-3.5" />
            </button>
          </Spot>
        </div>
      ) : null}

      {differing ? (
        <motion.div {...reveal(true)} className="mt-4 grid gap-3 lg:grid-cols-2">
          <Card
            target="breakeven"
            className={cn(
              "px-5 py-4 border-[rgba(201,148,34,0.35)]",
              softRing(soft === "breakeven"),
            )}
          >
            <Kicker>The exposure, in one line</Kicker>
            <p className="mt-2 text-[13.5px] leading-[1.65] text-text">
              Corten is {fmtAud(DEMO_COMPARE.saving)} cheaper, but{" "}
              {fmtAud(DEMO_COMPARE.exposure)} of its price sits in
              allowances of its own. If those run{" "}
              <span className="font-ui font-semibold">
                {DEMO_COMPARE.breakevenPct} percent
              </span>{" "}
              over, the saving is gone.
            </p>
          </Card>
          <Card
            target="ladder"
            className={cn("px-5 py-4", softRing(soft === "ladder"))}
          >
            <Kicker>What the next step up buys</Kicker>
            <p className="mt-2 text-[12.5px] text-text-muted">
              Brightwater is {fmtAud(DEMO_COMPARE.stepUp)} above Meridian.
              For that:
            </p>
            <ul className="mt-2 space-y-1">
              {DEMO_COMPARE.stepUpBuys.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[12.5px] text-text">
                  <Check className="size-3.5 text-accent-light shrink-0 mt-[2px]" />
                  {b}
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      ) : null}

      {/* reveal: the questions */}
      {differing && !questions ? (
        <div className="mt-5 flex justify-center">
          <Spot active={spot === "show-questions"} reduceMotion={reduceMotion}>
            <button
              type="button"
              onClick={() => onAction("show-questions")}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border-strong text-[12.5px] font-ui font-medium text-text hover:border-border-accent transition-colors"
            >
              Questions to ask
              <MessageCircleQuestion className="size-3.5" />
            </button>
          </Spot>
        </div>
      ) : null}

      {questions ? (
        <motion.div {...reveal(true)}>
          <Card className="mt-4 px-5 py-4">
            <Kicker>Before you decide, ask</Kicker>
            <ul className="mt-2.5 space-y-2">
              {DEMO_QUESTIONS.map((q) => (
                <li key={q} className="flex items-start gap-2.5 text-[12.5px] leading-[1.6] text-text">
                  <MessageCircleQuestion className="size-3.5 text-accent-light shrink-0 mt-[2px]" />
                  {q}
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      ) : null}

      {questions ? (
        <div className="mt-6 flex justify-end">
          <Spot active={spot === "finish"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("finish")}>
              Finish the round
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </div>
      ) : null}
    </div>
  );
}

/* ── 7 · the close ──────────────────────────────────────────────────── */

export function CloseSurface({
  reduceMotion,
  onPrimary,
  close,
  disclaimer,
}: {
  reduceMotion: boolean;
  onPrimary: () => void;
  close: {
    kicker: string;
    title: string;
    recap: string[];
    truth: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  };
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
