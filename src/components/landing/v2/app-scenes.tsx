"use client";

/**
 * App scenes. Five recreations of the product doing its job, one per
 * flagship module beat:
 *
 *   scope       the scope of works, division grouped, every line cited
 *   marking     a builder marking that same list, four states
 *   instrument  the submission instrument, section by section
 *   round       the evaluation summary, composite scores and flags
 *   matrix      the scope matrix, every tender against every line
 *
 * These are screenshots, not themed panels: they stay dark on the light
 * marketing page, in the app's own teal, at roughly half true scale.
 * Pure JSX, Tailwind and inline styles. Lucide glyphs are the only
 * vector content. No images, no charting library.
 *
 * One dataset runs through all five, and it has to stay that way. Three
 * builders price a 96 line scope across 12 divisions. Hartley Homes
 * $1,284,000, Brindabella $1,311,000, Southern Cross $1,196,000, so the
 * median is $1.28M and the spread is $115k. Four flags across the round,
 * three of them on the cheapest tender. Hartley's marks are 88 included,
 * 5 provisional sums, 2 excluded, 1 N/A, which is what the matrix shows
 * in its Hartley column. Change one number and you change five scenes.
 */

import * as React from "react";
import { motion } from "motion/react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Lock,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";

/* Real product palette (teal app on dark chrome). */
const INK = "#e9f1f9";
const MUT = "#93a6b7";
const DIM = "#617483";
const LINE = "rgba(120,180,255,0.10)";
const CARD = "rgba(255,255,255,0.03)";
const TEAL = "#00d4c8";
const TEALS = "#7ef5ed";
const AMBER = "#ffb547";
const ROSE = "#d98d99";

const EASE = [0.22, 1, 0.36, 1] as const;

export type SceneKey = "round" | "scope" | "marking" | "instrument" | "matrix";

/* ── Chrome ─────────────────────────────────────────────────────── */

/**
 * The app's own chrome: logo, breadcrumb, avatar. The browser chrome
 * (traffic lights and the URL pill) belongs to the hero, not here.
 */
export function Frame({
  crumb,
  avatar = "AV",
  children,
  toast,
}: {
  crumb: string;
  avatar?: string;
  children: React.ReactNode;
  toast?: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#0a1119" }}>
      <div
        className="flex items-center justify-between px-4 sm:px-5 py-3 border-b shrink-0"
        style={{ borderColor: LINE }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo height={16} />
          <span className="text-[11.5px] truncate" style={{ color: MUT }}>
            / {crumb}
          </span>
        </div>
        <span
          className="size-[26px] rounded-full text-[9.5px] font-bold inline-flex items-center justify-center"
          style={{ background: "rgba(0,212,200,0.16)", color: TEALS }}
        >
          {avatar}
        </span>
      </div>
      <div className="relative flex-1 p-4 sm:p-5 overflow-hidden flex flex-col justify-center gap-2">
        {children}
      </div>
      {toast}
    </div>
  );
}

/** A notification sliding in and out of a scene. Kept for the hero. */
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
      style={{ borderColor: accent + "45", background: "rgba(7,17,28,0.96)" }}
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
      <span
        className="inline-flex size-6 items-center justify-center rounded-full"
        style={{ background: accent + "1f", color: accent }}
      >
        {icon}
      </span>
      <span className="text-[11.5px] font-medium" style={{ color: INK }}>
        {text}
      </span>
    </motion.div>
  );
}

/* ── Primitives ─────────────────────────────────────────────────── */

function Card({
  children,
  className = "",
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={"rounded-lg border " + className}
      style={{
        borderColor: accent ? "rgba(0,212,200,0.30)" : LINE,
        background: accent ? "rgba(0,212,200,0.06)" : CARD,
      }}
    >
      {children}
    </div>
  );
}

