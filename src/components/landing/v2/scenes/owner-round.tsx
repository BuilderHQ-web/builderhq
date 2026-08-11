"use client";

/**
 * Homeowner · step three — the round fills up.
 *
 * The "Builders on your round" panel from the live project page
 * (activity.tsx). The panel has a real state machine: it derives its
 * stage from how many builders have taken a spot, and rewrites the
 * status strip, the counter and the row list as each one arrives. So
 * the animation here is reportage rather than invention — it is the one
 * thing an owner actually watches this card do, over days.
 *
 * Three beats: a second builder takes a spot, a third fills the round,
 * then every row resolves to the same figure. That last beat is the
 * claim beside the card: one list, priced by all of them.
 *
 * One deliberate blend, because a miniature has to carry identity in a
 * single line: the header, counter and row shell are the project page's,
 * the "N years in operation · Suburb, VIC" line is the richer row from
 * the evaluation register one level down. The pending → verified chip
 * flip is left alone; verification happens off this screen and no owner
 * has ever watched it happen in place.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Check, Sparkles } from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { Avatar, C, Frame, Kicker, ListFade, VerifyChip, WashRow } from "./kit";

type Spots = 1 | 2 | 3;
type S = { spots: Spots; figures: boolean };

const RESTING: S = { spots: 1, figures: false };

/** The strip's two headline slots. The app pluralises both from the
 *  unlock count, which is why the round filling rewrites them. */
const KICK: Record<Spots, string> = {
  1: "1 builder on your round",
  2: "2 builders on your round",
  3: "3 builders on your round",
};

const HEAD: Record<Spots, string> = {
  1: "1 builder joined your round",
  2: "2 builders joined your round",
  3: "3 builders joined your round",
};

/** The seeded example round, in the order the spots were taken. */
const BUILDERS: Array<{ initials: string; name: string; line: string }> = [
  { initials: "CB", name: "Corten Build Co.", line: "6 years in operation · Melbourne, VIC" },
  { initials: "MB", name: "Meridian Building Co", line: "14 years in operation · Brunswick, VIC" },
  { initials: "BH", name: "Brightwater Homes", line: "22 years in operation · Ivanhoe, VIC" },
];

/** Band C. Static, and honestly so: every beat in this scene happens
 *  inside the one stage, so step two is current throughout. */
const STEPS: Array<{ n: string; state: "done" | "current" | "next"; chip: string; title: string; body: string }> = [
  {
    n: "1",
    state: "done",
    chip: "Done",
    title: "Builders are notified",
    body: "Verified builders matching your scope and area are notified when your project goes live.",
  },
  {
    n: "2",
    state: "current",
    chip: "You are here",
    title: "Builders join your round",
    body: "Up to 3 builders take a spot, open your full plans, and can ask questions here. You are notified each time.",
  },
  {
    n: "3",
    state: "next",
    chip: "2 to 3 weeks",
    title: "Compare and award",
    body: "Priced, itemised tenders arrive side by side. Compare, message, and award the builder you trust.",
  },
];

