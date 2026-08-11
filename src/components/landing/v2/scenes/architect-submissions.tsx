"use client";

/**
 * Practice · step three — every submission in the same shape.
 *
 * A scroll down the comparison machinery at /owner/projects/[slug]/tenders
 * (the architect route re-exports the same page): the schedule alignment
 * and the answer bands from InstrumentCompare, plus "Where the tenders
 * differ" and "The decision grid" from the evaluation surface. Not the
 * scoring. For a practice the argument is never the headline number, it
 * is that three submissions can be read LINE AGAINST LINE without anyone
 * reconciling anything first, so the scene shows the surfaces that only
 * exist because every builder answered the same instrument.
 *
 * Every band shares one CSS grid, exactly as the app does
 * (instrument-compare.tsx:75) — that single rule is the whole claim:
 * price, scope marks, grid values and conditions land on the same three
 * columns because they were all answered to the same list.
 *
 * The travel is driven from the script rather than measured at runtime.
 * Each band is given an enforced height and the waypoints are arithmetic
 * off those heights, so a stop can never drift onto the middle of a row.
 *
 * Figures are the seeded example round, read from modules/sample/personas
 * and computed the way the app computes them: prices inc GST (ex GST
 * ×1.1), the firm portion as the price less the builder's own allowances.
 * Nothing here is rounded to look better than it is.
 */

import * as React from "react";
import { motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  Scale,
  SlidersHorizontal,
} from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, TONE, Card, Frame, Kicker, ListFade } from "./kit";

type S = { y: number; counted: boolean; hot: boolean; diffOnly: boolean };

const RESTING: S = { y: 0, counted: false, hot: false, diffOnly: false };

/** One grid for every band, as the real surface does it. */
const COLS = "minmax(0,1.1fr) repeat(3, minmax(0,1fr))";

/** The three tenders in price order, as the column heads read them. */
const TENDERS = [
  { mono: "CB", name: "Corten Build Co.", price: "$712,800" },
  { mono: "MB", name: "Meridian Building Co", price: "$753,500" },
  { mono: "BH", name: "Brightwater Homes", price: "$800,800" },
] as const;

/**
 * Enforced band heights, and the top of each band in the column.
 *
 * Hard numbers rather than a measurement pass: four scroll stops that
 * always land on the same pixel are worth more than four that are
 * theoretically perfect and occasionally a row out. Content is written
 * to sit inside these with slack, so a wider or narrower panel spends
 * the difference as whitespace, never as a shifted waypoint.
 */
const GAP = 14;
const H = [168, 384, 366, 790, 702] as const;
const TOP = H.reduce<number[]>((acc, _h, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1]! + H[i - 1]! + GAP);
  return acc;
}, []);

/* ── the schedule alignment ──────────────────────────────────────── */

type SchedState = "documented" | "allowance" | "excluded" | "na";

/** SCHED_META at instrument-compare.tsx:593. The gate-round vocabulary,
 *  which is not the coverage matrix's: a line the client priced is a
 *  provisional sum here and an allowance there. */
const SCHED: Record<SchedState, { label: string; dot: string; text: string }> = {
  documented: { label: "As documented", dot: C.tealInk, text: C.tealInk },
  allowance: { label: "Provisional sum", dot: TONE.warn.text, text: TONE.warn.text },
  excluded: { label: "Excluded", dot: TONE.risk.text, text: TONE.risk.text },
  na: { label: "Not applicable", dot: C.line3, text: C.dim },
};

type SchedCell = { s: SchedState; text?: string };

/**
 * The lines the three builders answered differently, in the pack's own
 * build order, with the item and division labels from the Scope
 * Standard. The first is the one worth stopping on: the client locked a
 * provisional sum against it, one builder held that figure, one priced
 * it firm and one will not carry it at all. Three treatments of one
 * line, which no set of three builder PDFs can ever be made to show.
 */
