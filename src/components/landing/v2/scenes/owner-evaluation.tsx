"use client";

/**
 * Homeowner / practice · step four — read the tenders.
 *
 * The evaluation surface at /owner/projects/[slug]/tenders, scrolled
 * top to bottom. The other scenes demonstrate one gesture; this one
 * demonstrates depth, because depth is the argument. An owner does not
 * need to be told the analysis is thorough, they need to watch it go
 * past: the round strip, the overview paragraph the engine writes, the
 * firm-versus-allowance split, one tender's six weighted dimensions,
 * the decision grid, the scope items the builders read differently,
 * and the questions the round leaves open.
 *
 * How the scroll works. A fixed viewport holds one column of sections
 * at declared heights, and the script drives `y` to hard-coded
 * waypoints computed from those heights at module scope. Nothing is
 * measured at runtime: a scene that measures itself drifts the first
 * time a font loads late or a string wraps differently, and a deck
 * card that drifts is worse than one that never moved.
 *
 * The pointer intervenes twice, because a pointer that touches
 * everything is decoration. It opens Meridian's weighted overall into
 * the six dimensions, and it opens the significant flag on the
 * cheapest tender. Everything between those is reading.
 *
 * Three fidelity notes worth keeping if this file is edited:
 *
 *   · The dimension labels carry ampersands ("Credentials & capacity",
 *     "Delivery & aftercare"). Spelling them out is the dossier's
 *     section-heading style, not the label beside a score.
 *   · The six render in rubric order, which is not weight order, and
 *     the earned scores weight to the 86 shown on the card. A reader
 *     who checks the arithmetic will find it holds, because in the
 *     product it always does.
 *   · Every figure agrees with the seeded example round the app ships:
 *     three prices inc GST, $105,000 of allowances on one of them,
 *     and the two significant flags that follow from it.
 */

import * as React from "react";
import { motion } from "motion/react";
import {
  ChevronDown,
  ClipboardCopy,
  FileDown,
  GitCompareArrows,
  Lightbulb,
  ListChecks,
  Play,
  Scale,
  ScrollText,
  Sparkles,
} from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, TONE, Card, Frame, Kicker, ListFade } from "./kit";

type Hot = "score" | "flag" | null;
type S = {
  /** The column's offset. Negative scrolls the page up. */
  y: number;
  /** Which nav pill is lit, as an index into NAV. -1 is the page top. */
  sec: number;
  dims: boolean;
  flag: boolean;
  /** The decision grid's teal cells, swept in once the grid is read. */
  lit: boolean;
  hot: Hot;
  /** Fades the column for the loop, so the rewind is never watched. */
  out: boolean;
};

const RESTING: S = { y: 0, sec: -1, dims: false, flag: false, lit: false, hot: null, out: false };

/* ── the column's geometry ───────────────────────────────────────── */

const GAP = 14;

/**
 * Declared section heights. Each band holds its height whatever its
 * contents do, so a string that wraps one line further on a phone
 * loses a line inside its own card rather than pushing the whole page
 * out of register. Checked against the rendered scene at both ends of
 * the panel's width range.
 */
const H = {
  head: 168,
  overview: 248,
  money: 282,
  meridian: 245,
  meridianOpen: 341,
  corten: 230,
  cortenOpen: 315,
  grid: 386,
  differ: 250,
  agenda: 408,
  record: 58,
} as const;

/** The nav's resting offset inside the head band: title, strip, gaps. */
const NAV_TOP = 136;

/** Once pinned the nav covers the top of the viewport, so every
 *  waypoint stops a nav's height short of the section it lands on.
 *  This is the app's own `scroll-mt-28`, at scene scale. */
const NAV_H = 36;

/**
 * Where each section's top sits, measured with both tender cards
 * already open, which is the state the script leaves them in before it
 * scrolls past them.
 */
const TOP = (() => {
  const overview = H.head + GAP;
  const money = overview + H.overview + GAP;
  const meridian = money + H.money + GAP;
  const corten = meridian + H.meridianOpen + GAP;
  const grid = corten + H.cortenOpen + GAP;
  const differ = grid + H.grid + GAP;
  const agenda = differ + H.differ + GAP;
  return { overview, money, meridian, corten, grid, differ, agenda };
})();

/** A waypoint: where the column sits and which pill that lights. */
const AT = {
  overview: { y: NAV_H - TOP.overview, sec: 1 },
  money: { y: NAV_H - TOP.money, sec: 1 },
  meridian: { y: NAV_H - TOP.meridian, sec: 2 },
  corten: { y: NAV_H - TOP.corten, sec: 2 },
  grid: { y: NAV_H - TOP.grid, sec: 3 },
  differ: { y: NAV_H - TOP.differ, sec: 3 },
  agenda: { y: NAV_H - TOP.agenda, sec: 5 },
} as const;

