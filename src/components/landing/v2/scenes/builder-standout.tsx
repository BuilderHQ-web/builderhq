"use client";

/**
 * Builder · step three — the client reads your tender, not your price.
 *
 * The same surface the homeowner sees at /owner/projects/[slug]/tenders,
 * turned around. One builder's dossier: the six weighted dimensions, and
 * a score that opens to show its arithmetic (DimensionRows → ReceiptWorking,
 * evaluation-ui.tsx:395-564). The rubric is published, fixed and applied
 * identically to every tender, which is the only reason a dearer tender
 * can beat a cheaper one on the record rather than on charm.
 *
 * The argument this card has to make is a builder's: declaring an
 * exclusion is not a hole in your price. On scope coverage an excluded
 * line sits outside the base rather than being punished twice, and a
 * written exclusion costs two points. Vagueness costs more than candour.
 *
 * Three beats: the pointer opens Scope coverage and the working unrolls,
 * the round's coverage comparison resolves under it, and the lead lands.
 *
 * Every figure here adds up, because the engine guarantees it does
 * (base + Σdeltas === score, asserted in evaluation.ts:394-400) and a
 * reader who checks will check. Scope coverage: 208 of 216 applicable
 * lines carried is 96, less one written exclusion at two points, is 94.
 * The six weighted against 25/25/15/15/12/8 is 77.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ScrollText } from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, Card, Frame, Kicker, ListFade, Pill, TONE } from "./kit";

type S = { open: boolean; hot: boolean; compare: boolean; leads: boolean };

const RESTING: S = { open: false, hot: false, compare: false, leads: false };

/** The signature gradient the evaluation surface uses for a leading bar
 *  and every monogram, rebuilt from the kit's own values. */
const LEAD = `linear-gradient(90deg, ${C.ink}, ${C.tealInk})`;
const MONO = `linear-gradient(140deg, ${C.ink} 0%, ${C.tealInk} 85%)`;

/** The six, in the engine's push order, which is not weight order
 *  (evaluation.ts:955-1401). The ampersand labels are the product's;
 *  only the dossier's section headings spell them out. */
const DIMS: Array<{ key: string; label: string; weight: number; score: number }> = [
  { key: "firmness", label: "Price firmness", weight: 25, score: 100 },
  { key: "scope", label: "Scope coverage", weight: 25, score: 94 },
  { key: "preparation", label: "Preparation", weight: 15, score: 62 },
  { key: "credentials", label: "Credentials & capacity", weight: 15, score: 60 },
  { key: "delivery", label: "Delivery & aftercare", weight: 12, score: 55 },
  { key: "programme", label: "Programme confidence", weight: 8, score: 45 },
];

/** Scope coverage's receipt, in the four kinds the ledger emits: the
 *  computed base, the notes that carry no points, the negative delta,
 *  then the settled score. */
type Receipt = { kind: "base" | "note" | "delta"; n: string; label: string };

const WORKING: Receipt[] = [
  {
    kind: "base",
    n: "96",
    label:
      "190 of 216 schedule lines priced as documented, plus 18 client allowance lines carried in full",
  },
  { kind: "note", n: "·", label: "8 schedule lines excluded, already outside the base" },
  { kind: "note", n: "·", label: "12 lines set aside as not applicable, outside the denominator" },
  { kind: "delta", n: "−2", label: "1 further written exclusion, 2 points each" },
];

/** The dossier's "What stands out" column. These are read off the
 *  disclosures, never written by the builder, which is why they are
 *  worth more to a builder than any sales line they could type. */
const STANDS_OUT = [
  "Fully priced, no provisional sums or prime costs",
  "No rise-and-fall clause",
  "Licence verified by BuilderHQ",
];

/** The round's coverage read, two tenders deep. The cheaper tender is
 *  cheaper because less of the same list is priced as documented, and
 *  the strip says so in the engine's own words rather than a verdict. */
