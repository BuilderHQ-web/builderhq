"use client";

/**
 * Builder · step four — the tender goes in.
 *
 * The last slide of the tender deck at /builder/projects/[slug]/tender:
 * the white document cover, the scorecard that runs the client's own
 * rubric on the draft before it is sent, and the numbered ledger of the
 * twelve modules. Then the seal.
 *
 * Three beats: the last required answer lands and the whole slide
 * resolves at once, the pointer takes the two-step submit, the sealed
 * document settles into what the builder is left holding.
 *
 * Two things the reproduction keeps because they are the point of the
 * screen. The submit control is genuinely absent until every required
 * answer is in, so the resting card is a review one answer short rather
 * than a button waiting to be pressed. And nothing here cross-dissolves:
 * the deck's motion is entrance-only by design, so an outgoing state is
 * simply unmounted.
 */

import * as React from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, ChevronDown, Download, Gauge } from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, Card, Frame, Kicker, ListFade, Pill, TealBtn, TONE, Track } from "./kit";

type S = {
  /** The last required answer has landed, so the review is submittable. */
  complete: boolean;
  /** Submit pressed once: the sealing band is showing. */
  confirm: boolean;
  sealed: boolean;
  /** The outcome page the seal hands over to. */
  settled: boolean;
};

const RESTING: S = { complete: false, confirm: false, sealed: false, settled: false };

/**
 * The twelve modules of the deck, in the order the ledger prints them.
 * Documents is spliced in before sign-off, which is why the questions
 * run 01 to 10 and then 12. Counts are the per-module figures from the
 * instrument, and the one short module is what beat one resolves.
 */
const MODULES: Array<{
  n: string;
  title: string;
  count: string;
  /** Required answers still owed, and the count once they land. */
  owed?: number;
  done?: string;
  docs?: boolean;
}> = [
  { n: "01", title: "Eligibility", count: "9/9" },
  { n: "02", title: "Project understanding", count: "3/4", owed: 1, done: "4/4" },
  { n: "03", title: "Company credentials", count: "13/13" },
  { n: "04", title: "Commercial submission", count: "17/17" },
  { n: "05", title: "What's included", count: "8/8" },
  { n: "06", title: "What's not included", count: "3/3" },
  { n: "07", title: "Provisional sums and prime costs", count: "7/7" },
  { n: "08", title: "Programme", count: "8/8" },
  { n: "09", title: "Delivery", count: "7/7" },
  { n: "10", title: "Builder commentary", count: "4/4" },
  { n: "11", title: "Additional documents", count: "2 attached", docs: true },
  { n: "12", title: "Sign-off", count: "5/5" },
];

/**
 * The three heaviest of the six published dimensions. The overall is
 * the weighted sum of all six, the other three being credentials and
 * capacity 81 at 15%, delivery and aftercare 88 at 12%, programme
 * confidence 74 at 8%, which is where 84 comes from.
 */
const DIMS: Array<{ label: string; weight: number; score: number }> = [
  { label: "Price firmness", weight: 25, score: 84 },
  { label: "Scope coverage", weight: 25, score: 92 },
  { label: "Preparation", weight: 15, score: 78 },
];

const OVERALL = 84;

/** The example round the app seeds, priced by one of its sample builders. */
const DOC = {
  title: "Single dwelling · Pascoe Vale, VIC",
  entity: "Brightwater Homes · ABN 44 610 991 208",
  exGst: "$728,000",
  incGst: "$800,800 inc GST",
  ref: "BHQ-7A4C21E9",
};