function Tile({ v, l, tone }: { v: string; l: string; tone?: "teal" | "amber" }) {
  return (
    <div className="rounded-lg border px-2.5 py-2" style={{ borderColor: LINE, background: CARD }}>
      <p
        className="font-ui font-semibold text-[15px] sm:text-[16px] leading-none tabular-nums"
        style={{ color: tone === "amber" ? AMBER : tone === "teal" ? TEALS : INK }}
      >
        {v}
      </p>
      <p className="mt-1.5 text-[9px] uppercase tracking-[0.1em] truncate" style={{ color: MUT }}>
        {l}
      </p>
    </div>
  );
}

function Avatar({ txt }: { txt: string }) {
  return (
    <span
      className="size-7 shrink-0 rounded-lg text-[10px] font-bold inline-flex items-center justify-center"
      style={{ background: "rgba(120,180,255,0.10)", color: MUT }}
    >
      {txt}
    </span>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <span
      className="block h-[4px] w-full rounded-full overflow-hidden"
      style={{ background: "rgba(120,180,255,0.10)" }}
    >
      <span
        className="block h-full rounded-full"
        style={{ width: pct + "%", background: `linear-gradient(90deg, ${TEAL}, ${TEALS})` }}
      />
    </span>
  );
}

/** A scope line's provenance: the sheet and detail it was written from. */
function Cite({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-[4px] border px-1.5 py-[1.5px] text-[9px] tabular-nums whitespace-nowrap"
      style={{ borderColor: "rgba(0,212,200,0.28)", background: "rgba(0,212,200,0.06)", color: TEALS }}
    >
      {children}
    </span>
  );
}

/* The four states a builder can put against any scope line. Their order
   is the product's order, and their colours never move: included teal,
   provisional sum amber, excluded rose, not applicable grey. */
const STATES = ["Included", "Provisional sum", "Excluded", "N/A"] as const;
type StateIndex = 0 | 1 | 2 | 3;
const STATE_INK: Record<StateIndex, string> = { 0: TEALS, 1: AMBER, 2: ROSE, 3: MUT };
const STATE_FILL: Record<StateIndex, string> = {
  0: "rgba(0,212,200,0.14)",
  1: "rgba(255,181,71,0.14)",
  2: "rgba(217,141,153,0.14)",
  3: "rgba(147,166,183,0.12)",
};

/** The four-state segmented control, as the builder sees it. */
function Segmented({ value }: { value: StateIndex }) {
  return (
    <span
      className="inline-flex shrink-0 rounded-[6px] border overflow-hidden"
      style={{ borderColor: LINE }}
    >
      {STATES.map((s, i) => {
        const on = i === value;
        return (
          <span
            key={s}
            className={
              "px-[6px] py-[3px] text-[8.5px] uppercase tracking-[0.06em] whitespace-nowrap " +
              (on ? "font-bold " : "font-medium ") +
              (i ? "border-l" : "")
            }
            style={{
              borderColor: LINE,
              background: on ? STATE_FILL[i as StateIndex] : "transparent",
              color: on ? STATE_INK[i as StateIndex] : MUT,
            }}
          >
            {s}
          </span>
        );
      })}
    </span>
  );
}

/** One tender's answer on one line, as the matrix renders it. */
function StateChip({ value, amount }: { value: StateIndex; amount?: string }) {
  const money = value === 1 && amount;
  return (
    <span
      className="inline-flex items-center justify-center rounded-[4px] px-1 sm:px-1.5 py-[2.5px] text-[8.5px] font-semibold tabular-nums whitespace-nowrap w-full"
      style={{ background: STATE_FILL[value], color: STATE_INK[value] }}
    >
      {money ? (
        <>
          {/* Narrow columns get the short figure; nothing is invented. */}
          <span className="sm:hidden">PS {amount.replace(/,000$/, "k")}</span>
          <span className="hidden sm:inline">PS {amount}</span>
        </>
      ) : (
        STATES[value]
      )}
    </span>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-0.5 text-[10px] leading-snug" style={{ color: MUT }}>
      {children}
    </p>
  );
}

/* ── AppScene router ────────────────────────────────────────────── */