const COMPARE: Array<{
  name: string;
  price: string;
  note?: string;
  lowest?: boolean;
  ours?: boolean;
  score: number;
  reason: string;
}> = [
  {
    name: "Corten Build Co.",
    price: "$712,800 inc GST",
    lowest: true,
    score: 79,
    reason: "158 of 216 schedule lines priced as documented",
  },
  {
    name: "Meridian Building Co",
    price: "$753,500 inc GST",
    note: "+$40,700 vs lowest",
    ours: true,
    score: 94,
    reason: "190 of 216 schedule lines priced as documented",
  },
];

export function BuilderStandoutScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    script: [
      // Beat one: open the dimension the whole argument turns on.
      { move: "dim-scope" },
      { set: { hot: true } },
      { wait: 240 },
      { click: true },
      { set: { open: true, hot: false } },
      { wait: 2000 },
      // Beat two: the round resolves underneath it.
      { cursor: "hide" },
      { set: { compare: true } },
      { wait: 1700 },
      // Beat three: the lead lands, and the conclusion with it.
      { set: { leads: true } },
      { wait: 2400 },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame crumb="The tender evaluation">
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Kicker icon={ScrollText}>The read, in six dimensions</Kicker>
            <div className="mt-2 flex items-center gap-2 min-w-0">
              <span
                className="shrink-0 size-[26px] rounded-full inline-flex items-center justify-center text-[9.5px] font-bold"
                style={{ background: MONO, color: C.paper }}
              >
                MB
              </span>
              <span className="text-[13px] font-semibold truncate" style={{ color: C.ink }}>
                Meridian Building Co
              </span>
              <Pill tone="ink">Submitted</Pill>
            </div>
            <p className="mt-1.5 text-[9.5px] truncate" style={{ color: C.dim }}>
              $753,500 inc GST · fully priced, no allowances · 34 weeks
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className="font-ui font-semibold text-[24px] leading-none tabular-nums"
              style={{ color: C.ink }}
            >
              77
            </p>
            <p className="mt-1 text-[8px] uppercase tracking-[0.14em]" style={{ color: C.dim }}>
              Weighted overall
            </p>
          </div>
        </div>

        {/* The dossier's dimension panel sits straight on the canvas,
            hairline-divided, so the fade at its foot matches the page. */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col">
            {DIMS.map((d) => (
              <DimensionRow
                key={d.key}
                label={d.label}
                weight={d.weight}
                score={d.score}
                cursorKey={d.key === "scope" ? "dim-scope" : undefined}
                hot={d.key === "scope" && state.hot}
                open={d.key === "scope" && state.open}
                leads={d.key === "scope" && state.leads}
              >
                <WorkingPanel />
              </DimensionRow>
            ))}

            {/* The signals the card carries under the read. A builder
                reading this card is looking at what the client is told
                about them when nobody is selling. */}
            <div className="border-t pt-2.5 mt-2" style={{ borderColor: C.line }}>
              <p className="text-[10px]" style={{ color: C.muted }}>
                No significant flags · 3 worth attention
              </p>
              <p
                className="mt-2.5 text-[8.5px] tracking-[0.16em] uppercase font-semibold"
                style={{ color: C.dim }}
              >
                What stands out
              </p>
              <div className="mt-1.5 flex flex-col gap-1">
                {STANDS_OUT.map((s) => (
                  <span key={s} className="flex items-start gap-1.5">
                    <Check
                      className="size-3 shrink-0 mt-[1px]"
                      strokeWidth={3}
                      style={{ color: C.tealInk }}
                    />
                    <span className="text-[10px] leading-[1.4]" style={{ color: C.muted }}>
                      {s}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* The provenance footer. It is the sentence that makes the
                whole card a builder's argument rather than a client's. */}
            <p
              className="border-t mt-2.5 pt-2 text-[9px] leading-[1.5]"
              style={{ borderColor: C.line, color: C.dim }}
            >
              Every line of this evaluation is read from the signed disclosure made by Meridian
              Building Co. BuilderHQ computes the comparisons; it does not estimate, adjust or
              fill in any figure a builder did not provide.
            </p>
          </div>
          <ListFade />
        </div>

        {/* The comparison arrives as a band rather than a page change,
            so the score the reader just checked stays on screen. The
            band is always mounted and clipped to nothing at rest: an
            auto-height that is measured once, off a subtree that never
            changes shape, is the only kind that survives a flex column
            this tight. */}
        <div className="shrink-0">
          <motion.div
            className="overflow-hidden"
            initial={false}
            animate={{ height: state.compare ? "auto" : 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            <CompareStrip open={state.compare} conclusion={state.leads} />
          </motion.div>
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/** One dimension: the label, its published weight, the score, and the
 *  bar. The bar never re-animates on open; the reveal has to read as a
 *  receipt unfolding, not as the number being recalculated. */
function DimensionRow({
  label,
  weight,
  score,
  open,
  hot,
  leads,
  cursorKey,
  children,
}: {
  label: string;
  weight: number;
  score: number;
  open?: boolean;
  hot?: boolean;
  leads?: boolean;
  cursorKey?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border-t pb-1.5 pt-[5px] first:border-t-0 first:pt-0"
      style={{ borderColor: C.line }}
    >
      <div
        className="rounded-md px-1.5 -mx-1.5 py-[3px] transition-colors duration-200"
        style={{ background: hot ? C.tealWash : "transparent" }}
      >
        <div className="flex items-center justify-between gap-2">
          <span data-cursor={cursorKey} className="flex items-baseline gap-1.5 min-w-0">
            <span
              className="text-[11.5px] truncate"
              style={{ color: C.ink, fontWeight: open ? 600 : 400 }}
            >
              {label}
            </span>
            <span className="text-[9px] tabular-nums shrink-0" style={{ color: C.dim }}>
              {weight}%
            </span>
            <AnimatePresence initial={false}>
              {leads ? (
                <motion.span
                  className="shrink-0 rounded-full px-1.5 py-px text-[8.5px] font-semibold"
                  style={{ color: TONE.good.text, background: TONE.good.bg }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                >
                  Leads
                </motion.span>
              ) : null}
            </AnimatePresence>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span
              className="font-ui text-[14px] tabular-nums"
              style={{ color: leads ? C.tealInk : C.ink }}
            >
              {score}
            </span>
            <ChevronDown
              className="size-3 transition-transform duration-[280ms]"
              strokeWidth={2.4}
              style={{ color: C.dim, transform: open ? "rotate(180deg)" : undefined }}
            />
          </span>
        </div>
        <span
          className="mt-1.5 block h-[5px] w-full overflow-hidden rounded-full"
          style={{ background: C.line }}
        >
          <motion.span
            className="block h-full w-full origin-left rounded-full"
            style={{ background: leads ? LEAD : C.faint }}
            initial={false}
            animate={{ scaleX: score / 100 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** The working. Both sides shown: what the tender held, then what it
 *  gave away. The lines stagger in because the point is that a reader
 *  can follow the arithmetic, not that a panel appeared. */
function WorkingPanel() {
  return (
    <div
      className="mt-2 rounded-[3px] border px-3 py-2.5"
      style={{ borderColor: C.line, background: C.wash }}
    >
      <p
        className="flex items-baseline justify-between gap-2 text-[8.5px] tracking-[0.16em] uppercase mb-1.5"
        style={{ color: C.dim }}
      >
        <span>The working</span>
        <span className="tracking-normal normal-case shrink-0">
          25 percent of the overall · out of 100
        </span>
      </p>
      <dl>
        {WORKING.map((r, i) => (
          <React.Fragment key={r.label}>
            {r.kind === "delta" ? (
              <motion.p
                className="mt-1.5 mb-0.5 text-[8.5px] tracking-[0.16em] uppercase font-semibold"
                style={{ color: TONE.risk.text }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 0.24, delay: 0.06 * i }}
              >
                Missed or lost
              </motion.p>
            ) : null}
            <motion.div
              className="flex items-baseline gap-2.5 py-[2px]"
              style={
                r.kind === "base"
                  ? { borderBottom: `1px solid ${C.line}`, paddingBottom: 5, marginBottom: 4 }
                  : undefined
              }
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
            >
              <dt
                className="w-7 shrink-0 text-right font-mono text-[10.5px] tabular-nums"
                style={{
                  color:
                    r.kind === "base" ? C.ink : r.kind === "delta" ? TONE.risk.text : C.dim,
                  fontWeight: r.kind === "base" ? 600 : 500,
                }}
              >
                {r.n}
              </dt>
              <dd
                className="text-[10px] leading-[1.45]"
                style={{ color: r.kind === "note" ? C.dim : C.muted }}
              >
                {r.label}
              </dd>
            </motion.div>
          </React.Fragment>
        ))}
        <motion.div
          className="mt-1.5 flex items-baseline gap-2.5 pt-1.5 border-t"
          style={{ borderColor: C.line }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.26, delay: 0.3 }}
        >
          <dt
            className="w-7 shrink-0 text-right font-mono text-[11px] font-semibold tabular-nums"
            style={{ color: C.ink }}
          >
            94
          </dt>
          <dd className="text-[9.5px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>
            Score
          </dd>
        </motion.div>
      </dl>
    </div>
  );
}

/** The round on one dimension. Two tenders, the cheaper one first, each
 *  with the count its score was read from. No verdict is written here;
 *  the counts are the verdict. */
function CompareStrip({ open, conclusion }: { open: boolean; conclusion: boolean }) {
  return (
    <Card className="px-3 py-2">
      <Kicker>Scope coverage</Kicker>
      <div className="mt-1.5 flex flex-col gap-1">
        {COMPARE.map((t, i) => (
          <motion.div
            key={t.name}
            initial={false}
            animate={{ opacity: open ? 1 : 0, y: open ? 0 : 6 }}
            transition={{ duration: 0.34, delay: open ? 0.1 + i * 0.14 : 0, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10.5px] font-semibold truncate" style={{ color: C.ink }}>
                {t.name}
              </span>
              {t.lowest ? <Pill tone="ink">Lowest price</Pill> : null}
              <span
                className="ml-auto shrink-0 text-[12.5px] font-semibold tabular-nums"
                style={{ color: t.ours ? C.tealInk : C.ink }}
              >
                {t.score}
              </span>
            </div>
            <span
              className="mt-1 block h-[4px] w-full overflow-hidden rounded-full"
              style={{ background: C.line }}
            >
              <motion.span
                className="block h-full w-full origin-left rounded-full"
                style={{ background: t.ours ? LEAD : C.faint }}
                initial={false}
                animate={{ scaleX: open ? t.score / 100 : 0 }}
                transition={{
                  duration: open ? 0.68 : 0,
                  delay: open ? 0.18 + i * 0.14 : 0,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </span>
            <p className="mt-0.5 text-[9px] truncate" style={{ color: C.dim }}>
              {t.price}
              {t.note ? ` · ${t.note}` : ""} · {t.reason}
            </p>
          </motion.div>
        ))}
      </div>
      {/* Held in the layout from the start so the band's auto height
          never has to be re-measured mid-script. */}
      <motion.p
        className="mt-1.5 pt-1.5 border-t text-[9.5px] leading-[1.45]"
        style={{ borderColor: C.line, color: C.muted }}
        initial={false}
        animate={{ opacity: conclusion ? 1 : 0, y: conclusion ? 0 : 4 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      >
        Until each builder prices the same scope, their totals are not the same number.
      </motion.p>
    </Card>
  );
}