export function BuilderWinScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 1200,
    script: [
      // Beat one. The review is a live read of the draft, so when the
      // last answer autosaves the ledger row, the headline, the rail
      // and the submit gate all resolve on the same frame.
      { wait: 900 },
      { set: { complete: true } },
      { wait: 1500 },
      // Beat two. Submit is two-step on purpose; sealing is the one
      // thing on this screen that cannot be undone by editing.
      { move: "submit" },
      { click: true },
      { set: { confirm: true } },
      { wait: 1250 },
      { move: "seal" },
      { click: true },
      { set: { sealed: true } },
      { cursor: "hide" },
      // Beat three. What the builder is left holding.
      { wait: 950 },
      { set: { settled: true } },
      { wait: 2100 },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame
        crumb="Tender submission"
        avatar="BH"
        right={
          <span className="inline-flex items-center gap-1 text-[9.5px]" style={{ color: C.dim }}>
            <Check className="size-2.5" strokeWidth={3} style={{ color: C.tealInk }} />
            Saved
          </span>
        }
      >
        <div className="relative flex-1 min-h-0">
          {state.sealed ? (
            <Sealed settled={state.settled} />
          ) : (
            <div className="absolute inset-0 flex flex-col gap-2">
              {/* The deck's completion rail, which on the real screen is
                  full bleed under the sub-header. */}
              <div className="shrink-0">
                <Track pct={state.complete ? 100 : 98} />
                <div className="mt-1">
                  <Kicker>Review and submit</Kicker>
                </div>
                <p
                  className="mt-0.5 text-[13px] font-ui font-semibold leading-tight tracking-[-0.015em]"
                  style={{ color: C.ink }}
                >
                  {state.complete
                    ? "Your tender is ready. It reads well."
                    : "1 answer to go. Nearly there."}
                </p>
              </div>

              <Cover />

              {/* Scorecard and ledger are one scroll on the real slide,
                  so they are one clipped column here. */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col gap-2">
                  <Scorecard />
                  <Ledger complete={state.complete} />
                </div>
                <ListFade />
              </div>

              <SubmitBlock complete={state.complete} confirm={state.confirm} />
            </div>
          )}
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/* ── The cover ───────────────────────────────────────────────────── */

/**
 * White is the document object, not a section: everything else on this
 * screen is warm paper on a warm canvas, and the cover is the one thing
 * that is a printed page.
 */
function Cover() {
  return (
    <div
      className="shrink-0 rounded-[4px] px-3 py-1"
      style={{
        background: `linear-gradient(180deg, #ffffff, ${C.paper})`,
        boxShadow: "0 1px 2px rgba(24,34,44,0.08), 0 18px 44px -20px rgba(24,34,44,0.30)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-ui font-bold text-[11px] tracking-[-0.01em]" style={{ color: C.ink }}>
          BuilderHQ
        </span>
        <span
          className="text-[7px] uppercase font-semibold tracking-[0.28em]"
          style={{ color: C.dim }}
        >
          Tender submission
        </span>
      </div>
      <div className="mt-1.5 h-[2px]" style={{ background: TONE.ink.text }} />

      <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="font-ui text-[13px] leading-[1.15] truncate" style={{ color: C.ink }}>
            {DOC.title}
          </p>
          <p className="mt-0.5 text-[8px] leading-tight truncate" style={{ color: C.muted }}>
            {DOC.entity}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="text-[7px] leading-tight uppercase font-semibold tracking-[0.18em]"
            style={{ color: C.dim }}
          >
            Price ex GST
          </p>
          <p
            className="font-ui font-semibold text-[16px] leading-none tabular-nums"
            style={{ color: C.ink }}
          >
            {DOC.exGst}
          </p>
          <p className="text-[8px] leading-tight tabular-nums" style={{ color: C.muted }}>
            {DOC.incGst}
          </p>
        </div>
      </div>

      <div
        className="mt-1.5 pt-1 border-t flex items-center justify-between gap-3"
        style={{ borderColor: C.line }}
      >
        <span className="font-mono text-[8px] leading-none tracking-[0.05em]" style={{ color: C.dim }}>
          {DOC.ref}
        </span>
        <span
          className="inline-flex items-center gap-1 text-[9px] leading-none font-semibold whitespace-nowrap"
          style={{ color: C.tealInk }}
        >
          Read the full document
          <ArrowRight className="size-2.5" />
        </span>
      </div>
    </div>
  );
}

/* ── The scorecard ───────────────────────────────────────────────── */

/** The client's published rubric, run on the draft before it is sent.
 *  A builder seeing their own score before submitting is the unusual
 *  part, so the explainer sentence stays. */
function Scorecard() {
  return (
    <Card className="px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Kicker icon={Gauge}>How your tender reads</Kicker>
          <p className="mt-0.5 text-[8.5px] leading-[1.45]" style={{ color: C.muted }}>
            This is the same scoring the client sees, run on your answers before you submit.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="font-ui font-semibold text-[18px] leading-none tabular-nums"
            style={{ color: C.ink }}
          >
            {OVERALL}
          </p>
          <p
            className="mt-0.5 text-[7px] leading-tight uppercase font-semibold tracking-[0.14em]"
            style={{ color: C.dim }}
          >
            Weighted overall
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex flex-col gap-[4px]">
        {DIMS.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span
              className="w-[92px] shrink-0 truncate text-[9px] leading-none"
              style={{ color: C.muted }}
            >
              {d.label}
              <span style={{ color: C.dim }}> · {d.weight}%</span>
            </span>
            <span
              className="flex-1 block h-[3px] rounded-full overflow-hidden"
              style={{ background: C.line }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${d.score}%`,
                  background: `linear-gradient(90deg, ${TONE.ink.text}, ${C.tealInk})`,
                }}
              />
            </span>
            <span
              className="w-5 shrink-0 text-right font-ui font-semibold text-[10px] leading-none tabular-nums"
              style={{ color: C.ink }}
            >
              {d.score}
            </span>
            <ChevronDown className="size-2.5 shrink-0" style={{ color: C.dim }} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── The ledger ──────────────────────────────────────────────────── */

/** Twelve rows on hairlines, dotted leaders, a count and a circle. The
 *  circle is the whole story: teal and ticked, or amber carrying what
 *  is still owed. */
function Ledger({ complete }: { complete: boolean }) {
  return (
    <div className="border-t" style={{ borderColor: C.line }}>
      {MODULES.map((m) => {
        const owed = complete ? 0 : (m.owed ?? 0);
        const count = complete && m.done ? m.done : m.count;
        return (
          <div
            key={m.n}
            className="flex items-center gap-2 py-[3px] border-b"
            style={{ borderColor: C.line }}
          >
            <span
              className="w-4 shrink-0 font-mono text-[8.5px] tabular-nums"
              style={{ color: C.dim }}
            >
              {m.n}
            </span>
            <span className="min-w-0 shrink truncate text-[10px]" style={{ color: C.ink }}>
              {m.title}
            </span>
            <span
              aria-hidden
              className="flex-1 min-w-[10px] border-b border-dotted translate-y-[3px]"
              style={{ borderColor: C.line2 }}
            />
            <span className="shrink-0 text-[9px] tabular-nums" style={{ color: C.dim }}>
              {count}
            </span>
            {m.docs ? (
              <span className="size-[13px] shrink-0" />
            ) : owed > 0 ? (
              <span
                className="size-[13px] shrink-0 rounded-full border inline-flex items-center justify-center text-[7.5px] font-semibold tabular-nums"
                style={{ borderColor: TONE.warn.border, color: TONE.warn.text }}
              >
                {owed}
              </span>
            ) : (
              <motion.span
                className="size-[13px] shrink-0 rounded-full inline-flex items-center justify-center"
                style={{ background: C.teal, color: C.onTeal }}
                initial={m.owed ? { scale: 0.5, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                <Check className="size-[9px]" strokeWidth={3.5} />
              </motion.span>
            )}
            <ChevronDown className="size-2.5 shrink-0" style={{ color: C.dim }} />
            {/* The jump link the app puts on an unfinished module. Its
                slot is held open so completing a row does not shunt the
                other eleven sideways. */}
            <span
              className="w-[26px] shrink-0 text-right text-[9px]"
              style={{ color: C.tealInk }}
            >
              {owed > 0 ? "Finish" : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Submit ──────────────────────────────────────────────────────── */

/** Three states in one measured box, so the confirmation band growing
 *  does not shove the ledger about. */
function SubmitBlock({ complete, confirm }: { complete: boolean; confirm: boolean }) {
  return (
    <motion.div
      className="relative shrink-0 overflow-hidden"
      initial={false}
      animate={{ height: confirm ? 86 : complete ? 34 : 30 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        key={confirm ? "confirm" : complete ? "ready" : "gated"}
        className="absolute inset-x-0 top-0"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {confirm ? (
          <div className="border-t pt-2" style={{ borderColor: C.line }}>
            <p className="text-[9px] leading-[1.5] max-w-[52ch]" style={{ color: C.ink }}>
              Submitting seals your tender for this round. The owner receives it exactly as this
              review reads, and it can only change by withdrawing.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <TealBtn cursorKey="seal">
                Submit tender
                <ArrowRight className="size-3" />
              </TealBtn>
              <span className="text-[9.5px]" style={{ color: C.muted }}>Keep editing</span>
            </div>
          </div>
        ) : complete ? (
          <div className="flex items-center gap-3">
            <TealBtn cursorKey="submit">
              Submit tender
              <ArrowRight className="size-3" />
            </TealBtn>
            <span className="text-[9.5px]" style={{ color: C.dim }}>Save and exit</span>
          </div>
        ) : (
          <p className="text-[9.5px] leading-[1.5]" style={{ color: C.dim }}>
            Submission opens once every required answer is in. Everything so far is saved, so
            finish whenever suits.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── The seal ────────────────────────────────────────────────────── */

/** The deck stops here and hands over to the sealed tender: a document
 *  the builder owns, addressed to a client they will contract with. */
function Sealed({ settled }: { settled: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
      <motion.span
        className="inline-flex size-10 items-center justify-center rounded-full"
        style={{ background: C.teal, color: C.onTeal, boxShadow: "0 0 34px rgba(0,212,200,0.45)" }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <Check className="size-5" strokeWidth={3} />
      </motion.span>

      <motion.p
        className="mt-3 font-ui font-semibold text-[19px] tracking-[-0.015em]"
        style={{ color: C.ink }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        Tender submitted
      </motion.p>

      <motion.p
        className="mt-2 text-[10.5px] leading-[1.55] max-w-[42ch]"
        style={{ color: C.muted }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.5 }}
      >
        Your tender is sealed for this round and the owner has been notified. You put a proper
        document in front of them; it will hold its own beside every other submission.
      </motion.p>

      {settled ? (
        <motion.div
          className="mt-3.5 w-full max-w-[290px] rounded-lg border px-3 py-2.5"
          style={{ borderColor: C.line, background: C.paper }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between gap-2">
            <Pill tone="ink">
              <Check className="size-2.5" strokeWidth={3} />
              Submitted
            </Pill>
            <span className="font-mono text-[8px] tracking-[0.05em]" style={{ color: C.dim }}>
              {DOC.ref}
            </span>
          </div>
          <div className="mt-2.5 flex flex-col items-center gap-1.5">
            <TealBtn>
              <Download className="size-3" />
              Tender document (PDF)
            </TealBtn>
            <span className="text-[9px]" style={{ color: C.dim }}>
              Sealed and verifiable. Send it anywhere.
            </span>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