/** The canvas at 92%, which is what the app's sticky nav sits on.
 *  Derived rather than written out, so the palette stays in kit.tsx. */
const GLASS = `color-mix(in srgb, ${C.canvas} 92%, transparent)`;

/** Slow enough to read as scrolling, quick enough to keep the loop in
 *  twenty seconds. */
const SCROLL = { duration: 0.8, ease: [0.22, 1, 0.36, 1] } as const;
const OPEN = { duration: 0.4, ease: [0.16, 1, 0.3, 1] } as const;

/* ── what the round says ─────────────────────────────────────────── */

/** The round strip. Four stat cells, exactly as the app computes them. */
const STRIP: Array<[string, string, string]> = [
  ["Tenders received", "3", "project live 14 days"],
  ["Lowest tender inc GST", "$712,800", "highest $800,800 · 12% spread"],
  ["Build period", "30–36 weeks", ""],
  ["Significant flags", "2", "raised across the round"],
];

const NAV = [
  "The builders",
  "Overview",
  "The tenders",
  "Side by side",
  "Ideas",
  "Questions",
  "The record",
];

/**
 * The single best paragraph on the surface, and the reason this scene
 * pauses longest here. It is computed, not written: the engine finds
 * the cheapest tender, the allowances that make it cheap, and the
 * overrun that would erase the saving.
 */
const PRICE_STORY =
  "Corten Build Co. is $37,000 cheaper on paper, but $105,000 of its price sits in allowances of its own choosing that Meridian Building Co has priced in full. If those allowances overrun their stated figures by more than 35%, the saving is gone. The decision is not which number is lower; it is how much you trust the allowances.";

/**
 * Where the money stands. `bar` is the tender's share of the highest
 * price ex GST, which is what sets the container width, and `firm` is
 * how much of that bar is committed in the contract sum.
 */
const MONEY = [
  {
    name: "Corten Build Co.",
    price: "$712,800",
    bar: 89,
    firm: 84,
    note: "$543,000 committed · $105,000 in allowances that can move either way",
  },
  { name: "Meridian Building Co", price: "$753,500", bar: 94, firm: 100, note: "Every dollar committed" },
  { name: "Brightwater Homes", price: "$800,800", bar: 100, firm: 100, note: "Every dollar committed" },
] as const;

/**
 * The six dimensions in rubric order with the points Meridian earned.
 * `leads` is the round leader on that line, which is what turns the bar
 * and the number teal on the real card. Weighted, these are the 86 the
 * card prints.
 */
const DIMS: Array<{ label: string; score: number; leads?: boolean }> = [
  { label: "Price firmness", score: 100, leads: true },
  { label: "Scope coverage", score: 100, leads: true },
  { label: "Preparation", score: 54 },
  { label: "Credentials & capacity", score: 80 },
  { label: "Delivery & aftercare", score: 94, leads: true },
  { label: "Programme confidence", score: 60 },
];

/** One of the two significant flags on the cheapest tender, printed as
 *  the dossier prints it: what it is, what it means, what to ask. */
const FLAG = {
  word: "Significant",
  label: "16% of the price can still move",
  detail: "$105,000 sits in provisional sums and prime costs (2 PS, 3 PC).",
  ask: "Ask which allowances they would fix if the documents were finalised now.",
};

/** The three tender columns, in price order, which is the order the
 *  grid and the disagreement table both read left to right. */
const COLUMNS = [
  { mono: "CB", name: "Corten Build Co.", price: "$712,800 inc GST" },
  { mono: "MB", name: "Meridian Building Co", price: "$753,500 inc GST" },
  { mono: "BH", name: "Brightwater Homes", price: "$800,800 inc GST" },
];

/**
 * The decision grid. `win` holds the columns that take the teal wash,
 * and it is empty wherever the app suppresses the highlight, because a
 * row where everyone wins is a row where nobody does.
 */
const GRID: Array<{
  title: string;
  rows: Array<{ label: string; v: [string, string, string]; win: number[] }>;
}> = [
  {
    title: "The money",
    rows: [
      { label: "Price inc GST", v: ["$712,800", "$753,500", "$800,800"], win: [0] },
      { label: "Firm portion", v: ["$543,000 (84%)", "$685,000 (100%)", "$728,000 (100%)"], win: [1, 2] },
      { label: "Allowances", v: ["$105,000 (2 PS, 3 PC)", "None", "None"], win: [1, 2] },
      { label: "Escalation", v: ["Uncapped", "None", "None"], win: [] },
    ],
  },
  {
    title: "The programme",
    rows: [
      { label: "Build period", v: ["36 weeks", "34 weeks", "30 weeks"], win: [2] },
      { label: "Liquidated damages", v: ["Not offered", "Not offered", "$2,500/week"], win: [2] },
    ],
  },
  {
    title: "Scope",
    rows: [
      { label: "Trades in the price", v: ["18 of 22", "23 of 23", "23 of 23"], win: [1, 2] },
      { label: "Excluded scope items", v: ["2", "0", "0"], win: [1, 2] },
    ],
  },
];

