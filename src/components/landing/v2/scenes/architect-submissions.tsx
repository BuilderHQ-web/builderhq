"use client";

/**
 * Practice · step three — every submission in the same shape.
 *
 * A reproduction of InstrumentCompare, the block that opens under "The
 * full record" at /owner/projects/[slug]/tenders (the architect route
 * re-exports the same page). Every band in it shares one grid —
 * `minmax(150px,220px) repeat(n, minmax(150px,1fr))`, instrument-
 * compare.tsx:75 — which is the whole argument in one CSS rule: the
 * price, the scope marks and the conditions all land on the same
 * columns because every builder answered the same instrument.
 *
 * So the scene is about columns, not scores. Two tenders are in and
 * aligned; a third arrives and fills its column row for row, matching
 * what is already there; then one row is read straight across.
 *
 * The differ dot is computed here rather than hard-coded, because the
 * best moment in the whole thing is a row that only starts disagreeing
 * once the third submission lands. That is the product working.
 */

import * as React from "react";
import { motion } from "motion/react";
import { ChevronUp, Scale } from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, TONE, Card, Frame, Kicker, ListFade } from "./kit";

type S = { arrived: boolean; hot: boolean };

const RESTING: S = { arrived: false, hot: false };

/** One grid for every band, as the real surface does it. */
const COLS = "minmax(0,1.1fr) repeat(3, minmax(0,1fr))";

/** The three tenders on the seeded round, in price order. Figures are
 *  inc GST, which is what this surface prints, and the deltas are read
 *  off the lowest. */
const TENDERS = [
  { name: "Corten Build Co.", price: "$712,800", delta: null, soft: 15 },
  { name: "Meridian Building Co", price: "$753,500", delta: "+$40,700 vs lowest", soft: 0 },
  { name: "Brightwater Homes", price: "$800,800", delta: "+$88,000 vs lowest", soft: 0 },
] as const;

type St = "included" | "allowance" | "excluded" | "na";

/** SCOPE_META at instrument-compare.tsx:82. A mark is a dot and a word,
 *  never a boxed chip: at three columns wide, boxes read as a scorecard. */
const STATE: Record<St, { label: string; dot: string; text: string }> = {
  included: { label: "Included", dot: C.tealInk, text: C.tealInk },
  allowance: { label: "Provisional sum", dot: TONE.warn.text, text: TONE.warn.text },
  excluded: { label: "Excluded", dot: TONE.risk.text, text: TONE.risk.text },
  na: { label: "N/A", dot: C.line3, text: C.dim },
};

/** The coverage matrix in trade order, which is the catalogue order in
 *  modules/tenders/trades.ts. The rest of the trades carry on below the
 *  fold, as they do in the app. Structural steelwork is the one to watch:
 *  the first two agree, so it only starts differing when the third
 *  submission lands and holds it not applicable. */
const SCOPE: Array<{ label: string; states: St[] }> = [
  { label: "Preliminaries", states: ["included", "included", "included"] },
  { label: "Ground works", states: ["allowance", "included", "excluded"] },
  { label: "Concrete work", states: ["included", "included", "included"] },
  { label: "Brickwork & blockwork", states: ["included", "included", "included"] },
  { label: "Structural steelwork", states: ["included", "included", "na"] },
  { label: "Carpentry", states: ["included", "included", "included"] },
  { label: "Joinery", states: ["allowance", "included", "included"] },
  { label: "Windows & curtain wall", states: ["included", "included", "included"] },
  { label: "Roofing", states: ["included", "included", "included"] },
];

/** The Contract section of the instrument, differences only. */
const CONDITIONS: Array<{ q: string; v: string[] }> = [
  { q: "Defects liability period after handover", v: ["3 months", "24 months", "12 months"] },
  {
    q: "Are variations always priced in writing before the work proceeds?",
    v: ["No", "Yes", "Yes"],
  },
  { q: "Is there an administration fee per variation?", v: ["Yes", "No", "No"] },
];

/** Ground works: the row the pointer reads across. Three builders, three
 *  different answers, one line. */
const TARGET = 1;