export function AppScene({ scene, className }: { scene: SceneKey; className?: string }) {
  return (
    <div className={"w-full h-full" + (className ? " " + className : "")}>
      {scene === "scope" ? (
        <ScopeScene />
      ) : scene === "marking" ? (
        <MarkingScene />
      ) : scene === "instrument" ? (
        <InstrumentScene />
      ) : scene === "matrix" ? (
        <MatrixScene />
      ) : (
        <RoundScene />
      )}
    </div>
  );
}

/* ── N8 · The round ─────────────────────────────────────────────────
   Three tenders, price ascending, with the composite score refusing to
   follow. The cheapest tender carries three of the round's four flags. */

function RoundScene() {
  return (
    <Frame crumb="Round · evaluation" avatar="AV">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile v="3" l="Tenders" />
        <Tile v="$1.28M" l="Median" tone="teal" />
        <Tile v="$115k" l="Spread" />
        <Tile v="4" l="Flags" tone="amber" />
      </div>

      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[10.5px] truncate" style={{ color: MUT }}>
          Every builder verified before they priced
        </span>
        <span
          className="shrink-0 rounded-[5px] border px-1.5 py-[2px] text-[9px] uppercase tracking-[0.08em] font-semibold"
          style={{ borderColor: LINE, color: MUT }}
        >
          Price · low to high
        </span>
      </div>

      <TenderRow
        txt="SC"
        name="Southern Cross Building"
        price="$1,196,000"
        delta="$88k under the median"
        score={68}
        flags={3}
        note="Escalation uncapped · 6 lines excluded · deposit above the statutory cap"
      />
      <TenderRow
        txt="HH"
        name="Hartley Homes"
        price="$1,284,000"
        delta="the median"
        score={87}
        flags={0}
        note="Fixed price confirmed · every allowance itemised"
      />
      <TenderRow
        txt="BC"
        name="Brindabella Construction"
        price="$1,311,000"
        delta="$27k over the median"
        score={79}
        flags={1}
        note="Weather allowance declared · disclosure improves the read"
      />

      <Foot>Six published dimensions, fixed weights. Every score shows its working.</Foot>
    </Frame>
  );
}

function TenderRow({
  txt,
  name,
  price,
  delta,
  score,
  flags,
  note,
}: {
  txt: string;
  name: string;
  price: string;
  delta: string;
  score: number;
  flags: number;
  note: string;
}) {
  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: LINE, background: CARD }}>
      <div className="flex items-center gap-2.5">
        <Avatar txt={txt} />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold leading-tight truncate" style={{ color: INK }}>
            {name}
          </p>
          <p className="text-[10px] leading-tight truncate tabular-nums" style={{ color: MUT }}>
            {price} · {delta}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-ui font-semibold text-[16px] leading-none tabular-nums" style={{ color: INK }}>
            {score}
            <span className="text-[9.5px] font-medium" style={{ color: MUT }}>
              {" "}
              / 100
            </span>
          </p>
          <p
            className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-semibold"
            style={{ color: flags ? AMBER : TEALS }}
          >
            <span
              className="size-[6px] rounded-full"
              style={{ background: flags ? AMBER : TEAL }}
            />
            {flags ? (flags === 1 ? "1 flag" : flags + " flags") : "No flags"}
          </p>
        </div>
      </div>
      <span className="mt-2 block">
        <Bar pct={score} />
      </span>
      <p className="mt-1.5 text-[10px] leading-snug" style={{ color: MUT }}>
        {note}
      </p>
    </div>
  );
}

/* ── N2 · The scope of works ────────────────────────────────────────
   Division grouped, plain English, and every line points at the sheet
   it was written from. */

const SCOPE_LINES: { t: string; c: string }[] = [
  { t: "Excavate and remove spoil to the levels shown", c: "A-102 · sheet 4" },
  { t: "Footings and slab to the engineer’s design", c: "S-201 · detail 3" },
  { t: "Termite management system to the slab perimeter", c: "S-203 · sheet 2" },
  { t: "Ground floor wall framing in structural pine", c: "S-204 · sheet 7" },
];

