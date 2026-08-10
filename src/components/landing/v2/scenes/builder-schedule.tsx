"use client";

/**
 * Builder · step two — walk the schedule and mark each line.
 *
 * A miniature of one division slide of the tender deck, at
 * /builder/projects/[slug]/tender: module 5, "What's included". The
 * builder assembles nothing. The lines were written from the client's
 * documents before the round opened, each carrying the page it came
 * from, and the whole job is to say what your price does with each one.
 *
 * So the pointer does exactly the job: it marks a line Included, marks
 * the next one a Provisional sum, and puts the figure in on the spot.
 * The card, the chip and the drawer are the app's own states, not a
 * still with a highlight moved over it.
 */

import * as React from "react";
import { motion } from "motion/react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, Card, Frame, Kicker, ListFade, Mark, Track, type ToneKey } from "./kit";

/** The app's own drawer easing (journey.tsx). */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** The deck counts questions, not lines: 53 required across all twelve
 *  modules. Keeping the denominator here means the counter and the 3px
 *  track can never drift apart. */
const REQUIRED = 53;

type S = {
  /** Per line, the mark that is on, by chip key. */
  marks: ReadonlyArray<string | null>;
  /** The chip under the pointer, as `${line}-${chip}`. */
  hot: string | null;
  answered: number;
  /** What has been typed into the currency box, already formatted. */
  amount: string;
  focus: boolean;
};

const RESTING: S = { marks: [null, null, null], hot: null, answered: 18, amount: "", focus: false };

/** The four marks, in the deck's order, with the fill each one takes
 *  when it is on. Excluded burns rust and N/A goes to ink; only the
 *  first two are the teal fill. */
const MARKS: Array<{ key: string; label: string; tone: ToneKey }> = [
  { key: "included", label: "Included", tone: "good" },
  { key: "allowance", label: "Provisional sum", tone: "good" },
  { key: "excluded", label: "Excluded", tone: "risk" },
  { key: "na", label: "N/A", tone: "ink" },
];

/** Three lines of the footings division, labels and plain sentences
 *  straight out of the Scope Standard, each with the citation the
 *  reader wrote against it. */
const LINES: Array<{ id: string; label: string; plain: string; cite: string }> = [
  {
    id: "slab",
    label: "Waffle pod slab",
    plain:
      "A concrete slab poured over foam pods that sits on top of the ground, the most common modern house slab.",
    cite: "Structural S02, page 4, Rev B",
  },
  {
    id: "piers",
    label: "Piers and screw piles",
    plain:
      "Deep supports drilled or screwed down to solid ground where the surface soil cannot carry the home, often an allowance until depths are proven.",
    cite: "Geotechnical Report, page 11",
  },
  {
    id: "termite",
    label: "Termite management system",
    plain:
      "The barrier or treatment that protects the home from termites, required and certified under the code.",
    cite: "Specification A1.2, page 9, Rev C",
  },
];