export function OwnerRoundScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  // No pointer. Nobody clicks a builder onto their own round; the whole
  // point of the panel is that it changes while the owner is elsewhere.
  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 1500,
    script: [
      { wait: 1100 },
      { set: { spots: 2 } },
      { wait: 1700 },
      { set: { spots: 3 } },
      { wait: 1800 },
      { set: { figures: true } },
      { wait: 2900 },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame crumb="Your round">
        {/* Band A — the round status strip. */}
        <div className="shrink-0">
          <Kicker>
            <PulseDot />
            <span className="inline-flex h-[11px] items-center">
              <Swap k={state.spots}>{KICK[state.spots]}</Swap>
            </span>
          </Kicker>
          <p
            className="mt-2 h-[19px] text-[15px] leading-[19px] font-ui font-semibold tracking-[-0.015em]"
            style={{ color: C.ink }}
          >
            <Swap k={state.spots}>{HEAD[state.spots]}</Swap>
          </p>
          <p className="mt-1.5 text-[10.5px] leading-[1.5] max-w-[52ch]" style={{ color: C.muted }}>
            They have your plans and contact details and can message you. Answer their questions to
            help them price it. Tenders usually follow within days.
          </p>
        </div>

        {/* Bands B and C, clipped as one. The shortest card in the deck
            cuts somewhere inside the stepper, which is the truth of the
            real page: that band sits below the fold there. */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-baseline justify-between gap-2 shrink-0">
            <Kicker icon={Sparkles}>Builders on your round</Kicker>
            <span className="inline-flex h-[13px] items-center text-[10px] tabular-nums" style={{ color: C.dim }}>
              <Swap k={state.spots}>{state.spots} of 3 spots taken</Swap>
            </span>
          </div>

          <div className="relative mt-2.5 flex-1 min-h-0 overflow-hidden">
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {BUILDERS.slice(0, state.spots).map((b, i) => (
                  <motion.li
                    key={b.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <BuilderRow initials={b.initials} name={b.name} line={b.line} figure={state.figures} index={i} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <div className="mt-4">
              <p
                className="inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.2em] font-medium"
                style={{ color: C.dim }}
              >
                <Activity className="size-3 shrink-0" strokeWidth={2.2} /> What happens next
              </p>
              <ol className="mt-2 grid grid-cols-3 gap-2">
                {STEPS.map((s) => (
                  <Step key={s.n} {...s} />
                ))}
              </ol>
            </div>

            <ListFade />
          </div>
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/* ── Parts ───────────────────────────────────────────────────────── */

/** A row on the round: initials, name, how long they have been building
 *  and where, and the two register chips. The figure slot on the right
 *  is always present and only fades, so a row arriving never reflows the
 *  name beside it. */
function BuilderRow({
  initials,
  name,
  line,
  figure,
  index,
}: {
  initials: string;
  name: string;
  line: string;
  figure: boolean;
  index: number;
}) {
  return (
    <WashRow className="px-3 py-2">
      <div className="flex items-center gap-2.5">
        <Avatar txt={initials} size={30} />
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] leading-[14px] font-semibold truncate" style={{ color: C.ink }}>{name}</p>
          <p className="mt-0.5 text-[9.5px] leading-[12px] truncate" style={{ color: C.dim }}>{line}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <VerifyChip label="ABN" />
            <VerifyChip label="Licence" />
          </div>
        </div>
        <motion.span
          className="shrink-0 w-[84px] text-right text-[9.5px] tabular-nums whitespace-nowrap"
          style={{ color: C.muted }}
          initial={false}
          animate={{ opacity: figure ? 1 : 0, y: figure ? 0 : 5 }}
          transition={{ duration: 0.42, delay: figure ? 0.16 * index : 0, ease: [0.16, 1, 0.3, 1] }}
        >
          228 items marked
        </motion.span>
      </div>
    </WashRow>
  );
}

/** One card of the "What happens next" stepper. Only the current card
 *  is lifted off the panel; the others sit flush with it. */
function Step({
  n,
  state,
  chip,
  title,
  body,
}: {
  n: string;
  state: "done" | "current" | "next";
  chip: string;
  title: string;
  body: string;
}) {
  const current = state === "current";
  return (
    <li
      className="rounded-lg border p-2.5"
      style={{
        borderColor: current ? C.tealLine : C.line,
        background: current ? C.tealWash : C.paper,
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border text-[9px] font-bold tabular-nums"
          style={
            current
              ? { borderColor: "transparent", background: C.teal, color: C.onTeal }
              : state === "done"
                ? { borderColor: C.tealLine, color: C.tealInk }
                : { borderColor: C.line3, color: C.dim }
          }
        >
          {state === "done" ? <Check className="size-2.5" strokeWidth={3} /> : n}
        </span>
        <span
          className="text-[7.5px] uppercase tracking-[0.14em] font-semibold truncate"
          style={{ color: current ? C.tealInk : C.dim }}
        >
          {chip}
        </span>
      </div>
      <p className="text-[10.5px] font-semibold leading-tight" style={{ color: state === "next" ? C.muted : C.ink }}>
        {title}
      </p>
      <p className="mt-1 text-[9px] leading-[1.45] line-clamp-4" style={{ color: C.dim }}>{body}</p>
    </li>
  );
}

/** A text slot that rewrites itself. The wrapper holds the height so a
 *  swap never shifts the line below it. */
function Swap({ k, children }: { k: React.Key; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={k}
        className="inline-block whitespace-nowrap"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

/** The strip's live dot. This is a genuine animate-ping in the product,
 *  so the pulse is faithful rather than decoration. */
function PulseDot() {
  return (
    <span className="relative inline-flex size-[6px] shrink-0 items-center justify-center">
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{ background: C.teal }}
        animate={{ scale: [1, 2.2, 2.2], opacity: [0.55, 0, 0] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
      />
      <span className="relative block size-[6px] rounded-full" style={{ background: C.teal }} />
    </span>
  );
}