function ScopeScene() {
  return (
    <Frame crumb="Scope of works · v1" avatar="AV">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile v="6" l="Documents" />
        <Tile v="84" l="Pages read" />
        <Tile v="96" l="Scope lines" tone="teal" />
        <Tile v="12" l="Divisions" />
      </div>

      <Card className="overflow-hidden">
        <div
          className="flex items-center gap-2 px-3 py-[7px] border-b"
          style={{ borderColor: LINE, background: "rgba(255,255,255,0.02)" }}
        >
          <ChevronDown className="size-3 shrink-0" style={{ color: MUT }} />
          <span className="text-[11px] font-semibold truncate" style={{ color: INK }}>
            Structure and groundworks
          </span>
          <span className="ml-auto shrink-0 text-[9.5px] tabular-nums" style={{ color: MUT }}>
            9 lines
          </span>
        </div>
        {SCOPE_LINES.map((l, i) => (
          <div
            key={l.t}
            className={
              "flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1 px-3 py-[7px] " +
              (i ? "border-t" : "")
            }
            style={{ borderColor: LINE }}
          >
            <span className="text-[11.5px] leading-snug" style={{ color: INK }}>
              {l.t}
            </span>
            <Cite>{l.c}</Cite>
          </div>
        ))}
      </Card>

      <div
        className="flex items-center gap-2 rounded-lg border px-3 py-[7px]"
        style={{ borderColor: LINE, background: CARD }}
      >
        <ChevronRight className="size-3 shrink-0" style={{ color: MUT }} />
        <span className="text-[11px] truncate" style={{ color: MUT }}>
          External envelope · 14 lines
        </span>
      </div>

      <Card className="flex items-center gap-2.5 px-3 py-2">
        <FileText className="size-3.5 shrink-0" style={{ color: TEALS }} />
        <p className="text-[10.5px] leading-snug" style={{ color: MUT }}>
          Every line cites a document. Reviewed by our team, approved by you before pricing.
        </p>
      </Card>
    </Frame>
  );
}

/* ── N6 · Marking the scope ─────────────────────────────────────────
   Hartley Homes walking the same 96 lines. The counter at the bottom is
   the tender's whole shape in one line. */

const MARKS: { t: string; s: StateIndex; amount?: string; locked?: boolean }[] = [
  { t: "Footings and slab", s: 0 },
  { t: "Rock excavation", s: 1, amount: "$18,000" },
  { t: "Landscaping", s: 2 },
  { t: "Pool", s: 3 },
  { t: "Tapware and fittings", s: 1, amount: "$9,500", locked: true },
];

function MarkingScene() {
  return (
    <Frame crumb="Tender · the schedule" avatar="HH">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11.5px] font-semibold" style={{ color: INK }}>
          Mark every line
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: MUT }}>
          96 of 96 marked
        </span>
      </div>

      <Card className="overflow-hidden">
        {MARKS.map((m, i) => (
          <div key={m.t} className={i ? "border-t" : ""} style={{ borderColor: LINE }}>
            <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5 px-3 py-2">
              <span
                className="inline-flex items-center gap-1.5 text-[11.5px] leading-snug"
                style={{ color: INK }}
              >
                {m.locked ? <Lock className="size-3 shrink-0" style={{ color: AMBER }} /> : null}
                {m.t}
              </span>
              <span className="inline-flex items-center gap-2">
                {m.amount ? (
                  <span className="text-[10.5px] font-semibold tabular-nums" style={{ color: AMBER }}>
                    {m.amount}
                  </span>
                ) : null}
                <Segmented value={m.s} />
              </span>
            </div>
            {m.locked ? (
              <p className="px-3 pb-2 -mt-0.5 text-[9.5px]" style={{ color: MUT }}>
                Owner allowance, carried by every builder
              </p>
            ) : null}
          </div>
        ))}
      </Card>

      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 tabular-nums"
        style={{ borderColor: LINE, background: CARD }}
      >
        <span className="text-[10.5px] font-semibold" style={{ color: INK }}>
          96 lines
        </span>
        <Legend tone={0}>88 included</Legend>
        <Legend tone={1}>5 provisional sums</Legend>
        <Legend tone={2}>2 excluded</Legend>
        <Legend tone={3}>1 N/A</Legend>
      </div>
    </Frame>
  );
}