export function BuilderScheduleScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    script: [
      // Let the resting slide read as a list of decisions first.
      { wait: 420 },

      // Beat one: the first line is settled in a single tap. The chip
      // fills, the card takes the teal wash and drops its lift, the
      // header counter and the track move with it.
      { move: "slab-included" },
      { set: { hot: "slab-included" } },
      { wait: 300 },
      { click: true },
      { set: { marks: ["included", null, null], hot: null, answered: 19 } },
      { wait: 1100 },

      // Beat two: a provisional sum opens the figure field on the line
      // itself. No second screen, no attachment.
      { move: "piers-allowance" },
      { set: { hot: "piers-allowance" } },
      { wait: 260 },
      { click: true },
      { set: { marks: ["included", "allowance", null], hot: null, focus: true } },
      { wait: 480 },
      { set: { amount: "1" } },
      { wait: 130 },
      { set: { amount: "12" } },
      { wait: 140 },
      { set: { amount: "12,0" } },
      { wait: 140 },
      { set: { amount: "12,00" } },
      { wait: 150 },
      // The comma arrives with the fourth digit, the way the field
      // re-formats on every keystroke.
      { set: { amount: "12,000" } },
      { wait: 520 },

      // Beat three: the figure lands, so the line counts, and the
      // schedule closes a little further behind the builder.
      { set: { focus: false, answered: 20 } },
      { wait: 2300 },
      { cursor: "hide" },
    ],
  });

  const pct = Math.round((state.answered / REQUIRED) * 100);

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame crumb="Tender · the schedule">
        {/* The deck's sticky bar, compressed: where you are, how much of
            the tender is answered, and the 3px track that is the only
            progress readout the deck has. */}
        <div className="shrink-0">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0 overflow-hidden whitespace-nowrap">
              <Kicker>Module 5 of 12 · What&rsquo;s included</Kicker>
            </div>
            <p className="shrink-0 text-[10px] tabular-nums" style={{ color: C.dim }}>
              <span className="font-medium" style={{ color: C.ink }}>{state.answered}</span>/{REQUIRED}
            </p>
          </div>
          <div className="mt-2">
            <Track pct={pct} />
          </div>
        </div>

        <div className="shrink-0">
          <p className="text-[9px] tracking-[0.18em] uppercase font-semibold tabular-nums" style={{ color: C.dim }}>
            <span style={{ color: C.tealInk }}>5.1</span> · The tender schedule · 4 of 9
          </p>
          <h2
            className="mt-1.5 font-ui font-semibold tracking-[-0.02em] text-[15px] leading-[1.25]"
            style={{ color: C.ink }}
          >
            Footings and ground floor structure
          </h2>
          <p className="mt-1.5 text-[10.5px] leading-[1.5] max-w-[58ch]" style={{ color: C.muted }}>
            3 lines from the client&rsquo;s documents. Mark what your price does with each one.
          </p>
        </div>

        {/* Clipped, because the figure field grows the second line and
            the slide must not push the card open underneath it. */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2">
            {LINES.map((line, i) => (
              <LineCard
                key={line.id}
                line={line}
                mark={state.marks[i] ?? null}
                hot={state.hot}
                amount={state.amount}
                focus={state.focus}
              />
            ))}
          </div>
          <ListFade />
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/**
 * One line of the schedule. Unmarked it is paper with a lift; marked it
 * takes the teal border and wash and the lift goes, which is what makes
 * a walked division read as walked from across the room.
 */
function LineCard({
  line,
  mark,
  hot,
  amount,
  focus,
}: {
  line: { id: string; label: string; plain: string; cite: string };
  mark: string | null;
  hot: string | null;
  amount: string;
  focus: boolean;
}) {
  return (
    <Card
      tone={mark ? "accent" : "plain"}
      className="px-3 py-2.5 transition-[background-color,border-color,box-shadow] duration-300"
    >
      <p className="text-[11.5px] font-ui font-semibold leading-[1.35]" style={{ color: C.ink }}>
        {line.label}
      </p>
      <p className="mt-1 text-[10px] leading-[1.45] line-clamp-2 max-w-[56ch]" style={{ color: C.muted }}>
        {line.plain}
      </p>
      <p className="mt-1 text-[9px] truncate" style={{ color: C.dim }}>
        {line.cite}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {MARKS.map((m) => (
          <Mark
            key={m.key}
            label={m.label}
            tone={m.tone}
            on={mark === m.key}
            hot={hot === `${line.id}-${m.key}`}
            cursorKey={`${line.id}-${m.key}`}
          />
        ))}
      </div>

      {mark === "allowance" ? <SumField amount={amount} focus={focus} /> : null}
    </Card>
  );
}

/**
 * The provisional sum drawer. It mounts on the mark, so height is part
 * of the animation; the app's y-rise rides inside the clip so the
 * cards below are pushed rather than jumped.
 */
function SumField({ amount, focus }: { amount: string; focus: boolean }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="overflow-hidden"
    >
      <motion.div initial={{ y: 8 }} animate={{ y: 0 }} transition={{ duration: 0.28, ease: EASE }} className="pt-2.5">
        <p className="text-[9.5px] leading-tight" style={{ color: C.muted }}>
          Provisional sum in your price for this line
        </p>
        <div className="mt-1.5">
          <span
            className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md border transition-colors duration-200"
            style={{
              borderColor: focus ? C.tealLine : C.line2,
              background: focus ? C.tealWash : C.wash,
            }}
          >
            <span className="font-mono text-[10px]" style={{ color: C.dim }}>$</span>
            <span
              className="min-w-[44px] text-[11.5px] font-semibold tabular-nums"
              style={{ color: amount ? C.ink : C.faint }}
            >
              {amount || "0"}
            </span>
            {focus ? (
              <motion.span
                aria-hidden
                className="block w-px h-3.5"
                style={{ background: C.tealInk }}
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 0.9, times: [0, 0.49, 0.5, 1], repeat: Infinity, ease: "linear" }}
              />
            ) : null}
            <span className="text-[8.5px] uppercase tracking-[0.1em]" style={{ color: C.dim }}>
              ex GST
            </span>
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