/** The scope items the three tenders read differently, most
 *  consequential first, which is the order the engine sorts them in. */
const DIFFER: Array<{ trade: string; s: [string, string, string] }> = [
  { trade: "External works", s: ["Excluded", "Included", "Included"] },
  { trade: "External finishes", s: ["Excluded", "Included", "Included"] },
  { trade: "Ground works", s: ["Allowance", "Included", "Included"] },
  { trade: "Painting", s: ["Allowance", "Included", "Included"] },
];

/** The surface's own tint per scope state. */
const STATE_TONE: Record<string, { text: string; bg: string }> = {
  Included: { text: TONE.good.text, bg: TONE.good.bg },
  Allowance: { text: TONE.warn.text, bg: TONE.warn.bg },
  Excluded: { text: TONE.risk.text, bg: TONE.risk.bg },
};

/** The pre-decision agenda. Every line is a flag's own question, put
 *  in the owner's mouth rather than left as a finding. */
const ROUND_ASKS = [
  "Share the soil report with every builder so all prices rest on the same ground conditions.",
  "9 trades are treated differently across the round. Confirm each builder priced the same scope before comparing numbers.",
];

const CORTEN_ASKS = [
  "Ask for the escalation clause in writing, and whether they will cap it.",
  "Ask which allowances they would fix if the documents were finalised now.",
  "Ask them to re-price the allowances from the drawings and schedules.",
  "Ask for their rock rate per cubic metre now, not when it happens.",
  "Ask for their estimate of the fees for this project.",
];

/* ── the scene ───────────────────────────────────────────────────── */