function Legend({ tone, children }: { tone: StateIndex; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: MUT }}>
      <span className="size-[6px] rounded-full shrink-0" style={{ background: STATE_INK[tone] }} />
      {children}
    </span>
  );
}

/* ── N5 · The submission instrument ─────────────────────────────────
   Eleven sections in the product's own order (src/modules/tenders/
   instrument.ts). The three questions in the pane are real, and all
   three live in section 4, Commercial submission. So the rail ticks
   three sections, highlights the fourth, dims the rest, and the readout
   says 4 of 11. Moving the readout without moving the questions puts a
   number on screen that the rail contradicts. */

const SECTIONS = [
  "Eligibility",
  "Project understanding",
  "Company credentials",
  "Commercial submission",
  "What’s included",
  "What’s not included",
  "Provisional sums and prime costs",
  "Programme",
  "Delivery",
  "Builder commentary",
  "Sign-off",
];
const CURRENT = 3; // Commercial submission, the section shown in the pane

function InstrumentScene() {
  return (
    <Frame crumb="Tender · submission" avatar="HH">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11.5px] font-semibold" style={{ color: INK }}>
          Submission instrument
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: MUT }}>
          4 of 11 sections
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2.5 items-start">
        <Card className="p-1.5">
          {SECTIONS.map((s, i) => {
            const done = i < CURRENT;
            const now = i === CURRENT;
            return (
              <span
                key={s}
                className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-[3px]"
                style={{ background: now ? "rgba(0,212,200,0.10)" : "transparent" }}
              >
                {done ? (
                  <Check className="size-[11px] shrink-0" strokeWidth={3} style={{ color: TEALS }} />
                ) : (
                  <span
                    className="size-[9px] shrink-0 rounded-full border"
                    style={{
                      borderColor: now ? TEAL : "rgba(120,180,255,0.22)",
                      background: now ? "rgba(0,212,200,0.35)" : "transparent",
                    }}
                  />
                )}
                <span
                  className="text-[10px] leading-[1.3]"
                  style={{ color: now ? INK : done ? MUT : DIM, fontWeight: now ? 700 : 400 }}
                >
                  {s}
                </span>
              </span>
            );
          })}
        </Card>

        <div className="flex flex-col gap-2">
          <Question ref_="4.4" prompt="Is your price fixed, rather than an estimate?">
            <Choices options={["Yes", "No"]} selected={0} />
          </Question>
          <Question ref_="4.6" prompt="Deposit">
            <span
              className="inline-flex items-baseline gap-1 rounded-[6px] border px-2 py-[3px]"
              style={{ borderColor: "rgba(0,212,200,0.30)", background: "rgba(0,212,200,0.06)" }}
            >
              <span className="text-[12px] font-semibold tabular-nums" style={{ color: INK }}>
                5
              </span>
              <span className="text-[9.5px]" style={{ color: MUT }}>
                per cent
              </span>
            </span>
          </Question>
          <Question ref_="4.10" prompt="Cost escalation under the contract">
            <Choices options={["None", "Capped", "Uncapped"]} selected={0} />
          </Question>
        </div>
      </div>

      <Foot>The same structured questions for every builder on the round.</Foot>
    </Frame>
  );
}

function Question({
  ref_,
  prompt,
  children,
}: {
  ref_: string;
  prompt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border px-2.5 py-2" style={{ borderColor: LINE, background: CARD }}>
      <p className="flex items-start gap-1.5 text-[10.5px] leading-snug" style={{ color: INK }}>
        <span className="shrink-0 tabular-nums" style={{ color: MUT }}>
          {ref_}
        </span>
        {prompt}
      </p>
      <span className="mt-1.5 block">{children}</span>
    </div>
  );
}