const SCHEDULE: Array<{
  label: string;
  sub?: string;
  cells: [SchedCell, SchedCell, SchedCell];
}> = [
  {
    label: "Rock excavation",
    sub: "Earthworks and excavation · your provisional sum $18,000",
    cells: [{ s: "excluded" }, { s: "documented", text: "$26,000 firm" }, { s: "allowance", text: "$18,000" }],
  },
  {
    label: "Bulk excavation, cut and fill",
    cells: [{ s: "allowance" }, { s: "documented" }, { s: "documented" }],
  },
  {
    label: "Engineered concrete and block retaining walls",
    cells: [{ s: "allowance" }, { s: "documented" }, { s: "documented" }],
  },
  {
    label: "Sub-soil drainage behind walls",
    cells: [{ s: "na" }, { s: "documented" }, { s: "documented" }],
  },
  {
    label: "Butler's pantry and scullery fit-out",
    cells: [{ s: "allowance" }, { s: "documented" }, { s: "documented" }],
  },
  {
    label: "Wardrobe fit-outs",
    cells: [{ s: "allowance" }, { s: "documented" }, { s: "documented" }],
  },
  {
    label: "Timber and composite decks",
    cells: [{ s: "excluded" }, { s: "documented" }, { s: "documented" }],
  },
  { label: "Fencing", cells: [{ s: "excluded" }, { s: "documented" }, { s: "documented" }] },
  { label: "Driveway", cells: [{ s: "excluded" }, { s: "documented" }, { s: "documented" }] },
];

/* ── where the tenders differ ────────────────────────────────────── */

type ScopeState = "included" | "allowance" | "excluded" | "na";

/** STATE_TONE at evaluation-surface.tsx:1518. Chips, not dots, because
 *  this table exists to be read down a column. */
const SCOPE: Record<ScopeState, { label: string; tone: keyof typeof TONE }> = {
  included: { label: "Included", tone: "good" },
  allowance: { label: "Allowance", tone: "warn" },
  excluded: { label: "Excluded", tone: "risk" },
  na: { label: "Not applicable", tone: "ink" },
};

/** The nine scope items the round treats differently, in the trade
 *  order of modules/tenders/trades.ts. Two of the columns are identical
 *  the whole way down, which is not a flaw in the example: they priced
 *  the same scope, and only one builder moved money into allowances. */
const DIFFER: Array<{ trade: string; s: [ScopeState, ScopeState, ScopeState] }> = [
  { trade: "Ground works", s: ["allowance", "included", "included"] },
  { trade: "Concrete work", s: ["allowance", "included", "included"] },
  { trade: "Stonework", s: ["na", "included", "included"] },
  { trade: "Joinery", s: ["allowance", "included", "included"] },
  { trade: "Tiling", s: ["allowance", "included", "included"] },
  { trade: "External finishes", s: ["excluded", "included", "included"] },
  { trade: "Painting", s: ["allowance", "included", "included"] },
  { trade: "Fixtures & fittings", s: ["allowance", "included", "included"] },
  { trade: "External works", s: ["excluded", "included", "included"] },
];

/** The row the pointer reads across. Far enough down the table that the
 *  travel is visible, and the one where the three answers are furthest
 *  apart: not priced, priced, priced. */
const TARGET = 5;

/* ── the decision grid ───────────────────────────────────────────── */

type GridRow = { label: string; info?: boolean; v: [string, string, string]; best?: number[] };

/**
 * GRID at evaluation-surface.tsx:1229, its five labelled groups and
 * their own values. `best` is the app's own rule: the strongest
 * position on the line, suppressed where every column would win,
 * because a row where everyone wins is a row where nobody does.
 */
