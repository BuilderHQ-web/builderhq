"use client";

/**
 * Homeowner / practice · step four — read the tenders.
 *
 * The evaluation surface at /owner/projects/[slug]/tenders, reduced to
 * the part that carries the argument: the round strip, then the tender
 * cards with their weighted read, then the working underneath one of
 * them. Everything here is what the app computes from the builders'
 * own signed answers; the miniature adds no figure of its own.
 *
 * Three beats: the pointer opens the score on the middle tender and
 * the six published dimensions unfold with their weights, it then
 * opens a flag on the cheapest tender to show what the flag actually
 * says, and the view resolves with the strongest cell on each line
 * marked, which is how a reader sees that the lowest price is not the
 * best read of the round.
 *
 * Two fidelity notes worth keeping if this file is edited:
 *
 *   · The dimension labels carry ampersands ("Credentials & capacity",
 *     "Delivery & aftercare"). Spelling them out is the dossier's
 *     section-heading style, not the label beside a score.
 *   · The six render in rubric order, which is not weight order, and
 *     the earned scores weight to the 86 shown on the card. A reader
 *     who checks the arithmetic will find it holds, because in the
 *     product it always does.
 */

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Scale } from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, TONE, Card, Frame, ListFade } from "./kit";

type Phase = "rest" | "dims" | "flag" | "resolve";
type Hot = "score" | "flag" | null;
type S = { phase: Phase; hot: Hot };

const RESTING: S = { phase: "rest", hot: null };

/** The round strip, three of its cells. */
const BAND: Array<[string, string]> = [
  ["Tenders received", "3"],
  ["Lowest tender inc GST", "$712,800"],
  ["Significant flags", "2"],
];

/** The example round, as the app reads it. Prices are inc GST; the
 *  money line is the card's own summary of what is actually firm. */
const TENDERS = [
  {
    key: "corten",
    mono: "CB",
    name: "Corten Build Co.",
    price: "$712,800",
    money: "Firm to 84% · $105,000 in allowances",
    score: 47,
    high: 2,
    attention: 6,
  },
  {
    key: "meridian",
    mono: "MB",
    name: "Meridian Building Co",
    price: "$753,500",
    money: "Fully priced, no allowances",
    score: 86,
    high: 0,
    attention: 3,
  },
  {
    key: "brightwater",
    mono: "BH",
    name: "Brightwater Homes",
    price: "$800,800",
    money: "Fully priced, no allowances",
    score: 94,
    high: 0,
    attention: 2,
  },
] as const;

/**
 * The six dimensions in rubric order with their published weights.
 * `leads` is the round leader on that line, which is what turns the
 * bar and the number teal on the real card.
 */
const DIMS: Array<{ label: string; weight: number; score: number; leads?: boolean }> = [
  { label: "Price firmness", weight: 25, score: 100, leads: true },
  { label: "Scope coverage", weight: 25, score: 100, leads: true },
  { label: "Preparation", weight: 15, score: 54 },
  { label: "Credentials & capacity", weight: 15, score: 80 },
  { label: "Delivery & aftercare", weight: 12, score: 94, leads: true },
  { label: "Programme confidence", weight: 8, score: 60 },
];

/** One of the two significant flags the engine raises on the cheapest
 *  tender, with the question it hands the owner. */
const FLAG = {
  word: "Significant",
  label: "16% of the price can still move",
  detail: "$105,000 sits in provisional sums and prime costs (2 PS, 3 PC).",
  ask: "Ask which allowances they would fix if the documents were finalised now.",
};