export function ArchitectSubmissionsScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 1500,
    script: [
      { wait: 900 },
      // The third tender arriving is the platform's move, not a click, so
      // the pointer stays off the scene while the column fills.
      { set: { arrived: true } },
      { wait: 1700 },
      { move: "row" },
      { set: { hot: true } },
      { wait: 1000 },
      { move: "rowend" },
      { wait: 1200 },
      { cursor: "hide" },
      { set: { hot: false } },
      { wait: 1700 },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame crumb="The tender evaluation">
        <div className="shrink-0">
          <Kicker icon={Scale}>The like-for-like read</Kicker>
          <p className="mt-1.5 text-[14.5px] font-ui font-semibold tracking-[-0.015em]" style={{ color: C.ink }}>
            Same questions, every builder
          </p>
          <p className="mt-1 text-[9.5px] leading-[1.5] max-w-[62ch]" style={{ color: C.muted }}>
            Each tender below answered the BuilderHQ submission standard, so price, scope and
            conditions compare on the same terms.
          </p>
        </div>

        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* The price band doubles as the column head: the names stay put
              while the record scrolls under them. */}
          <div className="shrink-0 border-b" style={{ borderColor: C.line, display: "grid", gridTemplateColumns: COLS }}>
            <div className="px-3 py-2.5">
              <p className="text-[9px] tracking-[0.16em] uppercase font-semibold" style={{ color: C.dim }}>
                The price
              </p>
              <p className="mt-1 text-[8.5px] leading-[1.5]" style={{ color: C.dim }}>
                Firm means priced in the contract sum. Allowances can move at cost once the real
                quantity or selection is known.
              </p>
            </div>

            {TENDERS.map((t, j) => {
              const cell = (
                <>
                  <p className="text-[9.5px] font-semibold truncate" style={{ color: C.muted }}>
                    {t.name}
                  </p>
                  <p
                    className="mt-1 font-ui font-semibold text-[13px] leading-none tabular-nums truncate"
                    style={{ color: C.ink }}
                  >
                    {t.price}
                  </p>
                  <p
                    className="mt-1 text-[9px] tabular-nums truncate"
                    style={t.delta ? { color: C.dim } : { color: C.tealInk, fontWeight: 600 }}
                  >
                    {t.delta ?? "Lowest price"}
                  </p>
                  <span
                    className="mt-1.5 flex h-[5px] w-full rounded-full overflow-hidden"
                    style={{ background: C.line }}
                  >
                    <span style={{ width: `${100 - t.soft}%`, background: C.tealInk }} />
                    {t.soft > 0 ? <span style={{ width: `${t.soft}%`, background: TONE.warn.text }} /> : null}
                  </span>
                </>
              );

              if (j < 2) {
                return (
                  <div key={t.name} className="min-w-0 border-l px-2 py-2.5" style={{ borderColor: C.line }}>
                    {cell}
                  </div>
                );
              }
              // The third slot is held open and named, so the resting scene
              // reads as a round still in progress rather than a clipped table.
              return (
                <div key={t.name} className="relative min-w-0">
                  <motion.p
                    className="absolute inset-0 flex items-center px-2 text-[9px] leading-[1.45]"
                    style={{ color: C.dim }}
                    initial={false}
                    animate={{ opacity: state.arrived ? 0 : 1 }}
                    transition={{ duration: 0.16 }}
                  >
                    Tenders are on their way
                  </motion.p>
                  <Arrive on={state.arrived} idx={0} className="px-2 py-2.5">
                    {cell}
                  </Arrive>
                </div>
              );
            })}
          </div>

          <div className="relative flex-1 min-h-0 overflow-hidden">
            <BandHead label="Scope coverage" legend />

            {SCOPE.map((row, i) => (
              <MatrixRow
                key={row.label}
                label={row.label}
                states={row.states}
                arrived={state.arrived}
                hot={state.hot && i === TARGET}
                idx={i + 1}
                cursorKey={i === TARGET ? "row" : undefined}
                endKey={i === TARGET ? "rowend" : undefined}
              />
            ))}

            <BandHead
              label="The conditions behind the number"
              note="Ground risk, insurance, programme, payments, contract terms and the team. Answered by the builders themselves, in the same order."
            />

            <div
              className="flex items-center justify-between gap-3 px-3 py-2 border-t"
              style={{ borderColor: C.line }}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-semibold" style={{ color: C.ink }}>
                  Contract
                </span>
                <span
                  className="text-[9px] font-semibold px-1.5 py-[1px] rounded-full tabular-nums"
                  style={{ background: TONE.good.bg, color: TONE.good.text }}
                >
                  3 differ
                </span>
              </span>
              <ChevronUp className="size-3 shrink-0" style={{ color: C.dim }} strokeWidth={2.2} />
            </div>

            {CONDITIONS.map((row, i) => (
              <AnswerRow key={row.q} q={row.q} v={row.v} arrived={state.arrived} idx={SCOPE.length + 1 + i} />
            ))}

            <p className="px-3 pt-2 text-[9px]" style={{ color: C.dim }}>
              1 identical answer hidden.
            </p>

            <ListFade />
          </div>
        </Card>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/** The third column, landing. Opacity and transform only, staggered down
 *  the rows so the column reads as filling in rather than switching on. */