const DECISION: Array<{ title: string; rows: GridRow[] }> = [
  {
    title: "The money",
    rows: [
      { label: "Price inc GST", v: ["$712,800", "$753,500", "$800,800"], best: [0] },
      {
        label: "Firm portion",
        info: true,
        v: ["$543,000 (84%)", "$685,000 (100%)", "$728,000 (100%)"],
        best: [1, 2],
      },
      {
        label: "Allowances",
        info: true,
        v: ["$105,000 (2 PS, 3 PC)", "None", "None"],
        best: [1, 2],
      },
      { label: "Escalation", info: true, v: ["Uncapped", "None", "None"] },
      { label: "Price holds", info: true, v: ["45 days", "30 days", "60 days"], best: [2] },
    ],
  },
  {
    title: "The programme",
    rows: [
      { label: "Build period", v: ["36 weeks", "34 weeks", "30 weeks"], best: [2] },
      {
        label: "Weather cover",
        info: true,
        v: ["12 days on top, declared", "10 days inside the period", "15 days inside the period"],
      },
      {
        label: "Liquidated damages",
        info: true,
        v: ["Not offered", "Not offered", "$2,500/week"],
        best: [2],
      },
    ],
  },
  {
    title: "Scope",
    rows: [
      // 24 scope rows, two of them not applicable to this project, so 22
      // apply. Corten holds six as allowances (its two provisional sums
      // and three prime costs, plus painting) and excludes two, leaving
      // 14 in the price. Those same eight lines plus the one it holds not
      // applicable are the nine the table above lists, so the two
      // sections agree with each other and with the $105,000.
      { label: "Trades in the price", info: true, v: ["14 of 22", "23 of 23", "23 of 23"], best: [1, 2] },
      { label: "Excluded scope items", info: true, v: ["2", "0", "0"], best: [1, 2] },
      { label: "Written exclusions", info: true, v: ["2", "0", "0"] },
    ],
  },
  {
    title: "Delivery",
    rows: [
      { label: "Defects period", info: true, v: ["3 months", "12 months", "24 months"], best: [2] },
      {
        label: "Updates",
        v: ["Fortnightly progress updates", "Weekly progress updates", "Weekly progress updates"],
      },
    ],
  },
  {
    title: "The people",
    rows: [
      {
        label: "Experience",
        v: [
          "1–5 projects of this type · Largest contract $500k–$1m",
          "21–50 projects of this type · Largest contract $1m–$2m",
          "50+ projects of this type · Largest contract over $5m",
        ],
      },
      { label: "References", v: ["1 referee", "2 referees", "3 referees"] },
    ],
  },
];

/* ── the conditions behind the number ────────────────────────────── */

type Answer = { q: string; v: [string, string, string]; same?: boolean };

/** The instrument's own sections and prompts, v3, which is the version
 *  the example round answered. An identical answer is kept on screen
 *  until the reader asks for differences only, so nothing feels hidden. */
const TERMS: Array<{ title: string; differ: number; rows: Answer[] }> = [
  {
    title: "Commercial submission",
    differ: 4,
    rows: [
      {
        q: "Which contract will this job use?",
        v: ["HIA fixed price", "HIA fixed price", "Master Builders fixed price"],
      },
      { q: "How long does this price hold?", v: ["45 days", "30 days", "60 days"] },
      {
        q: "Does the contract contain a rise and fall or cost escalation clause?",
        v: ["Yes", "No", "No"],
      },
      { q: "Builder's margin applied to variations", v: ["18%", "15%", "20%"] },
      { q: "Is your price fixed, rather than an estimate?", v: ["Yes", "Yes", "Yes"], same: true },
    ],
  },
  {
    title: "Programme",
    differ: 3,
    rows: [
      { q: "Build period", v: ["36 weeks", "34 weeks", "30 weeks"] },
      {
        q: "Does the build period already include an inclement weather allowance?",
        v: ["No", "Yes", "Yes"],
      },
      {
        q: "Do you offer liquidated damages if handover runs late?",
        v: ["No", "No", "Yes"],
      },
      { q: "Earliest month you can start on site", v: ["Oct 2026", "Oct 2026", "Oct 2026"], same: true },
    ],
  },
  {
    title: "Delivery",
    differ: 3,
    rows: [
      {
        q: "Defects liability period after handover",
        v: ["3 months", "12 months", "24 months"],
      },
      {
        q: "How often do you commit to progress updates?",
        v: ["Fortnightly", "Weekly", "Weekly"],
      },
      { q: "Is there an administration fee per variation?", v: ["Yes", "No", "No"] },
      {
        q: "Are variations always priced in writing before the work proceeds?",
        v: ["Yes", "Yes", "Yes"],
        same: true,
      },
    ],
  },
];

