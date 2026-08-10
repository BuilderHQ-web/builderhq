"use client";

/**
 * The practice's journey — seven screens, from a client's drawings to a
 * recommendation with the practice's name on it.
 *
 * Written for a building designer running a round on a client's behalf,
 * which is why it holds two beats the homeowner's story never needs: the
 * Open / Private decision at wizard step 4, and the handover at the end.
 * Everything between those is the same product the homeowner uses, so it
 * is shown at the same fidelity and no faster than it can be read.
 *
 * HOW THIS RUNS, which is the part that changed.
 *
 * The first version mounted a screen, played one entrance, and replaced
 * it on a timer. It was choppy for a reason worth writing down: nothing
 * CAUSED the change. A screen simply became the next screen, which reads
 * as a slideshow of screenshots however nicely it crossfades.
 *
 * So there is now one script for the whole journey, run by the same
 * timeline engine the deck cards use, and every navigation is motivated.
 * The pointer reaches for a real control, the control lights under it,
 * the pointer hesitates for a beat, presses, and only then does the app
 * go somewhere. The controls are the product's own: the drop zone, the
 * pack rail's Continue, the Open card, Publish, the project page's link
 * into the tender stream, the Side by side nav pill, Back to project,
 * Share the project, Send the invitation.
 *
 * One scene, one pointer. Nothing here is mounted or unmounted from
 * outside, because that is what used to make the cursor blink out
 * between two screens. Only the screen body sits inside AnimatePresence;
 * the frame, its breadcrumb and the pointer never remount, and the
 * breadcrumb changing at the instant of a press is the cheapest signal
 * there is that the session navigated.
 *
 * Two surfaces are genuinely scrolled rather than quietly re-rendered
 * shorter: the scope register and the decision grid. Both translate a
 * column inside a fixed viewport, to waypoints hard coded from declared
 * heights, because a scene that measures itself drifts the first time a
 * font loads late. The grid holds its three column headings still while
 * the rows travel under them; a table whose headings scroll away is a
 * table whose numbers stop meaning anything.
 *
 * The whole script runs about forty five seconds, which is deliberate.
 * Seven surfaces cannot be read in twenty, and the reason the first
 * version felt rushed was not only that nothing caused it.
 *
 * Four compressions worth naming, because a later reader will otherwise
 * think they are mistakes:
 *
 *   · The scope register and the round settings are one route apart in
 *     the product: the pack is reviewed at /projects/[slug]/scope, the
 *     round mode is chosen in the edit wizard, and both happen before
 *     the project goes live. The rail's Continue is the forward control
 *     the pack surface actually renders, so it is the one pressed here.
 *   · The builder rows on "Builders join" carry the identity line from
 *     the evaluation register ("14 years in operation · Brunswick,
 *     VIC"). The project page's own row shows the state and the unlock
 *     recency instead. A miniature has one line to establish who these
 *     people are, and that is the line that does it.
 *   · That same screen puts the invitations manager under the round
 *     panel. In the product they are one route apart, the wizard and the
 *     project page, but invitations stay live after publish
 *     (tender-round-step.tsx:16-18) and the practice's builder joining
 *     its own invitation is the whole point of the step.
 *   · The last screen puts the sharing panel, which lives on the project
 *     page, beside the decision and the authorship line, which live on
 *     the evaluation. They are one press apart and they are the same
 *     moment: the practice's judgement, the practice's name on it, and
 *     the client given a seat rather than an email with three PDFs
 *     attached.
 *
 * The invited builder is never shown as verified. A builder joins on the
 * practice's say so, and BuilderHQ checks the ABN and the licence after
 * that, so the row carries the product's own "Verification in progress"
 * rather than the teal register chips the other two have earned.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Check,
  FileDown,
  FileUp,
  Files,
  Globe2,
  Lock,
  Mail,
  Play,
  Plus,
  Scale,
  Sparkles,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import {
  Avatar,
  C,
  Card,
  Division,
  ELEV,
  Frame,
  GhostBtn,
  Kicker,
  ListFade,
  Pill,
  ScopeLine,
  TONE,
  TealBtn,
  Track,
  VerifyChip,
  WashRow,
} from "./kit";

/* ── the state the script drives ─────────────────────────────────── */

type ScreenKey =
  | "upload"
  | "scope"
  | "who"
  | "join"
  | "tenders"
  | "compare"
  | "client";

type S = {
  screen: ScreenKey;
  /** The control under the pointer. One key for the whole journey, so a
   *  screen can never leave a stale highlight behind it. */
  hot: string | null;

  /* upload */
  phase: "drop" | "scanning" | "read";

  /* the scope register */
  open: string | null;
  cite: boolean;
  /** The register's offset. Negative scrolls the list up. */
  scopeY: number;

  /* who prices it */
  mode: "open" | "private";

  /* builders join */
  joined: boolean;

  /* the evaluation's section nav, as an index into NAV */
  sec: number;

  /* side by side */
  gridY: number;
  lit: boolean;
  scored: boolean;

  /* your client */
  form: boolean;
  decider: boolean;
  seated: boolean;
  record: boolean;
};

/**
 * Screen one, finished and waiting, with no pointer on it. This is what
 * renders under prefers-reduced-motion, and it is what the loop returns
 * to before it starts again, so it has to be the state the first press
 * acts on rather than the state after it.
 */
const RESTING: S = {
  screen: "upload",
  hot: null,
  phase: "drop",
  open: null,
  cite: false,
  scopeY: 0,
  mode: "private",
  joined: false,
  sec: 2,
  gridY: 0,
  lit: false,
  scored: false,
  form: false,
  decider: false,
  seated: false,
  record: false,
};

/** Where the session is. Changes on the press, not on the crossfade. */
const CRUMB: Record<ScreenKey, string> = {
  upload: "New project",
  scope: "Scope of works",
  who: "Who can tender",
  join: "Your round",
  tenders: "The tender evaluation",
  compare: "Side by side",
  client: "Single dwelling · Pascoe Vale, VIC",
};

/* ── the curves ──────────────────────────────────────────────────── */

/** Slow enough to read as a list being scrolled rather than a list
 *  jumping. Both scrolled surfaces share it. */
const SCROLL = { duration: 0.85, ease: [0.22, 1, 0.36, 1] } as const;
/** The app's entrance curve, for anything that opens in place. */
const OPEN = { duration: 0.38, ease: [0.16, 1, 0.3, 1] } as const;
/** The screen change itself. Never a cut. */
const SWAP = { duration: 0.4, ease: [0.16, 1, 0.3, 1] } as const;

/* ── the round, as every surface downstream reads it ─────────────── */

const TENDERS = [
  { mono: "CB", name: "Corten Build Co.", price: "$712,800", weighted: 47 },
  { mono: "MB", name: "Meridian Building Co", price: "$753,500", weighted: 86 },
  { mono: "BH", name: "Brightwater Homes", price: "$800,800", weighted: 94 },
] as const;

/** The round strip at the head of the evaluation. */
const STRIP: Array<[string, string, string]> = [
  ["Tenders received", "3", "project live 14 days"],
  ["Lowest tender inc GST", "$712,800", "highest $800,800 · 12% spread"],
  ["Significant flags", "2", "raised across the round"],
];