function Arrive({
  on,
  idx,
  className = "",
  cursorKey,
  children,
}: {
  on: boolean;
  idx: number;
  className?: string;
  cursorKey?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      data-cursor={cursorKey}
      className={"min-w-0 border-l " + className}
      style={{ borderColor: C.line }}
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 5 }}
      // The held slot has to clear before the cell lands on top of it,
      // hence the head start.
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1], delay: on ? 0.18 + 0.05 * idx : 0 }}
    >
      {children}
    </motion.div>
  );
}

/** A band header. The legend is the matrix's own, at scene scale. */
function BandHead({ label, note, legend }: { label: string; note?: string; legend?: boolean }) {
  return (
    <div className="px-3 pt-3 pb-1.5">
      <p className="text-[9px] tracking-[0.16em] uppercase font-semibold" style={{ color: C.dim }}>
        {label}
      </p>
      {note ? (
        <p className="mt-1 text-[8.5px] leading-[1.5] max-w-[70ch]" style={{ color: C.muted }}>
          {note}
        </p>
      ) : null}
      {legend ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {(Object.keys(STATE) as St[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[8.5px]" style={{ color: C.dim }}>
              <span className="size-[5px] rounded-full" style={{ background: STATE[k].dot }} />
              {STATE[k].label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MatrixRow({
  label,
  states,
  arrived,
  hot,
  idx,
  cursorKey,
  endKey,
}: {
  label: string;
  states: St[];
  arrived: boolean;
  hot: boolean;
  idx: number;
  cursorKey?: string;
  endKey?: string;
}) {
  // Read from what is actually on screen, so a row can start agreeing and
  // end up disagreeing the moment the third column lands.
  const differs = new Set(arrived ? states : states.slice(0, 2)).size > 1;

  return (
    <div
      className="border-t transition-colors duration-200"
      style={{
        borderColor: C.line,
        display: "grid",
        gridTemplateColumns: COLS,
        background: hot ? C.tealMuted : differs ? C.tealWash : undefined,
        // The read-across: one ring around the whole row, so the three
        // answers come up together rather than one cell at a time.
        boxShadow: hot ? `inset 0 0 0 1px ${C.tealLine}` : undefined,
      }}
    >
      <div data-cursor={cursorKey} className="flex items-center gap-1.5 px-3 py-[5px] min-w-0">
        <motion.span
          className="size-1.5 rounded-full shrink-0"
          style={{ background: C.teal }}
          initial={false}
          animate={{ opacity: differs ? 1 : 0 }}
          transition={{ duration: 0.28 }}
        />
        <span
          className="truncate text-[10.5px]"
          style={{ color: differs || hot ? C.ink : C.muted, fontWeight: differs ? 500 : 400 }}
        >
          {label}
        </span>
      </div>

      {states.map((s, j) => {
        const meta = STATE[s];
        const body = (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <span className="size-[5px] rounded-full shrink-0" style={{ background: meta.dot }} />
            <span className="truncate text-[10px]" style={{ color: meta.text, fontWeight: differs ? 600 : 400 }}>
              {meta.label}
            </span>
          </span>
        );
        return j === 2 ? (
          <Arrive key={j} on={arrived} idx={idx} cursorKey={endKey} className="px-2.5 py-[5px] flex items-center">
            {body}
          </Arrive>
        ) : (
          <div
            key={j}
            className="min-w-0 border-l px-2.5 py-[5px] flex items-center"
            style={{ borderColor: C.line }}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}

function AnswerRow({ q, v, arrived, idx }: { q: string; v: string[]; arrived: boolean; idx: number }) {
  return (
    <div
      className="border-t"
      style={{ borderColor: C.line, display: "grid", gridTemplateColumns: COLS, background: C.tealWash }}
    >
      <div className="flex items-start gap-1.5 px-3 py-2 min-w-0">
        <span className="mt-[4px] size-1.5 rounded-full shrink-0" style={{ background: C.teal }} />
        <span className="text-[9.5px] leading-[1.45] line-clamp-2" style={{ color: C.ink }}>
          {q}
        </span>
      </div>
      {v.map((value, j) =>
        j === 2 ? (
          <Arrive key={j} on={arrived} idx={idx} className="px-2.5 py-2">
            <span className="block truncate text-[10px] font-medium" style={{ color: C.ink }}>
              {value}
            </span>
          </Arrive>
        ) : (
          <div key={j} className="min-w-0 border-l px-2.5 py-2" style={{ borderColor: C.line }}>
            <span className="block truncate text-[10px] font-medium" style={{ color: C.ink }}>
              {value}
            </span>
          </div>
        ),
      )}
    </div>
  );
}