export function OwnerEvaluationScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 1500,
    script: [
      { move: "score" },
      { set: { hot: "score" } },
      { wait: 240 },
      { click: true },
      { set: { phase: "dims", hot: null } },
      { wait: 2400 },
      { move: "flag" },
      { set: { hot: "flag" } },
      { wait: 200 },
      { click: true },
      { set: { phase: "flag", hot: null } },
      { wait: 2300 },
      { set: { phase: "resolve" } },
      { cursor: "hide" },
      { wait: 1900 },
    ],
  });

  const resolved = state.phase === "resolve";

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame crumb="The tender evaluation">
        <Card className="shrink-0 overflow-hidden">
          <div className="grid grid-cols-3">
            {BAND.map(([label, value], i) => (
              <div
                key={label}
                className={"px-3 py-1 " + (i ? "border-l" : "")}
                style={{ borderColor: C.line }}
              >
                <p
                  className="text-[8px] uppercase tracking-[0.16em] truncate"
                  style={{ color: C.dim }}
                >
                  {label}
                </p>
                <p
                  className="mt-1 font-ui font-semibold text-[13px] leading-none tabular-nums"
                  style={{ color: C.ink }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="relative flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2">
            {TENDERS.map((t) => (
              <TenderCard
                key={t.key}
                t={t}
                hot={
                  (state.hot === "score" && t.key === "meridian") ||
                  (state.hot === "flag" && t.key === "corten")
                }
                scoreKey={t.key === "meridian" ? "score" : undefined}
                flagKey={t.key === "corten" ? "flag" : undefined}
                openDims={state.phase === "dims" && t.key === "meridian"}
                openFlag={state.phase === "flag" && t.key === "corten"}
                winPrice={resolved && t.key === "corten"}
                winScore={resolved && t.key === "brightwater"}
              />
            ))}
          </div>
          <ListFade />

          {/* The grid's own explanation of a teal cell. Laid over the
              foot of the list rather than under it, so the list keeps
              every pixel it has at the deck's short end. */}
          <p
            className="absolute left-0 bottom-0 inline-flex items-center gap-1.5 text-[9px] leading-none transition-opacity duration-500"
            style={{ color: C.dim, opacity: resolved ? 1 : 0 }}
          >
            <span
              className="size-2 rounded-[3px] border"
              style={{ background: TONE.good.bg, borderColor: TONE.good.border }}
            />
            Strongest position on this line
          </p>
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/* ── the tender card ─────────────────────────────────────────────── */

function TenderCard({
  t,
  hot,
  scoreKey,
  flagKey,
  openDims,
  openFlag,
  winPrice,
  winScore,
}: {
  t: (typeof TENDERS)[number];
  hot: boolean;
  scoreKey?: string;
  flagKey?: string;
  openDims: boolean;
  openFlag: boolean;
  winPrice: boolean;
  winScore: boolean;
}) {
  return (
    <Card className="px-3 py-2" style={hot ? { borderColor: C.tealLine } : undefined}>
      <div className="flex items-center gap-2.5">
        <Mono txt={t.mono} />
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold truncate leading-tight" style={{ color: C.ink }}>
            {t.name}
          </p>
          <p className="text-[9.5px] truncate leading-tight" style={{ color: C.muted }}>
            {t.money}
          </p>
        </div>
        <span
          className="shrink-0 rounded px-1.5 py-[2px] -mr-1 transition-colors duration-500"
          style={winPrice ? { background: TONE.good.bg } : undefined}
        >
          <span
            className="font-ui font-semibold text-[13px] tabular-nums"
            style={{ color: winPrice ? TONE.good.text : C.ink }}
          >
            {t.price}
          </span>
          <span className="ml-1 text-[8.5px]" style={{ color: C.dim }}>
            inc GST
          </span>
        </span>
      </div>

      {/* The read. One row on the card, six more underneath it once the
          owner opens the working. */}
      <div
        data-cursor={scoreKey}
        className="mt-1.5 flex items-center gap-2.5 rounded px-1 -mx-1 transition-colors duration-200"
        style={hot && scoreKey ? { background: C.tealWash } : undefined}
      >
        <span className="w-[94px] shrink-0 text-[10px] font-semibold truncate" style={{ color: C.ink }}>
          Weighted overall
        </span>
        <Bar pct={t.score} h={5} leads />
        <span
          className="shrink-0 w-8 rounded text-right px-1 font-ui font-semibold text-[13px] tabular-nums transition-colors duration-500"
          style={
            winScore
              ? { background: TONE.good.bg, color: TONE.good.text }
              : { color: C.ink }
          }
        >
          {t.score}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {openDims ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <Working />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <p
        data-cursor={flagKey}
        className="mt-1.5 rounded px-1 -mx-1 text-[10px] leading-tight transition-colors duration-200"
        style={hot && flagKey ? { background: C.tealWash } : undefined}
      >
        {t.high > 0 ? (
          <span className="font-semibold" style={{ color: TONE.risk.text }}>
            {t.high} significant flags
          </span>
        ) : (
          <span className="font-semibold" style={{ color: TONE.good.text }}>
            No significant flags
          </span>
        )}
        <span style={{ color: C.muted }}> · {t.attention} worth attention</span>
      </p>

      <AnimatePresence initial={false}>
        {openFlag ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <FlagCard />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}

/* ── the pieces the card opens ───────────────────────────────────── */

/**
 * The six dimensions with the weight each carries and the points it
 * earned. The header legend is the app's own, and it reads across the
 * two number columns: the first is percent of the overall, the second
 * is the score out of 100.
 */
function Working() {
  return (
    <div
      className="mt-1.5 rounded-md border px-2.5 py-1"
      style={{ borderColor: C.line, background: C.wash }}
    >
      <p className="flex items-baseline justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] font-semibold truncate"
          style={{ color: C.tealInk }}
        >
          <Scale className="size-2.5 shrink-0" strokeWidth={2.2} />
          The working
        </span>
        <span className="shrink-0 text-[8.5px]" style={{ color: C.dim }}>
          percent of the overall · out of 100
        </span>
      </p>

      <div className="mt-0.5 flex flex-col gap-[2px]">
        {DIMS.map((d, i) => (
          <motion.div
            key={d.label}
            className="flex items-center gap-2 leading-tight"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="w-[108px] shrink-0 text-[9.5px] truncate" style={{ color: C.muted }}>
              {d.label}
            </span>
            <span
              className="w-4 shrink-0 text-right font-mono text-[9px] tabular-nums"
              style={{ color: C.dim }}
            >
              {d.weight}
            </span>
            <Bar pct={d.score} h={4} leads={d.leads} />
            <span
              className="w-6 shrink-0 text-right font-ui text-[11.5px] tabular-nums"
              style={{ color: d.leads ? TONE.good.text : C.ink }}
            >
              {d.score}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** One flag, as the dossier prints it: what it is, what it means, and
 *  the question to put back to the builder. */
function FlagCard() {
  return (
    <div
      className="mt-1.5 rounded-md border px-2.5 py-1.5"
      style={{ borderColor: TONE.risk.border, background: TONE.risk.bg }}
    >
      <p
        className="text-[8.5px] uppercase tracking-[0.14em] font-semibold"
        style={{ color: TONE.risk.text }}
      >
        {FLAG.word}
      </p>
      <p className="mt-0.5 text-[11.5px] font-semibold leading-snug" style={{ color: C.ink }}>
        {FLAG.label}
      </p>
      <p className="mt-1 text-[10px] leading-[1.5]" style={{ color: C.muted }}>
        {FLAG.detail}
      </p>
      <p className="mt-1 text-[10px] leading-[1.5]" style={{ color: C.muted }}>
        <span className="font-semibold" style={{ color: TONE.risk.text }}>
          Before you decide:
        </span>{" "}
        {FLAG.ask}
      </p>
    </div>
  );
}

/* ── atoms this screen owns ──────────────────────────────────────── */

/** The signature monogram: the app's own ink-to-teal gradient circle. */
function Mono({ txt }: { txt: string }) {
  return (
    <span
      className="shrink-0 size-[22px] rounded-full inline-flex items-center justify-center text-[8.5px] font-bold"
      style={{
        background: `linear-gradient(140deg, ${C.ink} 0%, ${C.tealInk} 85%)`,
        color: C.paper,
      }}
    >
      {txt}
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
    <span
      className="min-w-0 flex-1 block rounded-full overflow-hidden"
      style={{ height: h, background: C.line }}
    >
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