/** The evaluation's section nav. The pointer presses one of these to
 *  move from the tenders to the comparison, which is exactly what it is
 *  for on the real page. */
const NAV = [
  "The builders",
  "Overview",
  "The tenders",
  "Side by side",
  "Ideas",
  "Questions",
  "The record",
] as const;

/* ── the scene ───────────────────────────────────────────────────── */

export function ArchitectJourney({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 1800,
    script: [
      /* ── 1 · the plans go in ───────────────────────────────────── */
      { wait: 500 },
      { move: "drop", ms: 800 },
      { set: { hot: "drop" } },
      { wait: 420 },
      { click: true },
      { set: { phase: "scanning", hot: null } },
      { wait: 1150 },
      { set: { phase: "read" } },
      { wait: 700 },
      { move: "upload-continue", ms: 700 },
      { set: { hot: "upload-continue" } },
      { wait: 420 },
      { click: true },
      { set: { screen: "scope", hot: null } },
      { wait: 900 },

      /* ── 2 · the list that comes out, and where each line came
             from. The register is longer than the viewport, so it is
             genuinely scrolled rather than re-rendered shorter. ──── */
      { wait: 600 },
      { move: "div-earthworks", ms: 700 },
      { set: { hot: "div-earthworks" } },
      { wait: 420 },
      { click: true },
      { set: { open: "earthworks", hot: null } },
      { wait: 600 },
      { move: "cite-earthworks", ms: 600 },
      { set: { cite: true } },
      { wait: 950 },
      { set: { cite: false, scopeY: -140 } },
      { wait: 800 },
      { move: "scope-continue", ms: 700 },
      { set: { hot: "scope-continue" } },
      { wait: 420 },
      { click: true },
      { set: { screen: "who", hot: null } },
      { wait: 900 },

      /* ── 3 · the one screen only a practice sees. Choosing Open
             does what it does in the product: the spot count only
             exists on an open round, so it arrives as a consequence
             of the press rather than as a second animation. ─────── */
      { wait: 800 },
      { move: "mode-open", ms: 750 },
      { set: { hot: "mode-open" } },
      { wait: 420 },
      { click: true },
      { set: { mode: "open", hot: null } },
      { wait: 1300 },
      { move: "publish", ms: 750 },
      { set: { hot: "publish" } },
      { wait: 420 },
      { click: true },
      { set: { screen: "join", hot: null } },
      { wait: 900 },

      /* ── 4 · the round fills. The third builder is the practice's
             own, joining on its invitation, which is the only event
             on this journey the practice does not click. ────────── */
      { wait: 1200 },
      { set: { joined: true } },
      { wait: 1300 },
      { move: "stream", ms: 800 },
      { set: { hot: "stream" } },
      { wait: 420 },
      { click: true },
      { set: { screen: "tenders", sec: 2, hot: null } },
      { wait: 900 },

      /* ── 5 · three tenders, in the same shape ──────────────────── */
      { wait: 1200 },
      { move: "card-meridian", ms: 750 },
      { set: { hot: "card-meridian" } },
      { wait: 800 },
      // The card unlights as the pointer starts to leave it, not when it
      // arrives somewhere else. A hover that outlives the pointer is the
      // tell that nothing here is really being hovered.
      { set: { hot: null } },
      { move: "nav-3", ms: 700 },
      { set: { hot: "nav-3" } },
      { wait: 420 },
      { click: true },
      { set: { screen: "compare", sec: 3, hot: null } },
      { wait: 900 },

      /* ── 6 · the argument, in one table. The longest read on the
             journey, so the grid is scrolled in two stages with the
             teal cells arriving between them. ───────────────────── */
      { wait: 900 },
      { set: { lit: true } },
      { wait: 1200 },
      { set: { gridY: GRID_AT.mid } },
      { wait: 1100 },
      { set: { gridY: GRID_AT.foot, scored: true } },
      { wait: 1400 },
      { move: "back", ms: 800 },
      { set: { hot: "back" } },
      { wait: 420 },
      { click: true },
      { set: { screen: "client", hot: null } },
      { wait: 900 },

      /* ── 7 · the handover. Two presses, because that is what it
             takes in the product, and then the practice's name on
             the record settles under the seat it just handed out. ─ */
      { wait: 900 },
      { move: "share", ms: 750 },
      { set: { hot: "share" } },
      { wait: 420 },
      { click: true },
      { set: { form: true, hot: null } },
      { wait: 800 },
      { move: "role-decider", ms: 600 },
      { set: { hot: "role-decider" } },
      { wait: 360 },
      { click: true },
      { set: { decider: true, hot: null } },
      { wait: 650 },
      { move: "send", ms: 650 },
      { set: { hot: "send" } },
      { wait: 420 },
      { click: true },
      { set: { form: false, seated: true, hot: null } },
      { wait: 1300 },
      { set: { record: true } },
      { wait: 1500 },
      { cursor: "hide" },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full">
      {/* The frame, its breadcrumb and the pointer sit outside the
          crossfade and never remount. Only the body is replaced. */}
      <Frame crumb={CRUMB[state.screen]} avatar="SN">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.screen}
            className="flex-1 min-h-0 flex flex-col gap-2.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SWAP}
          >
            {state.screen === "upload" ? <UploadScreen s={state} /> : null}
            {state.screen === "scope" ? <ScopeScreen s={state} /> : null}
            {state.screen === "who" ? <WhoPricesScreen s={state} /> : null}
            {state.screen === "join" ? <BuildersJoinScreen s={state} /> : null}
            {state.screen === "tenders" ? <TendersInScreen s={state} /> : null}
            {state.screen === "compare" ? <CompareScreen s={state} /> : null}
            {state.screen === "client" ? <YourClientScreen s={state} /> : null}
          </motion.div>
        </AnimatePresence>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/* ── shared furniture ────────────────────────────────────────────── */

/**
 * The standing rail the wizard and the pack review both put at the foot
 * of the surface: a word on the left, the forward control on the right.
 * It belongs to its screen and leaves with it, which is what keeps it
 * from reading as a fixture of the hero.
 */
function Rail({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div
      className="shrink-0 flex items-center justify-between gap-3 border-t pt-2.5"
      style={{ borderColor: C.line }}
    >
      <span className="min-w-0 truncate">{left}</span>
      <span className="shrink-0">{right}</span>
    </div>
  );
}

/**
 * The teal primary, with the one thing a pointer needs from a button
 * before it presses it: a response. Scale and shadow only, so the
 * hover never touches layout.
 */
function PrimaryBtn({
  children,
  cursorKey,
  hot,
}: {
  children: React.ReactNode;
  cursorKey: string;
  hot: boolean;
}) {
  return (
    <motion.span
      className="inline-block rounded-full transition-shadow duration-200"
      initial={false}
      animate={{ scale: hot ? 1.05 : 1 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{ boxShadow: hot ? `0 12px 28px -14px ${C.tealLine}` : undefined }}
    >
      <TealBtn cursorKey={cursorKey}>{children}</TealBtn>
    </motion.span>
  );
}

/** The evaluation page's back link, and the pointer's way off it. */
function BackRow({ hot }: { hot: boolean }) {
  return (
    <span
      data-cursor="back"
      className="shrink-0 self-start inline-flex items-center gap-1.5 rounded px-1 -mx-1 text-[10px] transition-colors duration-200"
      style={{ color: hot ? C.tealInk : C.dim, background: hot ? C.tealWash : undefined }}
    >
      <ArrowLeft className="size-3 shrink-0" strokeWidth={2.2} />
      Back to project
    </span>
  );
}

/**
 * The evaluation's section nav. The pills are the real navigation on
 * that page, so one of them is what carries the journey from the
 * tenders to the comparison. The two buttons on the right are chrome
 * and stand down on a narrow frame, where the pills need the room.
 */
function EvalNav({ sec, hot }: { sec: number; hot: string | null }) {
  return (
    <div className="shrink-0 flex items-center gap-2">
      <div className="relative min-w-0 flex-1 flex items-center gap-1 overflow-hidden">
        {NAV.map((label, i) => {
          const on = sec === i;
          const lit = hot === `nav-${i}`;
          return (
            <span
              key={label}
              data-cursor={`nav-${i}`}
              className="shrink-0 rounded-full px-2 py-[4px] text-[9.5px] transition-colors duration-200"
              style={
                on
                  ? { color: TONE.good.text, background: TONE.good.bg, fontWeight: 600 }
                  : lit
                    ? { color: C.tealInk, background: C.tealWash, fontWeight: 600 }
                    : { color: C.muted }
              }
            >
              {label}
            </span>
          );
        })}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-9"
          style={{ background: `linear-gradient(90deg, transparent, ${C.canvas})` }}
        />
      </div>
      <span
        className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-[4px] text-[9px] font-semibold"
        style={{ borderColor: C.line2, color: C.muted }}
      >
        <FileDown className="size-2.5" />
        The report
      </span>
      <span
        className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-[4px] text-[9px] font-semibold"
        style={{ background: C.ink, color: C.canvas }}
      >
        <Play className="size-2.5 fill-current" />
        The quick read
      </span>
    </div>
  );
}

/** The round strip, shared by the two evaluation screens. */
function RoundStrip() {
  return (
    <Card className="shrink-0 grid grid-cols-3 overflow-hidden">
      {STRIP.map(([label, value, sub], i) => (
        <div
          key={label}
          className={"min-w-0 px-3 py-2 " + (i ? "border-l" : "")}
          style={{ borderColor: C.line }}
        >
          <p className="truncate text-[8px] uppercase tracking-[0.12em]" style={{ color: C.dim }}>
            {label}
          </p>
          <p
            className="mt-1 truncate font-ui font-semibold text-[17px] leading-none tabular-nums"
            style={{ color: C.ink }}
          >
            {value}
          </p>
          <p className="mt-1 truncate text-[8.5px] leading-none" style={{ color: C.muted }}>
            {sub}
          </p>
        </div>
      ))}
    </Card>
  );
}

/* ── 1 · Upload ──────────────────────────────────────────────────── */

/**
 * The intake at /projects/new, which the practice reaches through the
 * same wizard the homeowner does. The pointer presses the drop zone,
 * the product starts reading, and the wizard's own Continue is what
 * takes the session on. The rail is rendered from the first frame and
 * only fades in, so the geometry the pointer travels to never moves.
 */
function UploadScreen({ s }: { s: S }) {
  const read = s.phase === "read";
  const busy = s.phase !== "drop";

  return (
    <>
      <div className="shrink-0">
        <Kicker>AI auto-fill from plans</Kicker>
        <p
          className="mt-2 font-ui text-[16px] font-semibold tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
          Upload your plans
        </p>
        <p
          className="mt-1.5 line-clamp-2 max-w-[54ch] text-[10.5px] leading-[1.6]"
          style={{ color: C.muted }}
        >
          Drop in your architectural plans as a PDF. Our AI reads them and fills out your project
          for you.
        </p>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {busy ? (
            <motion.div
              key="scan"
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={OPEN}
            >
              <ScanSheet done={read} />
              <p className="mt-3 text-[12px] font-semibold" style={{ color: C.ink }}>
                {read ? "Got it." : "Reading your plans"}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: C.muted }}>
                {read ? "Pulled 24 details from your plans" : "Reading the title block…"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="drop"
              className="w-full max-w-[380px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <DropZone hot={s.hot === "drop"} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Rail
        left={
          <motion.span
            className="block truncate text-[10px]"
            style={{ color: C.dim }}
            initial={false}
            animate={{ opacity: read ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            You can edit anything in the next step.
          </motion.span>
        }
        right={
          <motion.span
            className="inline-block"
            initial={false}
            animate={{ opacity: read ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <PrimaryBtn cursorKey="upload-continue" hot={s.hot === "upload-continue"}>
              <ArrowRight className="size-3.5 shrink-0" strokeWidth={2.4} />
              Continue
            </PrimaryBtn>
          </motion.span>
        }
      />
    </>
  );
}

/** The drop zone: dashed hairline, blueprint grid, the teal disc. It
 *  lights the way the real label does on hover, before it is pressed. */
function DropZone({ hot }: { hot: boolean }) {
  return (
    <div
      data-cursor="drop"
      className="relative overflow-hidden rounded-lg border border-dashed px-5 py-8 flex flex-col items-center transition-colors duration-200"
      style={{
        borderColor: hot ? C.tealLine : C.line3,
        background: hot ? C.tealWash : C.wash,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 45%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 50% 45%, black 30%, transparent 80%)",
        }}
      />
      <span
        className="relative inline-flex size-11 items-center justify-center rounded-full"
        style={{ background: C.tealMuted, color: C.tealInk, boxShadow: `0 0 0 6px ${C.tealWash}` }}
      >
        <FileUp className="size-5" strokeWidth={2} />
      </span>
      <p className="relative mt-3.5 text-[12px] font-semibold" style={{ color: C.ink }}>
        Drop your plans here, or click to browse
      </p>
      <p className="relative mt-1.5 text-[10px]" style={{ color: C.dim }}>
        PDF · up to 28 MB
      </p>
    </div>
  );
}

/** The sheet being read. The product's own scan, at hero scale. */
function ScanSheet({ done }: { done: boolean }) {
  const bars = [54, 88, 64, 80, 46, 72, 90, 58];
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute -inset-4 rounded-[22px] blur-2xl"
        style={{ background: `radial-gradient(circle, ${C.tealMuted}, transparent 70%)` }}
      />
      <div
        className="relative w-[136px] h-[160px] rounded-[10px] border overflow-hidden px-3.5 py-3.5"
        style={{ borderColor: C.line3, background: C.paper, boxShadow: ELEV }}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="flex items-center gap-1.5">
            <span className="size-[10px] rounded-[3px]" style={{ background: C.teal }} />
            <span className="h-[4px] w-[42px] rounded-full" style={{ background: C.tealMuted }} />
          </span>
          <AnimatePresence initial={false}>
            {done ? (
              <motion.span
                key="ok"
                className="size-[14px] shrink-0 rounded-full grid place-items-center"
                style={{ background: C.teal, color: C.onTeal }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                <Check className="size-2.5" strokeWidth={3.4} />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="mt-3 flex flex-col gap-[7px]">
          {bars.map((w, i) => (
            <motion.span
              key={i}
              className="block h-[4px] rounded-full"
              style={{ width: `${w}%`, background: C.teal }}
              initial={false}
              animate={done ? { opacity: 0.85 } : { opacity: [0.16, 0.16, 1, 0.16] }}
              transition={
                done
                  ? { duration: 0.3 }
                  : {
                      duration: 2.4,
                      times: [0, i / (bars.length + 2), (i + 1.2) / (bars.length + 2), 1],
                      repeat: Infinity,
                      ease: "linear",
                    }
              }
            />
          ))}
        </div>

        {!done ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-[22px]"
            style={{
              background: `linear-gradient(180deg, transparent, ${C.tealMuted}, transparent)`,
            }}
            animate={{ top: ["6%", "86%", "6%"] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}
      </div>
    </div>
  );
}

/* ── 2 · The scope ───────────────────────────────────────────────── */

/** Ten of the register's thirty one divisions. Enough that the list
 *  reads as a register rather than a sample of one, and enough that the
 *  scroll has somewhere to go once one of them is open. */
const DIVISIONS: Array<{ key: string; label: string; count: string }> = [
  { key: "prelim", label: "Preliminaries and site establishment", count: "14 lines" },
  { key: "approvals", label: "Approvals, certification and compliance", count: "11 lines" },
  { key: "earthworks", label: "Earthworks and excavation", count: "8 lines" },
  { key: "footings", label: "Footings and ground floor structure", count: "7 lines" },
  { key: "concrete", label: "Concrete, formwork and reinforcement", count: "9 lines" },
  { key: "steel", label: "Structural steel and framing", count: "12 lines" },
  { key: "roofing", label: "Roofing, gutters and downpipes", count: "10 lines" },
  { key: "cladding", label: "External wall cladding and finishes", count: "9 lines" },
  { key: "windows", label: "Windows and external doors", count: "8 lines" },
  { key: "joinery", label: "Joinery and cabinetry", count: "11 lines" },
];

const OPEN_LINES: Array<{ label: string; plain: string; cite: string }> = [
  {
    label: "Bulk excavation, cut and fill",
    plain: "The big earthmoving that levels a sloping block into the platforms the home sits on.",
    cite: "Civil C03, page 2, Rev B",
  },
  {
    label: "Detailed excavation for footings and services",
    plain: "The precise trenches and pier holes dug for footings, slab edges and underground pipes.",
    cite: "Structural S02, page 4, Rev B",
  },
];

/**
 * The list written from the practice's own drawings. The pointer opens
 * a division nobody has looked at and then reads the citation under the
 * first line, because for a practice the claim is not that a list
 * exists, it is that every line on it can be traced back to a sheet
 * they drew. Then the register scrolls, which is the only honest way to
 * show that there is a great deal more of it.
 */
function ScopeScreen({ s }: { s: S }) {
  return (
    <>
      <div className="shrink-0 flex items-baseline justify-between gap-3">
        <p className="font-ui text-[14px] font-semibold" style={{ color: C.ink }}>
          Scope of works
        </p>
        <p className="shrink-0 text-[10px] tabular-nums" style={{ color: C.dim }}>
          228 lines · 29 trades
        </p>
      </div>
      <p
        className="shrink-0 -mt-1 line-clamp-2 text-[10.5px] leading-[1.55]"
        style={{ color: C.muted }}
      >
        Read directly from your documents. Each line shows the page it came from.
      </p>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <motion.div
          className="flex flex-col gap-2"
          initial={false}
          animate={{ y: s.scopeY }}
          transition={SCROLL}
        >
          {DIVISIONS.map((d) => (
            <Division
              key={d.key}
              label={d.label}
              count={d.count}
              cursorKey={`div-${d.key}`}
              hot={s.hot === `div-${d.key}`}
              open={s.open === d.key}
            >
              {d.key === "earthworks"
                ? OPEN_LINES.map((l, i) => (
                    <ScopeLine
                      key={l.label}
                      label={l.label}
                      plain={l.plain}
                      cite={l.cite}
                      citeKey={i === 0 ? "cite-earthworks" : undefined}
                      citeHot={i === 0 && s.cite}
                    />
                  ))
                : null}
            </Division>
          ))}
        </motion.div>
        <ListFade />
      </div>

      <Rail
        left={<span />}
        right={
          <GhostBtn cursorKey="scope-continue" hot={s.hot === "scope-continue"}>
            Continue
            <ArrowRight className="size-3.5 shrink-0" strokeWidth={2.2} />
          </GhostBtn>
        }
      />
    </>
  );
}

/* ── 3 · Who prices it ───────────────────────────────────────────── */

const MODES: Array<{ id: "open" | "private"; title: string; sub: string; icon: LucideIcon }> = [
  {
    id: "open",
    title: "Open",
    sub: "Visible on BuilderHQ. Verified builders can take a spot, and you can still invite builders you already trust.",
    icon: Globe2,
  },
  {
    id: "private",
    title: "Private",
    sub: "By invitation only. The round never appears in the marketplace, and one invited builder is a perfectly valid round.",
    icon: Lock,
  },
];

/**
 * Wizard step 4, the one screen where the architect-only moves live,
 * and so the one with the best choreography. The practice arrives on
 * Private, the pointer hovers Open until it lights, presses it, and the
 * panel below genuinely changes: the spot count only exists on an open
 * round, so it mounts as a consequence, and the invitation card rewrites
 * its own subtitle because the invitation now means something different.
 */
function WhoPricesScreen({ s }: { s: S }) {
  const open = s.mode === "open";

  return (
    <>
      {/* No section heading on this screen. The breadcrumb already says
          which wizard step this is, and the 24px it would cost are the
          24px that keep the invitation itself out from under the fade. */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-2.5">
          <StepCard icon={Globe2} title="Who can tender" sub="Pick how builders come to this round.">
            <div className="grid grid-cols-2 gap-2.5">
              {MODES.map((m) => (
                <ModeOption
                  key={m.id}
                  title={m.title}
                  sub={m.sub}
                  icon={m.icon}
                  active={m.id === s.mode}
                  cursorKey={m.id === "open" ? "mode-open" : undefined}
                  hot={m.id === "open" && s.hot === "mode-open"}
                />
              ))}
            </div>
          </StepCard>

          {/* Spots are an open-round idea, so this card is the product's
              own conditional rather than a reveal invented for the hero. */}
          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                key="spots"
                className="overflow-hidden shrink-0"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={OPEN}
              >
                <StepCard
                  icon={UserRound}
                  title="Tender spots"
                  sub="How many builders can price this project."
                >
                  <div className="flex items-center gap-2">
                    {[2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className="h-7 w-10 rounded-md border grid place-items-center text-[11.5px] font-ui font-semibold tabular-nums"
                        style={
                          n === 3
                            ? { borderColor: C.tealLine, background: C.tealWash, color: C.ink }
                            : { borderColor: C.line, background: C.wash, color: C.muted }
                        }
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </StepCard>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <StepCard
            icon={Mail}
            title="Invited builders"
            sub={
              open
                ? "These builders join free. Remaining spots open to the network."
                : "Only these builders can price the project. They join free."
            }
          >
            <p className="mb-1.5 text-[10px]" style={{ color: C.muted }}>
              <span className="font-ui font-semibold tabular-nums" style={{ color: C.ink }}>
                1
              </span>{" "}
              {open ? "invited · 3 spots in the round" : "builder invited · they are the round"}
            </p>
            {/* The two add-a-builder buttons sit under this row in the
                product. They are left off here because at every frame
                height the journey runs at they would land under the
                fade, and 40px of height nobody can read is 40px the
                invitation itself needs. */}
            <InviteRow name="Brightwater Homes" detail="BuilderHQ builder" status="Invited" />
          </StepCard>
        </div>
        <ListFade />
      </div>

      <Rail
        left={
          <span
            className="inline-flex items-center gap-1.5 text-[10.5px]"
            style={{ color: C.tealInk }}
          >
            <Check className="size-3.5 shrink-0" strokeWidth={2.6} />
            Ready to publish
          </span>
        }
        right={
          <PrimaryBtn cursorKey="publish" hot={s.hot === "publish"}>
            Publish
          </PrimaryBtn>
        }
      />
    </>
  );
}

/** The wizard's card: header band with a teal glyph, then a body. */
function StepCard({
  icon: Icon,
  title,
  sub,
  children,
}: {
  icon: LucideIcon;
  title: string;
  sub: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg border overflow-hidden shrink-0"
      style={{ borderColor: C.line, background: C.paper, boxShadow: ELEV }}
    >
      <header
        className="flex items-start gap-2.5 px-3 py-1.5 border-b"
        style={{ borderColor: C.line }}
      >
        <span
          className="size-[22px] shrink-0 rounded-md border grid place-items-center"
          style={{ borderColor: C.line, background: C.wash, color: C.tealInk }}
        >
          <Icon className="size-[12px]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[11.5px] font-ui font-semibold leading-tight" style={{ color: C.ink }}>
            {title}
          </p>
          <p className="mt-0.5 truncate text-[9.5px] leading-tight" style={{ color: C.dim }}>
            {sub}
          </p>
        </div>
      </header>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}

/** One of the two options. Selected is a teal hairline, a teal wash and
 *  the check disc, which is all the real button does. Hovered is the
 *  hairline alone, which is all it does before it is pressed. */
function ModeOption({
  title,
  sub,
  icon: Icon,
  active,
  cursorKey,
  hot,
}: {
  title: string;
  sub: string;
  icon: LucideIcon;
  active: boolean;
  cursorKey?: string;
  hot?: boolean;
}) {
  return (
    <div
      data-cursor={cursorKey}
      className="rounded-md border px-2.5 py-2 transition-colors duration-300"
      style={{
        borderColor: active || hot ? C.tealLine : C.line,
        background: active ? C.tealWash : C.wash,
      }}
    >
      {/* Icon, name and tick share one row. The wizard stacks them; at
          this scale stacking costs a row the invitation below needs. */}
      <div className="flex items-center gap-2">
        <span
          className="size-[22px] shrink-0 rounded-md border grid place-items-center transition-colors duration-300"
          style={
            active || hot
              ? { borderColor: C.tealLine, background: C.tealMuted, color: C.tealInk }
              : { borderColor: C.line, background: "transparent", color: C.dim }
          }
        >
          <Icon className="size-[12px]" strokeWidth={2.2} />
        </span>
        <p className="min-w-0 flex-1 truncate text-[11.5px] font-ui font-semibold" style={{ color: C.ink }}>
          {title}
        </p>
        <AnimatePresence initial={false}>
          {active ? (
            <motion.span
              key="tick"
              className="size-[18px] shrink-0 rounded-full grid place-items-center"
              style={{ background: C.teal, color: C.onTeal }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <Check className="size-2.5" strokeWidth={3.2} />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[9.5px] leading-[1.5]" style={{ color: C.dim }}>
        {sub}
      </p>
    </div>
  );
}

/**
 * An invited builder. Sparse on purpose: the product shows a name, one
 * detail line and the status, and the amber pill only once a builder has
 * joined on the invitation and BuilderHQ has yet to finish checking them.
 */
function InviteRow({
  name,
  detail,
  status,
}: {
  name: string;
  detail: string;
  status: "Invited" | "Joined";
}) {
  const joined = status === "Joined";
  return (
    <div
      className="flex items-center gap-2.5 rounded-md border px-2.5 py-2"
      style={{ borderColor: joined ? C.tealLine : C.line, background: C.wash }}
    >
      <span
        className="size-[26px] shrink-0 rounded-md border grid place-items-center"
        style={{ borderColor: C.line, background: C.paper2, color: C.dim }}
      >
        <UserRound className="size-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-ui font-medium" style={{ color: C.ink }}>
          {name}
        </p>
        <p className="truncate text-[9.5px]" style={{ color: C.dim }}>
          {detail}
        </p>
        <AnimatePresence initial={false}>
          {joined ? (
            <motion.div
              key="pending"
              className="overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={OPEN}
            >
              <span className="inline-flex pt-1.5">
                <Pill tone="warn">Verification in progress</Pill>
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <span className="shrink-0">
        <Pill tone={joined ? "good" : "ink"}>{status}</Pill>
      </span>
    </div>
  );
}

/* ── 4 · Builders join ───────────────────────────────────────────── */

/** The two builders who took open spots. The identity line is the
 *  evaluation register's, which is the one line that says who they are. */
const TAKEN: Array<{ initials: string; name: string; line: string }> = [
  { initials: "CB", name: "Corten Build Co.", line: "6 years in operation · Melbourne, VIC" },
  { initials: "MB", name: "Meridian Building Co", line: "14 years in operation · Brunswick, VIC" },
];

/**
 * The round filling. Two builders came off the marketplace and were
 * checked before they arrived; the third is the practice's own, and it
 * joins on the practice's authority rather than on a completed check.
 *
 * This is the one screen the pointer does not cause: builders arriving
 * is something that happens to the practice, not something it clicks.
 * What it does click is the way out, and the way out is the project
 * page's own link into the tender stream, which is where the next two
 * weeks of the round are waiting.
 */
function BuildersJoinScreen({ s }: { s: S }) {
  return (
    <>
      <div className="shrink-0 flex items-baseline justify-between gap-2">
        <Kicker icon={Sparkles}>Builders on your round</Kicker>
        <span className="shrink-0 text-[10.5px] tabular-nums" style={{ color: C.dim }}>
          {s.joined ? "3 of 3 spots taken" : "2 of 3 spots taken"}
        </span>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col gap-2.5">
        {TAKEN.map((b, i) => (
          <motion.div
            key={b.name}
            className="shrink-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
          >
            <WashRow className="px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar txt={b.initials} size={30} />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[12px] font-semibold leading-[15px]"
                    style={{ color: C.ink }}
                  >
                    {b.name}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] leading-[13px]" style={{ color: C.dim }}>
                    {b.line}
                  </p>
                </div>
                <span className="hidden sm:flex shrink-0 items-center gap-1.5">
                  <VerifyChip label="ABN" />
                  <VerifyChip label="Licence" />
                </span>
              </div>
            </WashRow>
          </motion.div>
        ))}

        <motion.div
          className="shrink-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 px-3 pt-2.5">
              <Kicker icon={Mail}>Invited builders</Kicker>
            </div>
            <p
              className="px-3 pt-1.5 pb-2 line-clamp-2 text-[10px] leading-[1.5]"
              style={{ color: C.muted }}
            >
              These builders join free. Remaining spots open to the network.
            </p>
            <div className="px-3 pb-3">
              <InviteRow
                name="Brightwater Homes"
                detail="BuilderHQ builder"
                status={s.joined ? "Joined" : "Invited"}
              />
            </div>
          </Card>
        </motion.div>

        {/* The project page's tenders card, which is where a round that
            has filled goes next. Nothing has been priced yet, and the
            card says so in the product's own words. */}
        <motion.div
          className="shrink-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="overflow-hidden px-3 py-2.5">
            <Kicker icon={Files}>Tenders · 0</Kicker>
            <p
              className="mt-1.5 line-clamp-2 text-[10px] leading-[1.55]"
              style={{ color: C.muted }}
            >
              No tenders yet. Builders who take a spot on your round submit tenders here, laid out
              side by side for comparison.
            </p>
            <span
              data-cursor="stream"
              className="mt-2 inline-flex items-center gap-1.5 rounded px-1 -mx-1 text-[10.5px] font-medium transition-colors duration-200"
              style={{
                color: C.tealInk,
                background: s.hot === "stream" ? C.tealWash : undefined,
              }}
            >
              View tender stream
              <ArrowUpRight className="size-3 shrink-0" strokeWidth={2.4} />
            </span>
          </Card>
        </motion.div>

        <ListFade />
      </div>
    </>
  );
}

/* ── 5 · Tenders in ──────────────────────────────────────────────── */

/** What each tender says about itself on its own card. */
const SUBMITTED: Array<{
  key: string;
  mono: string;
  name: string;
  price: string;
  weeks: string;
  /** How much of the price is committed in the contract sum. */
  firmPct: number;
  firm: string;
}> = [
  {
    key: "corten",
    mono: "CB",
    name: "Corten Build Co.",
    price: "$712,800",
    weeks: "36 weeks",
    firmPct: 84,
    firm: "Firm to 84% · $105,000 in allowances",
  },
  {
    key: "meridian",
    mono: "MB",
    name: "Meridian Building Co",
    price: "$753,500",
    weeks: "34 weeks",
    firmPct: 100,
    firm: "Fully priced, no allowances",
  },
  {
    key: "brightwater",
    mono: "BH",
    name: "Brightwater Homes",
    price: "$800,800",
    weeks: "30 weeks",
    firmPct: 100,
    firm: "Fully priced, no allowances",
  },
];

/**
 * Three tenders, arriving in the same shape. The cards land one after
 * another rather than all at once, because the point of the screen is
 * not that three prices exist, it is that all three answered the same
 * submission and so land on the same three fields.
 *
 * The pointer rests on one of them before it moves on, which is what a
 * reader does with a card they are about to compare, and then presses
 * the section nav to go and compare it.
 */
function TendersInScreen({ s }: { s: S }) {
  return (
    <>
      <BackRow hot={s.hot === "back"} />
      <EvalNav sec={s.sec} hot={s.hot} />
      <p
        className="shrink-0 hidden sm:block line-clamp-2 max-w-[68ch] text-[9.5px] leading-[1.55]"
        style={{ color: C.muted }}
      >
        Every builder tendering here answered the same structured submission, under declaration. The
        analysis below is read entirely from what they disclosed. Nothing is estimated.
      </p>
      <RoundStrip />

      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* The cards take the full height of the frame's remainder, as
            they do on the real page, rather than sitting in a band with
            dead canvas under them. */}
        <div className="grid h-full grid-cols-3 gap-2.5">
          {SUBMITTED.map((t, i) => {
            const hot = s.hot === `card-${t.key}`;
            return (
              <motion.div
                key={t.name}
                data-cursor={`card-${t.key}`}
                className="flex h-full flex-col rounded-lg border overflow-hidden transition-colors duration-200"
                style={{
                  borderColor: hot ? C.tealLine : C.line,
                  background: hot ? C.tealWash : C.paper,
                  boxShadow: ELEV,
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.44, delay: 0.16 * i, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-1.5 px-2.5 pt-2.5">
                  <span
                    className="size-[20px] shrink-0 rounded-full inline-flex items-center justify-center text-[8px] font-bold"
                    style={{ background: C.tealMuted, color: C.tealInk }}
                  >
                    {t.mono}
                  </span>
                  <p className="min-w-0 truncate text-[10.5px] font-semibold" style={{ color: C.ink }}>
                    {t.name}
                  </p>
                </div>
                <div className="px-2.5 pt-3">
                  <p className="text-[7.5px] uppercase tracking-[0.14em]" style={{ color: C.dim }}>
                    Tender price inc GST
                  </p>
                  <p
                    className="mt-1 truncate font-ui font-semibold text-[16px] leading-none tabular-nums"
                    style={{ color: C.ink }}
                  >
                    {t.price}
                  </p>
                  <p className="mt-1.5 text-[9.5px]" style={{ color: C.muted }}>
                    {t.weeks}
                  </p>
                  {/* The firm-versus-allowance split, as the tender card
                      draws it: the solid part is committed, the amber
                      tail can still move. */}
                  <span
                    className="relative mt-2.5 block w-full overflow-hidden rounded-full"
                    style={{ height: 6, background: TONE.warn.border }}
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${t.firmPct}%`,
                        background: `linear-gradient(90deg, ${C.ink}, ${C.tealInk})`,
                      }}
                    />
                  </span>
                </div>
                <p
                  className="mt-auto line-clamp-2 border-t px-2.5 py-2 text-[9px] leading-[1.45]"
                  style={{ borderColor: C.line, color: C.dim }}
                >
                  {t.firm}
                </p>
                <div className="border-t px-2.5 py-2" style={{ borderColor: C.line }}>
                  <Pill tone="ink">Submitted</Pill>
                </div>
              </motion.div>
            );
          })}
        </div>
        <ListFade />
      </div>
    </>
  );
}

/* ── 6 · Compare ─────────────────────────────────────────────────── */

/** One grid for every band, exactly as the comparison surface does it. */
const COLS = "minmax(0,1.05fr) repeat(3, minmax(0,1fr))";

type GridRow = { label: string; v: [string, string, string]; best?: number[] };

/**
 * The decision grid, its labelled groups and the app's own rule for the
 * strongest position on a line. A row where every column wins is a row
 * where nobody does, so those are left untinted.
 *
 * The column is taller than the viewport by design: the two waypoints
 * below are hard coded from the declared row heights rather than
 * measured, because a scene that measures itself drifts the first time
 * a font loads late.
 */
const GRID: Array<{ title: string; rows: GridRow[] }> = [
  {
    title: "The money",
    rows: [
      { label: "Price inc GST", v: ["$712,800", "$753,500", "$800,800"], best: [0] },
      {
        label: "Firm portion",
        v: ["$543,000 (84%)", "$685,000 (100%)", "$728,000 (100%)"],
        best: [1, 2],
      },
      { label: "Allowances", v: ["$105,000 (2 PS, 3 PC)", "None", "None"], best: [1, 2] },
      { label: "Escalation", v: ["Uncapped", "None", "None"] },
    ],
  },
  {
    title: "The programme",
    rows: [
      { label: "Build period", v: ["36 weeks", "34 weeks", "30 weeks"], best: [2] },
      {
        label: "Liquidated damages",
        v: ["Not offered", "Not offered", "$2,500/week"],
        best: [2],
      },
    ],
  },
  {
    title: "Scope",
    rows: [
      { label: "Trades in the price", v: ["14 of 22", "23 of 23", "23 of 23"], best: [1, 2] },
      { label: "Excluded scope items", v: ["2", "0", "0"], best: [1, 2] },
    ],
  },
];

/** The declared geometry the waypoints are computed from. */
const G = { head: 38, label: 22, row: 34, weighted: 44, foot: 26 } as const;

/** Everything that scrolls beneath the pinned column header. */
const GRID_BODY =
  GRID.reduce((h, g) => h + G.label + g.rows.length * G.row, 0) + G.label + G.weighted + G.foot;

/**
 * The viewport those rows travel through at the 528px frame: 442 of
 * canvas, less the back link, the section nav and their gaps, less the
 * card's own head, less the header row that now holds the top.
 * Measured against the rendered scene rather than guessed.
 */
const GRID_VIEW = 237;

/** Two stops: into the middle of the money, then the foot of the
 *  table, where the weighted overall is. */
const GRID_AT = { mid: -90, foot: -(GRID_BODY - GRID_VIEW) } as const;

/**
 * The whole argument for a practice, in one table: three submissions on
 * one grid, so there is nothing to reconcile before they can be read.
 * The longest read on the journey, because it is the only screen with
 * something to actually study.
 *
 * Two things arrive rather than being asserted. The teal cells sweep in
 * a row at a time, which is how a reader sees that no single tender
 * wins everything; and the weighted overall fills last, because it is
 * scored under a fixed rubric applied identically to every tender and
 * so is the conclusion, not the premise.
 */
function CompareScreen({ s }: { s: S }) {
  return (
    <>
      <BackRow hot={s.hot === "back"} />
      <EvalNav sec={s.sec} hot={s.hot} />

      <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="shrink-0 px-3.5 pt-3 pb-2.5">
          <Kicker icon={Scale}>Side by side</Kicker>
          <p
            className="mt-1.5 font-ui text-[15px] font-semibold uppercase tracking-[-0.015em] leading-none"
            style={{ color: C.ink }}
          >
            The decision grid
          </p>
          <p
            className="mt-1.5 hidden sm:block line-clamp-2 max-w-[64ch] text-[9.5px] leading-[1.5]"
            style={{ color: C.muted }}
          >
            Every row is the builders&apos; own answers, lined up. A teal cell holds the strongest
            position on that line.
          </p>
        </div>

        <div className="relative flex-1 min-h-0 overflow-hidden">
          {/* The three columns hold the top of the viewport while the
              rows travel under them. A grid whose headings scroll away
              is a grid whose numbers stop meaning anything, and the
              scroll is the whole point of this screen. */}
          <div
            className="absolute inset-x-0 top-0 z-10 border-t"
            style={{
              borderColor: C.line,
              background: C.paper,
              display: "grid",
              gridTemplateColumns: COLS,
              height: G.head,
            }}
          >
            <span />
            {TENDERS.map((t) => (
              <div
                key={t.name}
                className="min-w-0 border-l px-2 flex items-center gap-1.5"
                style={{ borderColor: C.line }}
              >
                <span
                  className="size-[18px] shrink-0 rounded-full inline-flex items-center justify-center text-[7px] font-bold"
                  style={{ background: C.tealMuted, color: C.tealInk }}
                >
                  {t.mono}
                </span>
                <span className="min-w-0">
                  <span
                    className="block truncate text-[9.5px] font-semibold leading-tight"
                    style={{ color: C.ink }}
                  >
                    {t.name}
                  </span>
                  <span
                    className="block truncate text-[8.5px] tabular-nums"
                    style={{ color: C.muted }}
                  >
                    {t.price} inc GST
                  </span>
                </span>
              </div>
            ))}
          </div>

          <motion.div
            className="absolute inset-x-0"
            style={{ top: G.head }}
            initial={false}
            animate={{ y: s.gridY }}
            transition={SCROLL}
          >
            {GRID.map((group, gi) => (
              <div key={group.title}>
                <p
                  className="flex items-end px-3 pb-[4px] text-[8.5px] tracking-[0.2em] uppercase"
                  style={{ color: C.dim, height: G.label }}
                >
                  {group.title}
                </p>
                {group.rows.map((row, ri) => {
                  const meaningful = !!row.best && row.best.length < 3;
                  return (
                    <div
                      key={row.label}
                      className="border-t"
                      style={{
                        borderColor: C.line,
                        display: "grid",
                        gridTemplateColumns: COLS,
                        height: G.row,
                      }}
                    >
                      <div className="flex items-center px-3 min-w-0">
                        <span
                          className="line-clamp-2 text-[9.5px] leading-[1.35]"
                          style={{ color: C.dim }}
                        >
                          {row.label}
                        </span>
                      </div>
                      {row.v.map((value, j) => {
                        const win = s.lit && meaningful && row.best!.includes(j);
                        return (
                          <div
                            key={j}
                            className="min-w-0 border-l px-2 flex items-center transition-colors duration-500"
                            style={{
                              borderColor: C.line,
                              background: win ? TONE.good.bg : undefined,
                              transitionDelay: `${(gi * 4 + ri) * 90}ms`,
                            }}
                          >
                            <span
                              className="block line-clamp-2 text-[9.5px] leading-[1.35]"
                              style={
                                win ? { color: TONE.good.text, fontWeight: 600 } : { color: C.ink }
                              }
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
              className="flex items-end px-3 pb-[4px] text-[8.5px] tracking-[0.2em] uppercase"
              style={{ color: C.dim, height: G.label }}
            >
              The six dimensions
            </p>
            <div
              className="border-t"
              style={{
                borderColor: C.line,
                display: "grid",
                gridTemplateColumns: COLS,
                height: G.weighted,
              }}
            >
              <div className="flex items-center px-3 min-w-0">
                <span className="truncate text-[9.5px] font-semibold" style={{ color: C.ink }}>
                  Weighted overall
                </span>
              </div>
              {TENDERS.map((t) => (
                <div
                  key={t.name}
                  className="min-w-0 border-l px-2 flex flex-col justify-center gap-1.5"
                  style={{ borderColor: C.line }}
                >
                  <span
                    className="font-ui font-semibold text-[14px] leading-none tabular-nums"
                    style={{ color: C.ink }}
                  >
                    {t.weighted}
                  </span>
                  <Track pct={s.scored ? t.weighted : 0} h={4} />
                </div>
              ))}
            </div>

            <p
              className="flex items-center border-t px-3 text-[8.5px] truncate"
              style={{ borderColor: C.line, color: C.dim, height: G.foot }}
            >
              Open any builder&apos;s full evaluation to see the working behind their dimension
              scores.
            </p>
          </motion.div>
          <ListFade />
        </div>
      </Card>
    </>
  );
}

/* ── 7 · Your client ─────────────────────────────────────────────── */

/**
 * The handover. The practice's judgement, the client given a seat at the
 * round rather than an email with three PDFs attached, and the
 * practice's name on the record.
 *
 * It takes two presses, because it takes two in the product: the panel
 * opens the invitation form, the practice chooses what the client is
 * allowed to do, and the seat arrives already attributed with a name, a
 * date and the seat they hold. Nothing on this screen is anonymous,
 * which is the point of ending here.
 */
function YourClientScreen({ s }: { s: S }) {
  return (
    <>
      {/* The decision. Stood down on a phone: at 304px of frame the
          choice is between showing the recommendation and showing the
          handover the pointer is about to perform, and the handover is
          what this screen is for. */}
      <Card
        className="hidden sm:block shrink-0 overflow-hidden"
        style={{ borderColor: C.tealLine, background: C.tealWash }}
      >
        <div className="px-3 pt-2.5 pb-2">
          <div className="flex items-center gap-3">
            <Avatar txt="MB" size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-tight" style={{ color: C.ink }}>
                Meridian Building Co
              </p>
              <p
                className="mt-1 truncate text-[10.5px] leading-tight tabular-nums"
                style={{ color: C.muted }}
              >
                $753,500 inc GST
                <span style={{ color: C.dim }}> · 34 weeks</span>
              </p>
            </div>
            <span className="shrink-0">
              <Pill tone="good">Shortlisted</Pill>
            </span>
          </div>
          <p className="mt-2 truncate text-[9.5px]" style={{ color: C.dim }}>
            Fully priced, no allowances · No significant flags
          </p>
        </div>
        <div
          className="flex items-center justify-end gap-2 border-t px-3 py-2"
          style={{ borderColor: C.line }}
        >
          <GhostBtn hot>
            <Star className="size-3 shrink-0" strokeWidth={2.2} fill="currentColor" />
            Shortlisted
          </GhostBtn>
          <span
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-md text-[11px] font-semibold"
            style={{ background: C.ink, color: C.paper }}
          >
            <Award className="size-3 shrink-0" strokeWidth={2.2} />
            Award
          </span>
        </div>
      </Card>

      {/* the seat */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="shrink-0 px-3 pt-2.5">
          <Kicker icon={Users}>Sharing</Kicker>
          <p className="mt-1.5 line-clamp-2 text-[10px] leading-[1.55]" style={{ color: C.muted }}>
            Give your client a seat at the round. A seat sees the project and the evaluation; a
            Deciding seat can also shortlist and award.
          </p>
        </div>

        {/* No fade here. This panel is not a list that keeps going, and
            the one thing under a fade would be the button the pointer
            has to press. */}
        <div className="relative flex-1 min-h-0 overflow-hidden px-3 pt-2 pb-2 flex flex-col gap-2">
          {/* mode="wait" so the empty panel is gone before the seat
              lands: both in the flow at once would shunt the row below
              it down a row-height and back. */}
          <AnimatePresence mode="wait" initial={false}>
            {s.seated ? (
              <motion.div
                key="seat"
                className="shrink-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                <WashRow className="flex items-center gap-3 px-2.5 py-2" hot>
                  <span
                    className="size-8 shrink-0 rounded-md border inline-flex items-center justify-center"
                    style={{ borderColor: C.line2, color: C.dim }}
                  >
                    <UserRound className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[11.5px] font-medium leading-tight"
                      style={{ color: C.ink }}
                    >
                      J. Calder
                    </p>
                    <p
                      className="mt-0.5 truncate text-[10px] leading-tight"
                      style={{ color: C.tealInk }}
                    >
                      Joined 12 Aug
                    </p>
                  </div>
                  <span className="shrink-0">
                    <Pill tone="ink">Deciding</Pill>
                  </span>
                </WashRow>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="shrink-0 rounded-md border border-dashed px-3 py-2.5 text-center"
                style={{ borderColor: C.line2 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-[10.5px]" style={{ color: C.muted }}>
                  Not shared with anyone yet.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {s.form ? (
              <motion.div
                key="form"
                className="shrink-0"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={OPEN}
              >
                <InviteFormMini decider={s.decider} hot={s.hot} />
              </motion.div>
            ) : (
              <motion.div
                key="btn"
                className="shrink-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <GhostBtn cursorKey="share" hot={s.hot === "share"}>
                  <Plus className="size-3 shrink-0" strokeWidth={2.4} />
                  Share the project
                </GhostBtn>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* the record. The practice's name on the recommendation, landing
          last, because it is the thing this whole journey was for. */}
      <motion.p
        className="shrink-0 truncate text-[10px] tracking-[0.02em]"
        style={{ color: C.dim }}
        initial={false}
        animate={{ opacity: s.record ? 1 : 0, y: s.record ? 0 : 4 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        Prepared by{" "}
        <span style={{ color: C.ink, fontWeight: 500 }}>Studio North Architecture</span> with
        BuilderHQ
      </motion.p>
    </>
  );
}

/**
 * The invitation form, minus its footnote. The two seat options are the
 * product's own, and the practice presses Deciding on purpose: a client
 * who can only watch is a different offer from a client who can award.
 */
function InviteFormMini({ decider, hot }: { decider: boolean; hot: string | null }) {
  return (
    <div
      className="rounded-md border px-2.5 py-2"
      style={{ borderColor: C.line, background: C.paper2 }}
    >
      <div className="grid grid-cols-2 gap-2">
        <Field value="j.calder@bigpond.com" />
        <Field value="J. Calder" />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <SeatOption
          title="Following"
          sub="Sees the project, the tenders and the full evaluation."
          active={!decider}
        />
        <SeatOption
          title="Deciding"
          sub="Everything above, plus shortlisting and the award."
          active={decider}
          cursorKey="role-decider"
          hot={hot === "role-decider"}
        />
      </div>

      <div className="mt-2.5">
        <PrimaryBtn cursorKey="send" hot={hot === "send"}>
          <Mail className="size-3.5 shrink-0" strokeWidth={2.2} />
          Send the invitation
        </PrimaryBtn>
      </div>
    </div>
  );
}

/** A filled text field, at scene scale. */
function Field({ value }: { value: string }) {
  return (
    <span
      className="block h-8 rounded-md border px-2.5 text-[10.5px] leading-8 truncate"
      style={{ borderColor: C.line, background: C.paper, color: C.ink }}
    >
      {value}
    </span>
  );
}

/** One of the two seats a client can be handed. */
function SeatOption({
  title,
  sub,
  active,
  cursorKey,
  hot,
}: {
  title: string;
  sub: string;
  active: boolean;
  cursorKey?: string;
  hot?: boolean;
}) {
  return (
    <div
      data-cursor={cursorKey}
      className="rounded-md border px-2.5 py-2 transition-colors duration-200"
      style={{
        borderColor: active || hot ? C.tealLine : C.line,
        background: active ? C.tealWash : C.paper,
      }}
    >
      <p className="text-[10.5px] font-ui font-semibold" style={{ color: C.ink }}>
        {title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[9px] leading-[1.4]" style={{ color: C.dim }}>
        {sub}
      </p>
    </div>
  );
}