function Choices({ options, selected }: { options: string[]; selected: number }) {
  return (
    <span className="inline-flex rounded-[6px] border overflow-hidden" style={{ borderColor: LINE }}>
      {options.map((o, i) => (
        <span
          key={o}
          className={
            "px-2 py-[3px] text-[9.5px] whitespace-nowrap " +
            (i === selected ? "font-bold " : "font-medium ") +
            (i ? "border-l" : "")
          }
          style={{
            borderColor: LINE,
            background: i === selected ? "rgba(0,212,200,0.14)" : "transparent",
            color: i === selected ? TEALS : MUT,
          }}
        >
          {o}
        </span>
      ))}
    </span>
  );
}

/* ── N10 · The scope matrix ─────────────────────────────────────────
   The whole argument in one table. The cheapest tender is the one with
   the holes in it, and the holes have names. */

type Row = {
  t: string;
  cells: [StateIndex, StateIndex, StateIndex];
  amounts?: (string | undefined)[];
  /** Rows the tenders read differently. Amber rail, brighter label. */
  differs?: boolean;
};

const MATRIX: Row[] = [
  { t: "Excavate and remove spoil", cells: [0, 0, 0] },
  {
    t: "Rock excavation",
    cells: [1, 1, 2],
    amounts: ["$18,000", "$24,000", undefined],
    differs: true,
  },
  { t: "Footings and slab", cells: [0, 0, 0] },
  { t: "Termite management system", cells: [0, 0, 0] },
  { t: "Ground floor wall framing", cells: [0, 0, 0] },
  { t: "Tapware and fittings", cells: [1, 1, 1], amounts: ["$9,500", "$9,500", "$9,500"] },
  { t: "Landscaping", cells: [2, 2, 2] },
  { t: "Site clean and waste removal", cells: [0, 0, 2], differs: true },
];

const COLUMNS: { name: string; price: string }[] = [
  { name: "Hartley Homes", price: "$1.28M" },
  { name: "Brindabella", price: "$1.31M" },
  { name: "Southern Cross", price: "$1.20M" },
];

function MatrixScene() {
  return (
    <Frame crumb="Evaluation · scope matrix" avatar="AV">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11.5px] font-semibold" style={{ color: INK }}>
          Every line, every tender
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: MUT }}>
          96 lines compared
        </span>
      </div>

      <Card className="overflow-hidden">
        <div
          className="grid grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] sm:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))] gap-x-1.5 pl-2 pr-2.5 py-1.5 border-b"
          style={{ borderColor: LINE, background: "rgba(255,255,255,0.02)", borderLeft: "2px solid transparent" }}
        >
          <span />
          {COLUMNS.map((c) => (
            <span key={c.name} className="min-w-0 text-center">
              <span className="block text-[9.5px] font-semibold leading-tight truncate" style={{ color: INK }}>
                {c.name}
              </span>
              <span className="block text-[9px] leading-tight tabular-nums" style={{ color: MUT }}>
                {c.price}
              </span>
            </span>
          ))}
        </div>

        {MATRIX.map((r, i) => (
          <div
            key={r.t}
            className={
              "grid grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] sm:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))] items-center gap-x-1.5 pl-2 pr-2.5 py-[5px] " +
              (i ? "border-t" : "")
            }
            style={{
              borderColor: LINE,
              background: r.differs ? "rgba(255,181,71,0.06)" : "transparent",
              borderLeft: "2px solid " + (r.differs ? AMBER : "transparent"),
            }}
          >
            <span
              className="text-[9.5px] sm:text-[10px] leading-[1.2] pr-1"
              style={{ color: r.differs ? INK : MUT, fontWeight: r.differs ? 600 : 400 }}
            >
              {r.t}
            </span>
            {r.cells.map((c, j) => (
              <StateChip key={j} value={c} amount={r.amounts?.[j]} />
            ))}
          </div>
        ))}
      </Card>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-0.5">
        <Legend tone={0}>Included</Legend>
        <Legend tone={1}>PS, provisional sum</Legend>
        <Legend tone={2}>Excluded</Legend>
        <Legend tone={3}>N/A</Legend>
      </div>

      <Foot>
        11 of the 96 lines are treated differently. Every one is a question you can put to the
        builders, on the record.
      </Foot>
    </Frame>
  );
}