export function OwnerEvaluationScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 900,
    script: [
      { wait: 1000 },

      // The overview. Everything else on the page is evidence; this is
      // the finding, so it gets the longest hold in the loop.
      { set: AT.overview },
      { wait: 4000 },

      { set: AT.money },
      { wait: 1700 },

      // One tender, read in full. The pointer opens the working.
      { set: AT.meridian },
      { wait: 900 },
      { move: "score" },
      { set: { hot: "score" } },
      { wait: 200 },
      { click: true },
      { set: { dims: true, hot: null } },
      { wait: 1500 },

      // The cheapest tender, and what its price is hiding.
      { set: AT.corten },
      { wait: 900 },
      { move: "flag" },
      { set: { hot: "flag" } },
      { wait: 180 },
      { click: true },
      { set: { flag: true, hot: null } },
      { wait: 1500 },

      // The grid. Its teal cells arrive a row at a time, which is how a
      // reader sees that no single tender wins everything.
      { cursor: "hide" },
      { set: AT.grid },
      { wait: 700 },
      { set: { lit: true } },
      { wait: 2000 },

      { set: AT.differ },
      { wait: 1400 },

      { set: AT.agenda },
      { wait: 1800 },

      // Out before the rewind. Two and a half thousand pixels travelling
      // back up is the one movement in this scene nobody should watch.
      { set: { out: true } },
      { wait: 420 },
    ],
  });

  // Sticky, done with transform alone: the nav rides with the column
  // until it reaches the top of the viewport and then stops there.
  const navY = Math.max(0, NAV_TOP + state.y);

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame crumb="The tender evaluation">
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <motion.div
            className="absolute inset-x-0 top-0 flex flex-col"
            style={{ gap: GAP }}
            initial={false}
            animate={{ y: state.y, opacity: state.out ? 0 : 1 }}
            transition={{
              // A waypoint of zero is only ever the loop restarting, and
              // that one cut is instant behind the fade.
              y: state.y === 0 ? { duration: 0 } : SCROLL,
              opacity: { duration: 0.34 },
            }}
          >
            <Band h={H.head}>
              <p
                className="font-ui font-semibold uppercase tracking-[-0.02em] text-[15px] sm:text-[16.5px] leading-[1.05] line-clamp-2"
                style={{ color: C.ink, height: 34 }}
              >
                Single dwelling · Pascoe Vale, VIC
              </p>
              <Card className="mt-2.5 overflow-hidden" style={{ height: 84 }}>
                <div className="grid grid-cols-4 h-full">
                  {STRIP.map(([label, value, sub], i) => (
                    <div
                      key={label}
                      className={"px-1.5 sm:px-2.5 py-2.5 min-w-0 " + (i ? "border-l" : "")}
                      style={{ borderColor: C.line }}
                    >
                      <p
                        className="text-[7px] sm:text-[7.5px] uppercase tracking-[0.14em] leading-[1.3] line-clamp-2"
                        style={{ color: C.dim }}
                      >
                        {label}
                      </p>
                      <p
                        className="mt-1 font-ui font-semibold text-[11px] sm:text-[15px] leading-none tabular-nums truncate"
                        style={{ color: C.ink }}
                      >
                        {value}
                      </p>
                      {sub ? (
                        <p
                          className="mt-1 text-[7.5px] sm:text-[8px] leading-[1.3] line-clamp-2"
                          style={{ color: C.muted }}
                        >
                          {sub}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            </Band>

            {/* ── the overview ── */}
            <Band h={H.overview}>
              <div className="h-full flex flex-col items-center justify-center text-center px-1">
                <p
                  className="text-[8px] uppercase tracking-[0.26em] font-semibold"
                  style={{ color: C.tealInk }}
                >
                  What this round comes down to
                </p>
                <p
                  className="mt-2 font-ui font-semibold uppercase tracking-[-0.02em] text-[26px] sm:text-[30px] leading-[0.95]"
                  style={{ color: C.ink }}
                >
                  The overview
                </p>
                <p
                  className="mt-4 max-w-[52ch] text-[11.5px] sm:text-[12px] leading-[1.7]"
                  style={{ color: C.ink }}
                >
                  {PRICE_STORY}
                </p>
              </div>
            </Band>

            {/* ── where the money stands ── */}
            <Band h={H.money}>
              <Card className="h-full overflow-hidden px-3.5 py-3">
                <Kicker icon={Scale}>Where the money stands</Kicker>
                <p className="mt-1.5 text-[9px] leading-[1.45] line-clamp-2" style={{ color: C.muted }}>
                  Each bar is a tender price. The solid part is committed; the lighter tail can still
                  move.
                </p>
                <div className="mt-3 flex flex-col gap-2.5">
                  {MONEY.map((m) => (
                    <div key={m.name}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate text-[10px] font-semibold" style={{ color: C.ink }}>
                          {m.name}
                        </p>
                        <p className="shrink-0 font-ui font-semibold text-[12px] leading-none tabular-nums" style={{ color: C.ink }}>
                          {m.price}
                          <span className="ml-1 text-[8px] font-normal" style={{ color: C.dim }}>
                            inc GST
                          </span>
                        </p>
                      </div>
                      <div className="mt-1" style={{ width: `${m.bar}%`, minWidth: "42%" }}>
                        <FirmSplit firm={m.firm} h={9} />
                      </div>
                      <p className="mt-1 text-[8.5px] leading-[1.35] truncate" style={{ color: C.muted }}>
                        {m.note}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  className="mt-3 flex items-center gap-x-3 rounded-[5px] border px-2.5 py-1.5 whitespace-nowrap overflow-hidden"
                  style={{ borderColor: C.line, background: C.canvas }}
                >
                  <span className="inline-flex items-center gap-1.5 text-[8px]" style={{ color: C.muted }}>
                    <span
                      className="inline-block h-2 w-4 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${C.ink}, ${C.tealInk})` }}
                    />
                    Firm: committed in the contract sum
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[8px]" style={{ color: C.muted }}>
                    <span className="inline-block h-2 w-4 rounded-full" style={{ background: TONE.warn.border }} />
                    Allowances: can move up or down
                  </span>
                </div>
              </Card>
            </Band>

            {/* ── the tenders ── */}
            <TenderCard
              name="Meridian Building Co"
              mono="MB"
              years="14 years in operation"
              price="$753,500"
              programme="34 weeks · keys May 2027"
              firm={100}
              firmNote="Fully priced, no allowances"
              score={86}
              flags={<span className="font-semibold" style={{ color: TONE.good.text }}>No significant flags</span>}
              attention="3 worth attention"
              extra="Commentary offered"
              h={state.dims ? H.meridianOpen : H.meridian}
              scoreKey="score"
              hot={state.hot === "score"}
              open={state.dims}
            />

            <TenderCard
              name="Corten Build Co."
              mono="CB"
              years="6 years in operation"
              price="$712,800"
              programme="36 weeks · keys Jun 2027"
              firm={84}
              firmNote="Firm to 84% · $105,000 in allowances"
              score={47}
              flags={<span className="font-semibold" style={{ color: TONE.risk.text }}>2 significant flags</span>}
              attention="6 worth attention"
              h={state.flag ? H.cortenOpen : H.corten}
              flagKey="flag"
              hot={state.hot === "flag"}
              openFlag={state.flag}
            />

            {/* ── the decision grid ── */}
            <Band h={H.grid}>
              <Card className="h-full overflow-hidden flex flex-col">
                <SectionHead
                  icon={Scale}
                  kicker="Side by side"
                  title="The decision grid"
                  lede="Every row is the builders' own answers, lined up. A teal cell holds the strongest position on that line."
                />
                <div className="px-3 py-1.5 border-b" style={{ borderColor: C.line }}>
                  <Row>
                    <span />
                    {COLUMNS.map((col) => (
                      <span key={col.name} className="min-w-0 flex items-center gap-1.5 pr-1">
                        <span className="hidden sm:inline-flex">
                          <Mono txt={col.mono} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[9px] font-semibold leading-tight" style={{ color: C.ink }}>
                            {col.name}
                          </span>
                          <span className="block truncate text-[8px] leading-tight" style={{ color: C.muted }}>
                            {col.price}
                          </span>
                        </span>
                      </span>
                    ))}
                  </Row>
                </div>

                <div className="px-3 min-h-0">
                  {GRID.map((group, gi) => (
                    <div key={group.title}>
                      <p
                        className="pt-2 pb-[3px] text-[8px] uppercase tracking-[0.18em]"
                        style={{ color: C.dim }}
                      >
                        {group.title}
                      </p>
                      {group.rows.map((r, ri) => (
                        <div key={r.label} className="border-t" style={{ borderColor: C.line }}>
                          <Row h={22}>
                            <span className="truncate text-[9px] pr-1" style={{ color: C.muted }}>
                              {r.label}
                            </span>
                            {r.v.map((v, ci) => {
                              const win = state.lit && r.win.includes(ci);
                              return (
                                <span
                                  key={ci}
                                  className="min-w-0 h-full flex items-center px-1 -ml-1 text-[9px] leading-[1.25] transition-colors duration-500"
                                  style={{
                                    background: win ? TONE.good.bg : undefined,
                                    color: win ? TONE.good.text : C.ink,
                                    fontWeight: win ? 600 : 400,
                                    transitionDelay: `${(gi * 4 + ri) * 90}ms`,
                                  }}
                                >
                                  <span className="line-clamp-2">{v}</span>
                                </span>
                              );
                            })}
                          </Row>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <p
                  className="mt-auto border-t px-3 py-1.5 text-[8px] leading-[1.3]"
                  style={{ borderColor: C.line, color: C.dim }}
                >
                  Open any builder&apos;s full evaluation to see the working behind their dimension
                  scores.
                </p>
              </Card>
            </Band>

            {/* ── where the tenders differ ── */}
            <Band h={H.differ}>
              <Card className="h-full overflow-hidden flex flex-col">
                <SectionHead
                  icon={GitCompareArrows}
                  kicker="The same project, read differently"
                  title="Where the tenders differ"
                  lede="9 scope items are treated differently across these tenders. Until each builder prices the same scope, their totals are not the same number."
                />
                <div className="px-3">
                  <Row h={20}>
                    {["Scope item", ...COLUMNS.map((c) => c.name)].map((c) => (
                      <span
                        key={c}
                        className="truncate pr-1 text-[7.5px] uppercase tracking-[0.14em]"
                        style={{ color: C.dim }}
                      >
                        {c}
                      </span>
                    ))}
                  </Row>
                  {DIFFER.map((d) => (
                    <div key={d.trade} className="border-t" style={{ borderColor: C.line }}>
                      <Row h={24}>
                        <span className="truncate pr-1 text-[9.5px]" style={{ color: C.ink }}>
                          {d.trade}
                        </span>
                        {d.s.map((s, i) => {
                          const t = STATE_TONE[s]!;
                          return (
                            <span key={i} className="min-w-0 pr-1">
                              <span
                                className="inline-block max-w-full truncate rounded-full px-1.5 py-[2px] text-[8.5px] font-medium"
                                style={{ color: t.text, background: t.bg }}
                              >
                                {s}
                              </span>
                            </span>
                          );
                        })}
                      </Row>
                    </div>
                  ))}
                </div>
                <p
                  className="mt-auto border-t py-1.5 flex items-center justify-center gap-1.5 text-[9px]"
                  style={{ borderColor: C.line, color: C.muted }}
                >
                  <ChevronDown className="size-3" />
                  Show all 9 lines
                </p>
              </Card>
            </Band>

            {/* ── before you decide ── */}
            <Band h={H.agenda}>
              <Card className="h-full overflow-hidden flex flex-col">
                <SectionHead
                  icon={ListChecks}
                  kicker="The pre-decision agenda"
                  title="Before you decide"
                  lede="7 questions this round leaves open. Put them to the builders, and the decision usually makes itself."
                  right={
                    <span
                      className="shrink-0 inline-flex items-center gap-1 rounded-[5px] px-2 py-[5px] text-[9px] font-semibold"
                      style={{ background: C.ink, color: C.canvas }}
                    >
                      <ClipboardCopy className="size-2.5" />
                      Copy the agenda
                    </span>
                  }
                />
                <div className="px-3.5 py-2">
                  <p className="flex items-center gap-1.5">
                    <Sparkles className="size-2.5" style={{ color: TONE.good.text }} />
                    <span
                      className="text-[8px] uppercase tracking-[0.16em]"
                      style={{ color: C.dim }}
                    >
                      For the round
                    </span>
                  </p>
                  <Agenda items={ROUND_ASKS} from={1} tone="good" />
                </div>
                <div className="px-3.5 py-2 border-t" style={{ borderColor: C.line }}>
                  <p className="flex items-center gap-1.5">
                    <Mono txt="CB" />
                    <span className="text-[9.5px] font-semibold" style={{ color: C.ink }}>
                      For Corten Build Co.
                    </span>
                  </p>
                  <Agenda items={CORTEN_ASKS} from={3} tone="ink" />
                </div>
              </Card>
            </Band>

            {/* ── the full record ── */}
            <Band h={H.record}>
              <Card className="h-full overflow-hidden px-3.5 py-2.5 flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-[8px] uppercase tracking-[0.18em]" style={{ color: C.tealInk }}>
                    Module by module
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-tight" style={{ color: C.ink }}>
                    The full record
                  </span>
                  <span className="block truncate text-[8.5px]" style={{ color: C.muted }}>
                    Every disclosed answer, question by question, exactly as submitted.
                  </span>
                </span>
                <ChevronDown className="size-3.5 shrink-0" style={{ color: C.dim }} />
              </Card>
            </Band>

            <div aria-hidden style={{ height: 20 }} />
          </motion.div>

          {/* The section nav, sticky the way the real one is: it travels
              with the page until it meets the top and then holds. */}
          <motion.div
            className="absolute inset-x-0 top-0 z-20 border-b backdrop-blur-[2px]"
            style={{ borderColor: C.line, background: GLASS }}
            initial={false}
            animate={{ y: navY, opacity: state.out ? 0 : 1 }}
            transition={{
              y: state.y === 0 ? { duration: 0 } : SCROLL,
              opacity: { duration: 0.34 },
            }}
          >
            <div className="flex items-center gap-1 px-0.5 py-1.5" style={{ height: 32 }}>
              <div className="relative min-w-0 flex-1 flex items-center gap-0.5 overflow-hidden">
                {NAV.map((label, i) => (
                  <span
                    key={label}
                    className="shrink-0 rounded-full px-1.5 py-[3px] text-[8.5px] transition-colors duration-300"
                    style={
                      state.sec === i
                        ? { color: TONE.good.text, background: TONE.good.bg, fontWeight: 600 }
                        : { color: C.muted }
                    }
                  >
                    {label}
                  </span>
                ))}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-0 w-6"
                  style={{ background: `linear-gradient(90deg, transparent, ${GLASS})` }}
                />
              </div>
              <span
                className="shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[8.5px] font-semibold"
                style={{ borderColor: C.line2, color: C.muted }}
              >
                <FileDown className="size-2.5" />
                The report
              </span>
              <span
                className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[8.5px] font-semibold"
                style={{ background: C.ink, color: C.canvas }}
              >
                <Play className="size-2.5 fill-current" />
                The quick read
              </span>
            </div>
          </motion.div>

          <ListFade />
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/* ── the column's furniture ──────────────────────────────────────── */

/**
 * One section of the page at its declared height, which is what makes
 * the waypoints above deterministic. Deliberately not clipped: the
 * cards inside clip their own content, and clipping here as well would
 * cut off the shadow that puts the paper above the canvas.
 */
function Band({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <div className="shrink-0" style={{ height: h }}>
      {children}
    </div>
  );
}

/** The four-column measure every table on this surface shares. */
function Row({ children, h }: { children: React.ReactNode; h?: number }) {
  return (
    <div
      className="grid items-center gap-0 grid-cols-[0.85fr_repeat(3,minmax(0,1fr))] sm:grid-cols-[1.12fr_repeat(3,minmax(0,1fr))]"
      style={{ height: h }}
    >
      {children}
    </div>
  );
}

/** A card's header: kicker, display heading, one line of why. */
function SectionHead({
  icon,
  kicker,
  title,
  lede,
  right,
}: {
  icon: React.ComponentProps<typeof Kicker>["icon"];
  kicker: string;
  title: string;
  lede: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="px-3.5 pt-2.5 pb-2.5 border-b flex items-start gap-2" style={{ borderColor: C.line }}>
      <div className="min-w-0 flex-1">
        <Kicker icon={icon}>{kicker}</Kicker>
        <p
          className="mt-1 font-ui font-semibold uppercase tracking-[-0.015em] text-[17px] leading-none"
          style={{ color: C.ink }}
        >
          {title}
        </p>
        <p className="mt-1.5 text-[9px] leading-[1.45] line-clamp-2" style={{ color: C.muted }}>
          {lede}
        </p>
      </div>
      {right}
    </div>
  );
}

/** A numbered block of the pre-decision agenda. */
function Agenda({ items, from, tone }: { items: string[]; from: number; tone: "good" | "ink" }) {
  const t = TONE[tone];
  return (
    <ol className="mt-1.5 flex flex-col gap-1.5">
      {items.map((q, i) => (
        <li key={q} className="flex items-start gap-2">
          <span
            className="shrink-0 mt-[1px] inline-flex size-[15px] items-center justify-center rounded-full text-[8px] font-semibold"
            style={{ background: t.bg, color: t.text }}
          >
            {from + i}
          </span>
          <span className="min-w-0 text-[9.5px] leading-[1.45] line-clamp-2" style={{ color: C.ink }}>
            {q}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ── the tender card ─────────────────────────────────────────────── */

function TenderCard({
  name,
  mono,
  years,
  price,
  programme,
  firm,
  firmNote,
  score,
  flags,
  attention,
  extra,
  h,
  scoreKey,
  flagKey,
  hot,
  open,
  openFlag,
}: {
  name: string;
  mono: string;
  years: string;
  price: string;
  programme: string;
  firm: number;
  firmNote: string;
  score: number;
  flags: React.ReactNode;
  attention: string;
  extra?: string;
  h: number;
  scoreKey?: string;
  flagKey?: string;
  hot: boolean;
  open?: boolean;
  openFlag?: boolean;
}) {
  return (
    <motion.div
      className="shrink-0"
      initial={false}
      animate={{ height: h }}
      transition={OPEN}
    >
      <Card
        className="h-full overflow-hidden flex flex-col px-3.5 pt-2.5"
        style={hot ? { borderColor: C.tealLine } : undefined}
      >
        <div className="flex items-center gap-2.5">
          <Mono txt={mono} size={22} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-semibold leading-tight" style={{ color: C.ink }}>
              {name}
            </p>
            <p className="text-[9px] leading-tight" style={{ color: C.muted }}>
              {years}
            </p>
          </div>
        </div>

        <p className="mt-2.5 text-[8px] uppercase tracking-[0.16em]" style={{ color: C.dim }}>
          Tender price inc GST
        </p>
        <p className="mt-1 font-ui font-semibold text-[22px] leading-none tabular-nums" style={{ color: C.ink }}>
          {price}
        </p>
        <p className="mt-1 text-[9px]" style={{ color: C.muted }}>
          {programme}
        </p>

        <div className="mt-2">
          <FirmSplit firm={firm} h={7} />
        </div>
        <p className="mt-1 text-[9px] truncate" style={{ color: C.muted }}>
          {firmNote}
        </p>

        {/* the read */}
        <div className="mt-2.5 border-t pt-2.5" style={{ borderColor: C.line }}>
          <div
            data-cursor={scoreKey}
            className="flex items-center gap-2.5 rounded px-1 -mx-1 transition-colors duration-200"
            style={{ height: 16, background: hot && scoreKey ? C.tealWash : undefined }}
          >
            <span className="w-[78px] sm:w-[104px] shrink-0 truncate text-[9.5px] font-semibold" style={{ color: C.ink }}>
              Weighted overall
            </span>
            <Bar pct={score} h={5} leads />
            <span
              className="w-7 shrink-0 text-right font-ui font-semibold text-[12px] tabular-nums"
              style={{ color: C.ink }}
            >
              {score}
            </span>
          </div>

          {/* The six, revealed by opening the row above them. The height
              is animated rather than mounted, so the card's own height
              and the column below it stay in lockstep. */}
          <motion.div
            className="overflow-hidden"
            initial={false}
            animate={{ height: open ? 96 : 0 }}
            transition={OPEN}
          >
            <div className="pt-2 flex flex-col gap-[2px]">
              {DIMS.map((d, i) => (
                <motion.div
                  key={d.label}
                  className="flex items-center gap-2.5"
                  style={{ height: 13 }}
                  initial={false}
                  animate={{ opacity: open ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: open ? 0.06 + i * 0.05 : 0 }}
                >
                  <span className="w-[78px] sm:w-[104px] shrink-0 truncate text-[9px]" style={{ color: C.muted }}>
                    {d.label}
                  </span>
                  <Bar pct={d.score} h={4} leads={d.leads} />
                  <span
                    className="w-7 shrink-0 text-right font-ui text-[11px] tabular-nums"
                    style={{ color: d.leads ? TONE.good.text : C.ink }}
                  >
                    {d.score}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* signals */}
        <p
          data-cursor={flagKey}
          className="mt-2.5 rounded px-1 -mx-1 text-[9.5px] leading-tight transition-colors duration-200"
          style={{ background: hot && flagKey ? C.tealWash : undefined }}
        >
          {flags}
          <span style={{ color: C.muted }}> · {attention}</span>
        </p>
        {extra ? (
          <p className="mt-1 inline-flex items-center gap-1 text-[9.5px]" style={{ color: C.muted }}>
            <Lightbulb className="size-2.5" style={{ color: C.tealInk }} />
            {extra}
          </p>
        ) : null}

        <motion.div
          className="overflow-hidden"
          initial={false}
          animate={{ height: openFlag ? 85 : 0 }}
          transition={OPEN}
        >
          <div
            className="mt-2 rounded-md border px-2 py-1.5"
            style={{ borderColor: TONE.risk.border, background: TONE.risk.bg }}
          >
            <p className="text-[8px] uppercase tracking-[0.14em] font-semibold" style={{ color: TONE.risk.text }}>
              {FLAG.word}
            </p>
            <p className="mt-0.5 text-[10.5px] font-semibold leading-snug" style={{ color: C.ink }}>
              {FLAG.label}
            </p>
            <p className="mt-1 text-[9px] leading-[1.45] line-clamp-2" style={{ color: C.muted }}>
              {FLAG.detail}
            </p>
            <p className="mt-1 text-[9px] leading-[1.45] line-clamp-2" style={{ color: C.muted }}>
              <span className="font-semibold" style={{ color: TONE.risk.text }}>
                Before you decide:
              </span>{" "}
              {FLAG.ask}
            </p>
          </div>
        </motion.div>

        {/* The decision sits on the card, where the app puts it. */}
        <div
          className="mt-auto -mx-3.5 border-t px-3.5 py-2 flex items-center justify-between gap-2"
          style={{ borderColor: C.line }}
        >
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold" style={{ color: C.ink }}>
            <ScrollText className="size-3" />
            Read the evaluation
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center rounded-[5px] border px-2 py-[3px] text-[9px] font-medium"
              style={{ borderColor: C.line3, color: C.muted }}
            >
              Shortlist
            </span>
            <span
              className="inline-flex items-center rounded-[5px] px-2 py-[3px] text-[9px] font-semibold"
              style={{ background: C.ink, color: C.canvas }}
            >
              Award
            </span>
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

/* ── atoms this screen owns ──────────────────────────────────────── */

/** The signature monogram: the app's own ink-to-teal gradient circle. */
function Mono({ txt, size = 18 }: { txt: string; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-full inline-flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.39,
        background: `linear-gradient(140deg, ${C.ink} 0%, ${C.tealInk} 85%)`,
        color: C.paper,
      }}
    >
      {txt}
    </span>
  );
}

/**
 * The firm-versus-allowance bar. Three facts in one shape: the amber
 * track is what can still move, the teal gradient is what is committed,
 * and the bar's own width is the price against the dearest tender.
 */
function FirmSplit({ firm, h }: { firm: number; h: number }) {
  return (
    <span
      className="relative block w-full overflow-hidden rounded-full"
      style={{ height: h, background: TONE.warn.border }}
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${firm}%`, background: `linear-gradient(90deg, ${C.ink}, ${C.tealInk})` }}
      />
    </span>
  );
}

/**
 * A score bar. Static width on purpose: the scores never change during
 * the script, so there is nothing to animate, and animating width on a
 * row inside a list is the one thing that would put this timeline back
 * on the layout thread.
 */
function Bar({ pct, h, leads }: { pct: number; h: number; leads?: boolean }) {
  return (
    <span className="min-w-0 flex-1 block rounded-full overflow-hidden" style={{ height: h, background: C.line }}>
      <span
        className="block h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: leads ? `linear-gradient(90deg, ${C.ink}, ${C.tealInk})` : C.muted,
        }}
      />
    </span>
  );
}