export function ArchitectSubmissionsScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 1500,
    script: [
      { wait: 2000 },
      // Down to the schedule. The count is started part way through the
      // glide rather than after it: it has to reset to zero before it
      // can resolve, and the reset is invisible while the band is still
      // moving. It then settles a beat after the band does.
      { set: { y: -TOP[1]! } },
      { wait: 400 },
      { set: { counted: true } },
      { wait: 2600 },

      // Where the tenders differ, and the read across one row. The
      // travel from the label to the last column is the gesture the
      // whole scene exists for.
      { set: { y: -TOP[2]! } },
      { wait: 1100 },
      { move: "row" },
      { set: { hot: true } },
      { wait: 900 },
      { move: "rowend" },
      { wait: 1200 },
      { cursor: "hide" },

      // The decision grid, in two stops: the money and the programme,
      // then the scope, delivery and the people underneath.
      { set: { y: -TOP[3]!, hot: false } },
      { wait: 2400 },
      { set: { y: -(TOP[3]! + 250) } },
      { wait: 2300 },

      // The conditions, and the one control the pointer touches.
      { set: { y: -TOP[4]! } },
      { wait: 1000 },
      { move: "diffonly" },
      { wait: 200 },
      { click: true },
      { set: { diffOnly: true } },
      { wait: 1700 },
      { cursor: "hide" },
      { wait: 200 },

      // Back to the top as a beat of its own. The engine restores the
      // resting state on loop anyway, and doing it here means the
      // return reads as a deliberate gesture rather than a rewind that
      // fires halfway through the pause.
      { set: { y: 0, diffOnly: false } },
      { wait: 900 },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame crumb="The tender evaluation">
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <motion.div
            className="absolute inset-x-0 top-0 flex flex-col"
            style={{ gap: GAP }}
            initial={false}
            animate={{ y: state.y }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{ height: H[0] }}>
              <HeadBand />
            </div>
            <div style={{ height: H[1] }}>
              <ScheduleBand counted={state.counted} />
            </div>
            <div style={{ height: H[2] }}>
              <DifferBand hot={state.hot} />
            </div>
            <div style={{ height: H[3] }}>
              <DecisionBand />
            </div>
            <div style={{ height: H[4] }}>
              <TermsBand diffOnly={state.diffOnly} />
            </div>
          </motion.div>

          <ListFade />
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/* ── band 1 · the header a practice opens on ─────────────────────── */

function HeadBand() {
  return (
    <div>
      <Kicker icon={Scale}>The like-for-like read</Kicker>
      <p className="mt-1.5 text-[14.5px] font-ui font-semibold tracking-[-0.015em]" style={{ color: C.ink }}>
        Same questions, every builder
      </p>
      <p className="mt-1 h-[43px] overflow-hidden text-[9.5px] leading-[1.5] max-w-[64ch]" style={{ color: C.muted }}>
        Each tender below answered the BuilderHQ submission standard, so price, scope and
        conditions compare on the same terms. Differences surface first.
      </p>

      <Card className="mt-2.5 grid grid-cols-3 overflow-hidden">
        {[
          ["Tenders received", "3", "project live 14 days"],
          ["Lowest tender inc GST", "$712,800", "highest $800,800 · 12% spread"],
          ["Significant flags", "2", "raised across the round"],
        ].map(([label, value, sub], i) => (
          <div
            key={label}
            className="min-w-0 px-3 py-2"
            style={i === 0 ? undefined : { borderLeft: `1px solid ${C.line}` }}
          >
            <p
              className="h-[22px] line-clamp-2 text-[8px] uppercase tracking-[0.1em] leading-[1.35]"
              style={{ color: C.dim }}
            >
              {label}
            </p>
            <p
              className="mt-0.5 font-ui font-semibold text-[15px] leading-none tabular-nums truncate"
              style={{ color: C.ink }}
            >
              {value}
            </p>
            <p className="mt-1 h-[22px] line-clamp-2 text-[8px] leading-[1.35]" style={{ color: C.dim }}>
              {sub}
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ── band 2 · the schedule alignment ─────────────────────────────── */

function ScheduleBand({ counted }: { counted: boolean }) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-3 pt-2.5 pb-2">
        <div className="min-w-0">
          {/* Two lines of room whether or not it needs them, so the band
              is the same height at every panel width and the waypoint
              below it cannot drift. */}
          <p
            className="h-[22px] line-clamp-2 text-[9px] tracking-[0.16em] uppercase font-semibold"
            style={{ color: C.dim }}
          >
            The schedule alignment
          </p>
          <p
            className="mt-1 h-[43px] overflow-hidden text-[9.5px] leading-[1.5] max-w-[62ch]"
            style={{ color: C.muted }}
          >
            Every builder answered the same 228-line tender schedule. They part ways on{" "}
            <span className="font-ui font-semibold tabular-nums" style={{ color: C.ink }}>
              <Tick key={counted ? "run" : "idle"} to={9} run={counted} /> lines
            </span>
            . That is where the price difference lives.
          </p>
          <div className="mt-1.5 h-[22px] overflow-hidden flex flex-wrap items-center gap-x-3 gap-y-1">
            {(Object.keys(SCHED) as SchedState[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5 text-[8.5px]" style={{ color: C.dim }}>
                <span className="size-[5px] rounded-full" style={{ background: SCHED[k].dot }} />
                {SCHED[k].label}
              </span>
            ))}
          </div>
        </div>
        <Toggle on>Differences first</Toggle>
      </div>

      <NameRow />

      {SCHEDULE.map((row) => (
        <div
          key={row.label}
          className="border-t"
          style={{
            borderColor: C.line,
            display: "grid",
            gridTemplateColumns: COLS,
            background: C.tealWash,
            height: row.sub ? 39 : 22,
          }}
        >
          <div className="flex items-start gap-1.5 px-3 py-[4px] min-w-0">
            <span className="mt-[4px] size-1.5 rounded-full shrink-0" style={{ background: C.teal }} />
            <span className="min-w-0">
              <span className="block truncate text-[9.5px] font-medium leading-[1.35]" style={{ color: C.ink }}>
                {row.label}
              </span>
              {row.sub ? (
                <span className="block text-[8.5px] leading-[1.3] line-clamp-2" style={{ color: C.dim }}>
                  {row.sub}
                </span>
              ) : null}
            </span>
          </div>
          {row.cells.map((cell, j) => (
            <div
              key={j}
              className="min-w-0 border-l px-2 flex items-center"
              style={{ borderColor: C.line }}
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span className="size-[5px] rounded-full shrink-0" style={{ background: SCHED[cell.s].dot }} />
                <span
                  className="truncate text-[9.5px] font-semibold"
                  style={{ color: SCHED[cell.s].text }}
                >
                  {cell.text ?? SCHED[cell.s].label}
                </span>
              </span>
            </div>
          ))}
        </div>
      ))}

      <div
        className="h-[24px] border-t flex items-center justify-center gap-1 text-[9.5px]"
        style={{ borderColor: C.line, color: C.muted }}
      >
        Show the 219 lines the builders agree on
        <ChevronDown className="size-3" strokeWidth={2.2} />
      </div>
    </Card>
  );
}

/* ── band 3 · where the tenders differ ───────────────────────────── */

function DifferBand({ hot }: { hot: boolean }) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="px-3 py-2.5">
        <Kicker icon={GitCompareArrows}>The same project, read differently</Kicker>
        <p className="mt-1 text-[13px] font-ui font-semibold tracking-[-0.015em]" style={{ color: C.ink }}>
          Where the tenders differ
        </p>
        <p
          className="mt-1 h-[43px] overflow-hidden text-[9.5px] leading-[1.5] max-w-[64ch]"
          style={{ color: C.muted }}
        >
          9 scope items are treated differently across these tenders. Until each builder prices
          the same scope, their totals are not the same number.
        </p>
      </div>

      <div
        className="h-[22px] border-t items-center"
        style={{ borderColor: C.line, display: "grid", gridTemplateColumns: COLS }}
      >
        <span className="px-3 text-[8.5px] tracking-[0.16em] uppercase truncate" style={{ color: C.dim }}>
          Scope item
        </span>
        {TENDERS.map((t) => (
          <span
            key={t.name}
            className="min-w-0 border-l px-2 text-[8.5px] tracking-[0.16em] uppercase truncate"
            style={{ borderColor: C.line, color: C.dim }}
          >
            {t.name}
          </span>
        ))}
      </div>

      {DIFFER.map((row, i) => {
        const lit = hot && i === TARGET;
        return (
          <div
            key={row.trade}
            className="h-[22px] border-t transition-colors duration-200"
            style={{
              borderColor: C.line,
              display: "grid",
              gridTemplateColumns: COLS,
              // Every row on this table differs, so every row carries the
              // tint. The read-across is a ring around the whole row, so
              // the three answers come up together rather than one cell
              // at a time: one line, three directly comparable answers.
              background: lit ? C.tealMuted : C.tealWash,
              boxShadow: lit ? `inset 0 0 0 1px ${C.tealLine}` : undefined,
            }}
          >
            <div
              data-cursor={i === TARGET ? "row" : undefined}
              className="flex items-center gap-1.5 px-3 min-w-0"
            >
              <span className="size-1.5 rounded-full shrink-0" style={{ background: C.teal }} />
              <span
                className="truncate text-[9.5px]"
                style={{ color: C.ink, fontWeight: lit ? 600 : 400 }}
              >
                {row.trade}
              </span>
            </div>
            {row.s.map((s, j) => {
              const t = TONE[SCOPE[s].tone];
              return (
                <div
                  key={j}
                  data-cursor={i === TARGET && j === 2 ? "rowend" : undefined}
                  className="min-w-0 border-l px-2 flex items-center"
                  style={{ borderColor: C.line }}
                >
                  <span
                    className="inline-flex max-w-full items-center rounded-full px-1.5 h-[15px] text-[8.5px] font-medium truncate transition-shadow duration-200"
                    style={{
                      color: t.text,
                      background: t.bg,
                      // On the lit row each chip takes a hairline in its
                      // own tone, so it stays legible on the stronger
                      // wash and the three read as one answer.
                      boxShadow: lit ? `inset 0 0 0 1px ${t.border}` : undefined,
                    }}
                  >
                    {SCOPE[s].label}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      <div
        className="h-[24px] border-t flex items-center justify-center gap-1 text-[9.5px]"
        style={{ borderColor: C.line, color: C.muted }}
      >
        <ChevronDown className="size-3 rotate-180" strokeWidth={2.2} />
        Show fewer
      </div>
    </Card>
  );
}

/* ── band 4 · the decision grid ──────────────────────────────────── */

function DecisionBand() {
  return (
    <Card className="h-full overflow-hidden">
      <div className="px-3 py-2.5">
        <Kicker icon={Scale}>Side by side</Kicker>
        <p className="mt-1 text-[13px] font-ui font-semibold tracking-[-0.015em]" style={{ color: C.ink }}>
          The decision grid
        </p>
        <p
          className="mt-1 h-[43px] overflow-hidden text-[9.5px] leading-[1.5] max-w-[64ch]"
          style={{ color: C.muted }}
        >
          Every row is the builders&apos; own answers, lined up. A teal cell holds the strongest
          position on that line. The small marks explain any term of the trade.
        </p>
      </div>

      <div
        className="h-[36px] border-t"
        style={{ borderColor: C.line, display: "grid", gridTemplateColumns: COLS }}
      >
        <span />
        {TENDERS.map((t) => (
          <div
            key={t.name}
            className="min-w-0 border-l px-2 flex items-center gap-1.5"
            style={{ borderColor: C.line }}
          >
            <span
              className="size-[18px] shrink-0 rounded-full inline-flex items-center justify-center text-[7.5px] font-bold"
              style={{ background: C.tealMuted, color: C.tealInk }}
            >
              {t.mono}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[9.5px] font-semibold leading-tight" style={{ color: C.ink }}>
                {t.name}
              </span>
              <span className="block truncate text-[8.5px] tabular-nums" style={{ color: C.muted }}>
                {t.price} inc GST
              </span>
            </span>
          </div>
        ))}
      </div>

      {DECISION.map((group) => (
        <div key={group.title}>
          <p
            className="h-[20px] flex items-end px-3 pb-[3px] text-[8.5px] tracking-[0.2em] uppercase"
            style={{ color: C.dim }}
          >
            {group.title}
          </p>
          {group.rows.map((row) => {
            // A row where every column wins is a row where nobody does.
            const meaningful = !!row.best && row.best.length < 3;
            return (
              <div
                key={row.label}
                className="h-[34px] border-t"
                style={{ borderColor: C.line, display: "grid", gridTemplateColumns: COLS }}
              >
                <div className="flex items-center gap-1 px-3 min-w-0">
                  <span className="text-[9px] leading-[1.35] line-clamp-2" style={{ color: C.dim }}>
                    {row.label}
                  </span>
                  {row.info ? <InfoDot /> : null}
                </div>
                {row.v.map((value, j) => {
                  const win = meaningful && row.best!.includes(j);
                  return (
                    <div
                      key={j}
                      className="min-w-0 border-l px-2 flex items-center"
                      style={{ borderColor: C.line, background: win ? TONE.good.bg : undefined }}
                    >
                      <span
                        className="block text-[9px] leading-[1.35] line-clamp-2"
                        style={win ? { color: TONE.good.text, fontWeight: 600 } : { color: C.ink }}
                      >
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}

      <p
        className="h-[24px] flex items-center border-t px-3 text-[9px] truncate"
        style={{ borderColor: C.line, color: C.dim }}
      >
        Open any builder&apos;s full evaluation to see the working behind their dimension scores.
      </p>
    </Card>
  );
}

/* ── band 5 · the conditions behind the number ───────────────────── */

function TermsBand({ diffOnly }: { diffOnly: boolean }) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-3 pt-2.5 pb-2">
        <div className="min-w-0">
          <p
            className="h-[22px] line-clamp-2 text-[9px] tracking-[0.16em] uppercase font-semibold"
            style={{ color: C.dim }}
          >
            The conditions behind the number
          </p>
          <p
            className="mt-1 h-[43px] overflow-hidden text-[9.5px] leading-[1.5] max-w-[60ch]"
            style={{ color: C.muted }}
          >
            Ground risk, insurance, programme, payments, contract terms and the team. Answered by
            the builders themselves, in the same order.
          </p>
        </div>
        <Toggle on={diffOnly} cursorKey="diffonly">
          Differences only
        </Toggle>
      </div>

      <NameRow />

      {TERMS.map((section) => (
        <div key={section.title}>
          <div
            className="h-[26px] border-t flex items-center justify-between gap-3 px-3"
            style={{ borderColor: C.line }}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="truncate text-[10.5px] font-semibold" style={{ color: C.ink }}>
                {section.title}
              </span>
              <span
                className="shrink-0 text-[8.5px] font-semibold px-1.5 py-[1px] rounded-full tabular-nums"
                style={{ background: TONE.good.bg, color: TONE.good.text }}
              >
                {section.differ} differ
              </span>
            </span>
            <ChevronUp className="size-3 shrink-0" style={{ color: C.dim }} strokeWidth={2.2} />
          </div>

          {section.rows.map((row) => (
            <motion.div
              key={row.q}
              className="overflow-hidden"
              initial={false}
              animate={{
                height: row.same && diffOnly ? 0 : 37,
                opacity: row.same && diffOnly ? 0 : 1,
              }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="h-[36px] border-t"
                style={{
                  borderColor: C.line,
                  display: "grid",
                  gridTemplateColumns: COLS,
                  background: row.same ? undefined : C.tealWash,
                }}
              >
                <div className="flex items-start gap-1.5 px-3 py-[4px] min-w-0">
                  <span
                    className="mt-[4px] size-1.5 rounded-full shrink-0"
                    style={{ background: row.same ? "transparent" : C.teal }}
                  />
                  <span
                    className="text-[9px] leading-[1.45] line-clamp-2"
                    style={{ color: row.same ? C.muted : C.ink, fontWeight: row.same ? 400 : 500 }}
                  >
                    {row.q}
                  </span>
                </div>
                {row.v.map((value, j) => (
                  <div
                    key={j}
                    className="min-w-0 border-l px-2 py-[4px]"
                    style={{ borderColor: C.line }}
                  >
                    <span className="block text-[9px] leading-[1.45] font-medium line-clamp-2" style={{ color: C.ink }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* The count of what the filter took away, so a reader can see
              that agreement was there rather than assume it was dropped. */}
          <motion.p
            className="overflow-hidden px-3 text-[8.5px]"
            style={{ color: C.dim }}
            initial={false}
            animate={{ height: diffOnly ? 18 : 0, opacity: diffOnly ? 1 : 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="block pt-[4px]">1 identical answer hidden.</span>
          </motion.p>
        </div>
      ))}

      <div
        className="h-[26px] border-t flex items-center justify-between gap-3 px-3"
        style={{ borderColor: C.line }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate text-[10.5px] font-semibold" style={{ color: C.ink }}>
            Eligibility
          </span>
          <span className="shrink-0 text-[8.5px]" style={{ color: C.dim }}>
            identical answers
          </span>
        </span>
        <ChevronDown className="size-3 shrink-0" style={{ color: C.dim }} strokeWidth={2.2} />
      </div>
    </Card>
  );
}

/* ── shared parts ────────────────────────────────────────────────── */

/** The column heads. Repeated per band rather than pinned, exactly as
 *  the app repeats them, so any band read on its own still names its
 *  columns. */
function NameRow() {
  return (
    <div
      className="h-[22px] border-t items-center"
      style={{ borderColor: C.line, display: "grid", gridTemplateColumns: COLS }}
    >
      <span />
      {TENDERS.map((t) => (
        <span
          key={t.name}
          className="min-w-0 border-l px-2 text-[9px] font-semibold truncate"
          style={{ borderColor: C.line, color: C.muted }}
        >
          {t.name}
        </span>
      ))}
    </div>
  );
}

/** The filter pill both compare bands carry. Teal outline when it is
 *  doing something, which is how the app marks it. */
function Toggle({
  children,
  on,
  cursorKey,
}: {
  children: React.ReactNode;
  on?: boolean;
  cursorKey?: string;
}) {
  return (
    <span
      data-cursor={cursorKey}
      className="shrink-0 inline-flex items-center gap-1.5 h-[22px] px-2 rounded-full border text-[9px] whitespace-nowrap transition-colors duration-200"
      style={{
        borderColor: on ? C.tealLine : C.line2,
        background: on ? C.tealWash : "transparent",
        color: on ? C.ink : C.muted,
      }}
    >
      <SlidersHorizontal className="size-[9px]" strokeWidth={2.2} />
      {children}
    </span>
  );
}

/** The grid's InfoDot: the mark that says a term of the trade has a
 *  plain-English explanation behind it. */
function InfoDot() {
  return (
    <span
      aria-hidden
      className="mt-[1px] inline-flex size-[9px] shrink-0 items-center justify-center rounded-full border text-[6px] font-bold leading-none"
      style={{ borderColor: C.line3, color: C.dim }}
    >
      i
    </span>
  );
}

/**
 * The differing-line count, arriving rather than printed. A figure
 * already on screen reads as a claim; one that resolves reads as the
 * product having just done the work. Settles on the real count, which
 * is also what it shows at rest and under reduced motion.
 *
 * Remounted by its key when the run flag turns over, so the reset lives
 * in the initialiser rather than in an effect that would set state
 * synchronously and flash the finished figure for a frame first.
 */
function Tick({ to, run }: { to: number; run: boolean }) {
  const [n, setN] = React.useState(run ? 0 : to);

  React.useEffect(() => {
    if (!run) return;
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / 1100);
      // Ease out cubic, so it decelerates onto the figure.
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to, run]);

  return <>{n}</>;
}
