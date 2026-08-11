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
 * HOW THIS RUNS. One script for the whole journey, run by the timeline
 * engine the deck cards use, and every navigation is motivated. The
 * pointer reaches for a real control, the control lights under it, the
 * pointer hesitates for a beat, presses, and only then does the app go
 * somewhere. The controls are the product's own: the drop zone, the
 * pack rail's Continue, the Open card, Publish, the project page's link
 * into the tender stream, the Side by side nav pill, Back to project,
 * Share the project, Send the invitation.
 *
 * THE CHAPTER CARD IS THE CUT. This is the explainer-video grammar that
 * replaced the zoom-through cut. Every act boundary plays the same way:
 * the pointer hovers the real control, presses, and a centred chapter
 * card dissolves over the frame while the next screen mounts beneath
 * it — act number, one short line for what is about to happen, one
 * sub-line carrying the claim plainly. The card is read for a beat and
 * clears onto a wide shot, so every act opens on a reveal that has
 * already been introduced. The film itself opens on act one's card, the
 * way an explainer does; the resting state stays cardless and wide.
 *
 * THE CAMERA IS RATIONED. Because the card now does the telling, the
 * footage no longer zooms around pointing at things. Two pushes survive
 * on this journey, and only two:
 *
 *   · the signature: the Open / Private choice at 1.3. The clamp pins
 *     the frame's corner, so the shot holds both option cards, the
 *     helper text under Open, and the spot count and rewritten
 *     invitation subtitle arriving below as the press lands.
 *   · the citation at 1.2, because "cited to the page" is the claim
 *     worth watching close, and at 1.2 the whole line — item, plain
 *     sentence and the citation that lights — sits inside the window.
 *
 * Everything else, including every navigation, plays wide. The camera
 * never moves during a scroll, and it is back at rest before every
 * chapter card.
 *
 * THE LONG READ IS NAMED, NOT ZOOMED. Act six travels the comparison
 * machinery the way the evaluation page actually lays it out — the
 * alignment lede, the schedule alignment with its count resolving, the
 * differ table's state chips, the decision grid's teal cells, and the
 * conditions behind the number — wide and still, with a bottom-centre
 * section tag naming each stop as it arrives. The bands and their
 * strings are the ones the comparison surfaces render
 * (instrument-compare.tsx, evaluation-surface.tsx), sized to declared
 * heights so a waypoint can never drift onto the middle of a row.
 *
 * One scene, one pointer. Nothing here is mounted or unmounted from
 * outside, because that is what used to make the cursor blink out
 * between two screens. Only the screen body sits inside AnimatePresence;
 * the frame, its breadcrumb and the pointer never remount, and the
 * breadcrumb changing at the instant of a press is the cheapest signal
 * there is that the session navigated.
 *
 * Two surfaces are genuinely scrolled rather than quietly re-rendered
 * shorter: the scope register and the comparison column. Both translate
 * inside a fixed viewport, to waypoints hard coded from declared
 * heights, because a scene that measures itself drifts the first time a
 * font loads late.
 *
 * The whole script runs about fifty two seconds including the cards,
 * which is the previous cut sped up by roughly a tenth: the dwells and
 * post-reveal waits were multiplied by 0.9, the hover hesitations and
 * the card reads were not, because a hand that stops hesitating stops
 * reading as a hand.
 *
 * Compressions worth naming, because a later reader will otherwise
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
 *   · Act six folds the schedule's Rock excavation line — the client's
 *     provisional sum against one builder's firm figure — into the
 *     conditions band. On the page it sits in the schedule alignment,
 *     but it IS a condition behind Corten's number, and the five stops
 *     read better when the money story lands last.
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
  ChevronDown,
  FileDown,
  FileUp,
  Files,
  GitCompareArrows,
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

import { SceneCamera, SceneCursor, useSceneScript } from "../scene-motion";
import {
  Avatar,
  C,
  Card,
  ChapterCard,
  Division,
  ELEV,
  Frame,
  GhostBtn,
  Kicker,
  ListFade,
  Pill,
  ScopeLine,
  SectionTag,
  TONE,
  TealBtn,
  VerifyChip,
  WashRow,
  useCompact,
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

  /** The chapter card over the frame, or nothing. The screen change
   *  happens under it, so the card is the cut. */
  card: { n: string; title: string; sub?: string } | null;

  /** The lower-third naming the section of a long read, or nothing. */
  tag: string | null;

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

  /* the comparison column */
  cmpY: number;
  counted: boolean;
  lit: boolean;

  /* your client */
  form: boolean;
  decider: boolean;
  seated: boolean;
  record: boolean;
};

/**
 * Screen one, finished and waiting, with no pointer, no card and the
 * camera wide. This is what renders under prefers-reduced-motion, and
 * it is what the loop returns to before it starts again, so it has to
 * be the state the first press acts on rather than the state after it.
 */
const RESTING: S = {
  screen: "upload",
  hot: null,
  card: null,
  tag: null,
  phase: "drop",
  open: null,
  cite: false,
  scopeY: 0,
  mode: "private",
  joined: false,
  sec: 2,
  cmpY: 0,
  counted: false,
  lit: false,
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

/**
 * The chapter cards — the explainer track of the film. Each one plays
 * at the act boundary, over the screen change, and the sub-line is
 * where the claim lives, plainly: what the product just did, whose
 * name is on it, what did not have to be done by hand. Titles hold to
 * six words, subs to fourteen, Australian English, no em dashes.
 */
const CARDS: Record<ScreenKey, { n: string; title: string; sub: string }> = {
  upload: {
    n: "01",
    title: "Upload for your client",
    sub: "Your drawings, read page by page.",
  },
  scope: {
    n: "02",
    title: "We read the plans",
    sub: "Every item of work identified and cited. Your client approves it.",
  },
  who: {
    n: "03",
    title: "Choose who prices it",
    sub: "Your builders, the verified network, or both.",
  },
  join: {
    n: "04",
    title: "Vetted builders join",
    sub: "Builders matched to the project enter the round. Spots are capped.",
  },
  tenders: {
    n: "05",
    title: "All tenders, one format",
    sub: "Every builder prices the same scope and answers the same questions.",
  },
  compare: {
    n: "06",
    title: "Tenders side by side",
    sub: "Read every one against the same scope, before you advise.",
  },
  client: {
    n: "07",
    title: "A simple handover",
    sub: "Your name on it. Your client decides.",
  },
};

/* ── the curves ──────────────────────────────────────────────────── */

/** Slow enough to read as a list being scrolled rather than a list
 *  jumping. Both scrolled surfaces share it. */
const SCROLL = { duration: 0.85, ease: [0.22, 1, 0.36, 1] } as const;
/** The app's entrance curve, for anything that opens in place. */
const OPEN = { duration: 0.38, ease: [0.16, 1, 0.3, 1] } as const;
/** The screen change itself. Never a cut, and always under the card. */
const SWAP = { duration: 0.4, ease: [0.16, 1, 0.3, 1] } as const;

/* ── the round, as every surface downstream reads it ─────────────── */

const TENDERS = [
  { mono: "CB", name: "Corten Build Co.", price: "$712,800" },
  { mono: "MB", name: "Meridian Building Co", price: "$753,500" },
  { mono: "BH", name: "Brightwater Homes", price: "$800,800" },
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

  const { state, cursor, clicks, cam } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 2400,
    // The first beat raises act one's card, so any settle before it
    // shows the bare screen for a moment first.
    startDelay: 0,
    script: [
      /* ── the film opens the way an explainer does: act one's card
             over the resting screen, then the reveal, wide. ────────── */
      { set: { card: CARDS.upload } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── 01 · the plans go in. Watched wide the whole way: the card
             has already said what this act is, and the drop zone, the
             scan and "Got it" all fit one resting shot. ────────────── */
      { move: "drop", ms: 630 },
      { set: { hot: "drop" } },
      { wait: 400 },
      { click: true },
      { set: { phase: "scanning", hot: null } },
      { wait: 1000 },
      { set: { phase: "read" } },
      { wait: 550 },
      /* the cut → 02, played by the card */
      { move: "upload-continue", ms: 480 },
      { set: { hot: "upload-continue" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.scope, screen: "scope", hot: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── 02 · the list that comes out, and where each line came
             from. The one push this act keeps is the citation, at 1.2:
             the claim worth watching close is that a line traces back
             to a drawn sheet, and at that scale the item, its plain
             sentence and the citation that lights all sit inside the
             window. The register then scrolls, and it scrolls wide:
             the camera never moves during a scroll. ─────────────────── */
      { move: "div-earthworks", ms: 540 },
      { set: { hot: "div-earthworks" } },
      { wait: 360 },
      { click: true },
      { set: { open: "earthworks", hot: null } },
      { wait: 350 },
      { cam: { focus: "cite-earthworks", scale: 1.2, ms: 850 } },
      { move: "cite-earthworks", ms: 380 },
      { set: { cite: true } },
      { wait: 600 },
      { set: { cite: false } },
      { cam: "reset" },
      { set: { scopeY: -140 } },
      { wait: 600 },
      /* the cut → 03 */
      { move: "scope-continue", ms: 480 },
      { set: { hot: "scope-continue" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.who, screen: "who", hot: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── 03 · the signature push, and the only one on the journey
             with a press inside it. The one screen only a practice
             sees, so it is the one watched closest: 1.3 on the Open
             card. The clamp pins the frame's corner, which is what
             keeps the whole consequence in shot — both option cards,
             the helper text under Open, the spot count mounting and
             the invitation subtitle rewriting below it. Then pull
             wide and hold still. ────────────────────────────────────── */
      { wait: 100 },
      { move: "mode-open", ms: 590 },
      { cam: { focus: "mode-open", scale: 1.3, ms: 900 } },
      { set: { hot: "mode-open" } },
      { wait: 400 },
      { click: true },
      { set: { mode: "open", hot: null } },
      { wait: 850 },
      { cam: "reset" },
      { wait: 600 },
      /* the cut → 04 */
      { move: "publish", ms: 500 },
      { set: { hot: "publish" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.join, screen: "join", hot: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── 04 · the round fills, and it fills WIDE. Builders
             arriving is the one event the practice does not click,
             and it is a reveal, so the camera stands still and lets
             all three rows be taken in whole. ────────────────────── */
      { wait: 300 },
      { set: { joined: true } },
      { wait: 850 },
      /* the cut → 05 */
      { move: "stream", ms: 560 },
      { set: { hot: "stream" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.tenders, screen: "tenders", sec: 2, hot: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── 05 · three tenders, in the same shape, landing wide so
             all three are seen answering the same three fields. ──── */
      { wait: 300 },
      { move: "card-meridian", ms: 560 },
      { set: { hot: "card-meridian" } },
      { wait: 500 },
      // The card unlights as the pointer starts to leave it, not when it
      // arrives somewhere else. A hover that outlives the pointer is the
      // tell that nothing here is really being hovered.
      { set: { hot: null } },
      /* the cut → 06 */
      { move: "nav-3", ms: 480 },
      { set: { hot: "nav-3" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.compare, screen: "compare", sec: 3, hot: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── 06 · the argument, band by band. The longest read on the
             journey, and it is read wide, still, and NAMED: the
             column travels the comparison machinery in five stops and
             the section tag says what each one is. The differing-line
             count resolves at the second stop, the grid's teal cells
             sweep at the fourth, and the client's provisional sum
             meets a builder's firm figure at the last. ─────────────── */
      { set: { tag: "Same questions, every builder" } },
      { wait: 1350 },
      { set: { cmpY: CMP_AT.sched, tag: "228 lines, 9 differ" } },
      { wait: 350 },
      { set: { counted: true } },
      { wait: 1550 },
      { set: { cmpY: CMP_AT.differ, tag: "Line against line" } },
      { wait: 1900 },
      { set: { cmpY: CMP_AT.grid, tag: "The decision grid", lit: true } },
      { wait: 2200 },
      { set: { cmpY: CMP_AT.terms, tag: "The conditions behind the number" } },
      { wait: 2100 },
      /* the cut → 07, and the tag leaves with its act */
      { move: "back", ms: 560 },
      { set: { hot: "back" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.client, screen: "client", hot: null, tag: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── 07 · the handover, watched wide from start to finish. The
             form opens, the practice presses Deciding — the decision
             on this screen, and the form is compact enough that both
             seats and their subs read on the resting shot — then the
             seat lands and the practice's name goes on the record. ── */
      { move: "share", ms: 500 },
      { set: { hot: "share" } },
      { wait: 360 },
      { click: true },
      { set: { form: true, hot: null } },
      { wait: 300 },
      { move: "role-decider", ms: 450 },
      { set: { hot: "role-decider" } },
      { wait: 360 },
      { click: true },
      { set: { decider: true, hot: null } },
      { wait: 300 },
      { move: "send", ms: 480 },
      { set: { hot: "send" } },
      { wait: 360 },
      { click: true },
      { set: { form: false, seated: true, hot: null } },
      { wait: 700 },
      { set: { record: true } },
      { wait: 950 },
      { cursor: "hide" },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full overflow-hidden">
      {/* The camera carries the whole app and the pointer with it, so a
          push-in grows the cursor exactly as a recorded zoom would. The
          frame, its breadcrumb and the pointer sit outside the
          crossfade and never remount. Only the body is replaced. */}
      <SceneCamera cam={cam}>
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
      </SceneCamera>

      {/* The lower-third. Outside the camera, bottom centre, naming
          the section of the long read as it arrives. */}
      <SectionTag text={state.tag} />

      {/* The chapter card, last so it sits over everything. Outside
          the camera: the cut plays wide by construction. */}
      <ChapterCard card={state.card} />
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

/** The evaluation page's back link, and the pointer's way off it.
 *  `className` exists for the tenders screen, which hides it on mobile:
 *  the "back" press happens on the compare screen, where the row must
 *  stay visible, but on the tenders screen it is 25px of chrome the
 *  stacked cards need. */
function BackRow({ hot, className = "" }: { hot: boolean; className?: string }) {
  return (
    <span
      data-cursor="back"
      className={
        "shrink-0 self-start inline-flex items-center gap-1.5 rounded px-1 -mx-1 text-[10px] transition-colors duration-200 " +
        className
      }
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
              // max-sm:px-1.5 buys the ~16px that keep "Side by side"
              // (nav-3, a move-then-click target) clear of the right fade
              // on the 303px measure.
              className="shrink-0 rounded-full px-2 max-sm:px-1.5 py-[4px] text-[9.5px] transition-colors duration-200"
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

/** The round strip at the head of the tenders screen. On mobile the
 *  three columns become label-and-figure rows: at a third of 303px the
 *  prices clip mid-glyph, and a cut price is the one thing this strip
 *  must never show. The flags column stands down there too — it is the
 *  strip's tertiary line, and its 33px belong to the tender cards. */
function RoundStrip() {
  return (
    <Card className="shrink-0 grid grid-cols-1 sm:grid-cols-3 overflow-hidden">
      {STRIP.map(([label, value, sub], i) => (
        <div
          key={label}
          className={
            "min-w-0 px-3 py-2 max-sm:flex max-sm:items-baseline max-sm:gap-2 " +
            (i === 2 ? "max-sm:hidden " : "") +
            (i ? "border-t sm:border-t-0 sm:border-l" : "")
          }
          style={{ borderColor: C.line }}
        >
          <p className="truncate text-[8px] uppercase tracking-[0.12em]" style={{ color: C.dim }}>
            {label}
          </p>
          <p
            className="mt-1 max-sm:mt-0 truncate font-ui font-semibold text-[17px] leading-none tabular-nums"
            style={{ color: C.ink }}
          >
            {value}
          </p>
          <p
            className="max-sm:hidden mt-1 truncate text-[8.5px] leading-none"
            style={{ color: C.muted }}
          >
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
        {/* Mobile: the drop zone's own label carries the instruction, and
            the ~40px this paragraph costs is what keeps the scan sheet and
            its "Pulled 14 details" line inside the 340px budget. */}
        <p
          className="max-sm:hidden mt-1.5 line-clamp-2 max-w-[54ch] text-[10.5px] leading-[1.6]"
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
                {read ? "Pulled 14 details from your plans" : "Reading the title block…"}
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
  const compact = useCompact();
  /**
   * The script's -140 was budgeted on the desktop measure. On the 277px
   * mobile measure the two open plain sentences wrap 1 → 2 lines
   * (2 × ~14.5px = +29), so the open earthworks division is ~29px taller
   * and the desktop offset under-shoots by that much:
   * -140 - 29 ≈ -170.
   */
  const y = compact && s.scopeY !== 0 ? -170 : s.scopeY;
  return (
    <>
      <div className="shrink-0 flex items-baseline justify-between gap-3">
        <p className="font-ui text-[14px] font-semibold" style={{ color: C.ink }}>
          Scope of works
        </p>
        <p className="shrink-0 text-[10px] tabular-nums" style={{ color: C.dim }}>
          242 items · 29 trades
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
          animate={{ y }}
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
        <div className="flex flex-col gap-2.5 max-sm:gap-2">
          <StepCard icon={Globe2} title="Who can tender" sub="Pick how builders come to this round.">
            {/* The pair stays side by side on mobile — the binary choice IS
                the act — but at 133px a column cannot also hold a two-line
                sub, so the subs stand down inside the cards and Open's
                helper line (the one the push is framed on) re-renders at
                full width beneath the pair instead. Same copy, one column
                of it. */}
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
            <p
              className="sm:hidden mt-2 line-clamp-2 text-[9.5px] leading-[1.5]"
              style={{ color: C.dim }}
            >
              {MODES.find((m) => m.id === "open")?.sub}
            </p>
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
                        className="h-7 max-sm:h-6 w-10 rounded-md border grid place-items-center text-[11.5px] font-ui font-semibold tabular-nums"
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
                invitation itself needs. On mobile the row itself stands
                down too: the count line above and this card's subtitle are
                the two things that rewrite on the press, and they are what
                the 340px budget keeps in shot. The row returns on the next
                screen. */}
            <InviteRow
              name="Brightwater Homes"
              detail="BuilderHQ builder"
              status="Invited"
              className="max-sm:hidden"
            />
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
      <div className="px-3 py-2 max-sm:py-1.5">{children}</div>
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
      className="rounded-md border px-2.5 py-2 max-sm:py-1.5 transition-colors duration-300"
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
      {/* Hidden on mobile: at half of 277px the sub truncates to nothing.
          Open's sentence re-renders at full width under the pair instead. */}
      <p
        className="max-sm:hidden mt-1.5 line-clamp-2 text-[9.5px] leading-[1.5]"
        style={{ color: C.dim }}
      >
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
  className = "",
}: {
  name: string;
  detail: string;
  status: "Invited" | "Joined";
  className?: string;
}) {
  const joined = status === "Joined";
  return (
    <div
      className={"flex items-center gap-2.5 rounded-md border px-2.5 py-2 " + className}
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
            {/* Mobile: secondary prose. The joined row and its pending
                pill are the beat; the sentence already played on the
                previous screen's subtitle. */}
            <p
              className="max-sm:hidden px-3 pt-1.5 pb-2 line-clamp-2 text-[10px] leading-[1.5]"
              style={{ color: C.muted }}
            >
              These builders join free. Remaining spots open to the network.
            </p>
            <div className="px-3 pb-3 max-sm:pt-2">
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
            {/* Mobile: secondary prose. The kicker's count and the link the
                pointer is about to press carry the card; the sentence is
                the 37px that kept the link under the fade. */}
            <p
              className="max-sm:hidden mt-1.5 line-clamp-2 text-[10px] leading-[1.55]"
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
      <BackRow hot={s.hot === "back"} className="max-sm:hidden" />
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
            dead canvas under them. On mobile the three columns cannot fit
            303px — a third of it clips "$712,800" mid-glyph — so each card
            lies down as a row: identity left, the same three answers
            (price, weeks, firm bar) right, which is still the act's
            claim read three times in the same shape. */}
        <div className="grid h-full grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {SUBMITTED.map((t, i) => {
            const hot = s.hot === `card-${t.key}`;
            return (
              <motion.div
                key={t.name}
                data-cursor={`card-${t.key}`}
                className="flex h-full flex-col max-sm:flex-row max-sm:items-center rounded-lg border overflow-hidden transition-colors duration-200"
                style={{
                  borderColor: hot ? C.tealLine : C.line,
                  background: hot ? C.tealWash : C.paper,
                  boxShadow: ELEV,
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.44, delay: 0.16 * i, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-1.5 px-2.5 pt-2.5 max-sm:flex-1 max-sm:min-w-0 max-sm:py-2">
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
                <div className="px-2.5 pt-3 max-sm:shrink-0 max-sm:py-1.5">
                  <p className="max-sm:hidden text-[7.5px] uppercase tracking-[0.14em]" style={{ color: C.dim }}>
                    Tender price inc GST
                  </p>
                  <p
                    className="mt-1 max-sm:mt-0 truncate font-ui font-semibold text-[16px] leading-none tabular-nums"
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
                {/* On mobile the firm bar above carries this sentence and
                    the status is the same word three times: both stand
                    down so three whole rows fit the 340px budget. */}
                <p
                  className="max-sm:hidden mt-auto line-clamp-2 border-t px-2.5 py-2 text-[9px] leading-[1.45]"
                  style={{ borderColor: C.line, color: C.dim }}
                >
                  {t.firm}
                </p>
                <div className="max-sm:hidden border-t px-2.5 py-2" style={{ borderColor: C.line }}>
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

/** One grid for every band, exactly as the comparison surface does it
 *  (instrument-compare.tsx:75). That single rule is the whole claim:
 *  schedule marks, state chips, grid values and conditions land on the
 *  same three columns because they were answered to the same list.
 *
 *  On mobile the label column cannot share 303px with three builder
 *  columns, so every band row restacks the same way: the label takes a
 *  full-width line (`max-sm:col-span-3` on the label cell) and the three
 *  builder cells sit under it on thirds. All three builders stay in
 *  shot — the act's claim is the comparison itself — which is why the
 *  rows grow taller rather than losing a column. */
const COLS_CLS =
  "grid grid-cols-3 sm:grid-cols-[minmax(0,1.05fr)_repeat(3,minmax(0,1fr))]";

/* — the schedule alignment — */

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

/** Six of the nine lines the builders part ways on, in the pack's own
 *  build order. Rock excavation, the client's own provisional sum, is
 *  held back for the conditions band at the foot of the travel. */
const ALIGN: Array<{ label: string; cells: [SchedState, SchedState, SchedState] }> = [
  { label: "Bulk excavation, cut and fill", cells: ["allowance", "documented", "documented"] },
  {
    label: "Engineered concrete and block retaining walls",
    cells: ["allowance", "documented", "documented"],
  },
  { label: "Sub-soil drainage behind walls", cells: ["na", "documented", "documented"] },
  { label: "Timber and composite decks", cells: ["excluded", "documented", "documented"] },
  { label: "Fencing", cells: ["excluded", "documented", "documented"] },
  { label: "Driveway", cells: ["excluded", "documented", "documented"] },
];

/* — where the tenders differ — */

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

/* — the decision grid — */

type GridRow = { label: string; v: [string, string, string]; best?: number[] };

/** GRID at evaluation-surface.tsx:1229, the money and the programme.
 *  `best` is the app's own rule: the strongest position on the line,
 *  suppressed where every column would win, because a row where
 *  everyone wins is a row where nobody does. */
const DECISION: Array<{ title: string; rows: GridRow[] }> = [
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
];

/* — the conditions behind the number — */

/** The disclosures that decide what the headline figure is worth,
 *  opening on the schedule's own money story: the client's provisional
 *  sum for rock, one builder's firm figure against it, one holding the
 *  allowance, one not carrying the line at all. The prompts are the
 *  instrument's (v3), as the example round answered them. */
const CONDITIONS: Array<{ q: string; v: [string, string, string] }> = [
  {
    q: "Does the contract contain a rise and fall or cost escalation clause?",
    v: ["Yes", "No", "No"],
  },
  { q: "How long does this price hold?", v: ["45 days", "30 days", "60 days"] },
  { q: "Builder's margin applied to variations", v: ["18%", "15%", "20%"] },
];

/* — the travel — */

/**
 * Enforced band heights, and the waypoints as arithmetic off them.
 * Hard numbers rather than a measurement pass: five scroll stops that
 * always land on the same pixel are worth more than five that are
 * theoretically perfect and occasionally a row out. Content is written
 * to sit inside these with slack, so a wider or narrower panel spends
 * the difference as whitespace, never as a shifted waypoint.
 */
const CMP_GAP = 12;
const CMP_H = { lede: 88, sched: 300, differ: 324, grid: 360, terms: 258 } as const;

/**
 * The same declared heights, on the 303px mobile measure, where every
 * band row restacks (label line over three builder cells) and so grows.
 * Walked top to bottom like the desktop set, band by band:
 *
 *   lede   88: unchanged — the intro paragraph's 43px box already holds
 *              its three wrapped lines (3 × 14.25 = 42.75).
 *   sched 408: header 10+22+4+43+6+34+8 = 127 (legend 22 → 34, it wraps
 *              to two rows), names 22, 6 rows at 38 (was 22) = 228,
 *              footer 24, card border 2 → 403, +5 slack.
 *   differ 360: header 104, head row 22, SIX rows at 38 = 228 (the list
 *              is sliced 9 → 6 on mobile; the three below the fold were
 *              never reachable before the next stop), border 2 → 356,
 *              +4 slack.
 *   grid  424: header 54, head 36, "The money" 20 + 4×44 = 196 (rows
 *              34 → 44 for the wrapped value line), "The programme"
 *              20 + 2×44 = 108, footer 24, border 2 → 420, +4 slack.
 *   terms 322: header 87, names 22, rock row 50 (was 39), 3 rows at 52
 *              (was 36) = 156, border 2 → 317, +5 slack.
 */
const CMP_H_M = { lede: 88, sched: 408, differ: 360, grid: 424, terms: 322 } as const;

/** The four stops after the lede. Every one lands a band's head at the
 *  top of the viewport, INCLUDING the last: bottoming the column out
 *  instead put the film's closing argument, the client's provisional
 *  sum against the builder's firm figure, underneath the viewport's own
 *  fade and the section tag riding above it. A band pinned to its head
 *  clears both, and clears them at the shorter frame too. */
const CMP_AT = {
  sched: -(CMP_H.lede + CMP_GAP),
  differ: -(CMP_H.lede + CMP_H.sched + 2 * CMP_GAP),
  grid: -(CMP_H.lede + CMP_H.sched + CMP_H.differ + 3 * CMP_GAP),
  terms: -(CMP_H.lede + CMP_H.sched + CMP_H.differ + CMP_H.grid + 4 * CMP_GAP),
} as const;

/** The same stops off the mobile heights. The script keeps setting the
 *  desktop values into state; CompareScreen maps each one onto its
 *  mobile twin at render, so the beats and their timings never fork. */
const CMP_AT_M = {
  sched: -(CMP_H_M.lede + CMP_GAP),
  differ: -(CMP_H_M.lede + CMP_H_M.sched + 2 * CMP_GAP),
  grid: -(CMP_H_M.lede + CMP_H_M.sched + CMP_H_M.differ + 3 * CMP_GAP),
  terms: -(CMP_H_M.lede + CMP_H_M.sched + CMP_H_M.differ + CMP_H_M.grid + 4 * CMP_GAP),
} as const;

/**
 * The whole argument for a practice, travelled rather than sampled:
 * the comparison machinery in five named stops, every one of them
 * wide. This is the longest read on the journey because it is the only
 * screen with something to actually study, and it is the screen the
 * section tags exist for — a lower-third names each band as it
 * arrives, so the film explains the surface without ever leaning on
 * the camera.
 */
function CompareScreen({ s }: { s: S }) {
  const compact = useCompact();
  const H = compact ? CMP_H_M : CMP_H;
  // The script writes the desktop waypoints into state. On the mobile
  // measure every band is taller, so the same stop lives at a deeper
  // offset: find which desktop stop the state holds and swap in its
  // mobile twin. At rest (cmpY 0) there is no stop and nothing to map.
  const stop = (Object.keys(CMP_AT) as Array<keyof typeof CMP_AT>).find(
    (k) => CMP_AT[k] === s.cmpY,
  );
  const y = compact && stop ? CMP_AT_M[stop] : s.cmpY;

  return (
    <>
      <BackRow hot={s.hot === "back"} />
      <EvalNav sec={s.sec} hot={s.hot} />

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 flex flex-col"
          style={{ gap: CMP_GAP }}
          initial={false}
          animate={{ y }}
          transition={SCROLL}
        >
          <div style={{ height: H.lede }}>
            <LedeBand />
          </div>
          <div style={{ height: H.sched }}>
            <ScheduleBand counted={s.counted} />
          </div>
          <div style={{ height: H.differ }}>
            <DifferBand />
          </div>
          <div style={{ height: H.grid }}>
            <DecisionBand lit={s.lit} />
          </div>
          <div style={{ height: H.terms }}>
            <ConditionsBand />
          </div>
        </motion.div>
        <ListFade />
      </div>
    </>
  );
}

/** The alignment lede: why any of the bands below can exist at all. */
function LedeBand() {
  return (
    <div>
      <Kicker icon={Scale}>The like-for-like read</Kicker>
      <p
        className="mt-1.5 font-ui text-[14px] font-semibold tracking-[-0.015em]"
        style={{ color: C.ink }}
      >
        Same questions, every builder
      </p>
      <p
        className="mt-1 h-[43px] overflow-hidden text-[9.5px] leading-[1.5] max-w-[64ch]"
        style={{ color: C.muted }}
      >
        Each tender below answered the BuilderHQ submission standard, so price, scope and
        conditions compare on the same terms. Differences surface first.
      </p>
    </div>
  );
}

/** The column heads. Repeated per band rather than pinned, exactly as
 *  the app repeats them, so any band read on its own still names its
 *  columns. */
function NameRow() {
  return (
    <div className={"h-[22px] border-t items-center " + COLS_CLS} style={{ borderColor: C.line }}>
      <span className="max-sm:hidden" />
      {TENDERS.map((t, j) => (
        <span
          key={t.name}
          className={
            "min-w-0 border-l px-2 max-sm:px-1 text-[9px] font-semibold truncate " +
            (j === 0 ? "max-sm:border-l-0" : "")
          }
          style={{ borderColor: C.line, color: C.muted }}
        >
          {t.name}
        </span>
      ))}
    </div>
  );
}

/** The schedule alignment, with the differing-line count resolving as
 *  the band arrives: a figure already on screen reads as a claim, one
 *  that resolves reads as the product having just done the work. */
function ScheduleBand({ counted }: { counted: boolean }) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="px-3 pt-2.5 pb-2">
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
        {/* max-sm:h-[34px]: on the 279px measure the four legend items
            wrap to a second row (15+4+15), and a legend missing its
            fourth state reads as a mistake. */}
        <div className="mt-1.5 h-[22px] max-sm:h-[34px] overflow-hidden flex flex-wrap items-center gap-x-3 gap-y-1">
          {(Object.keys(SCHED) as SchedState[]).map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 text-[8.5px]"
              style={{ color: C.dim }}
            >
              <span className="size-[5px] rounded-full" style={{ background: SCHED[k].dot }} />
              {SCHED[k].label}
            </span>
          ))}
        </div>
      </div>

      <NameRow />

      {ALIGN.map((row) => (
        <div
          key={row.label}
          className={"h-[22px] max-sm:h-[38px] border-t " + COLS_CLS}
          style={{
            borderColor: C.line,
            background: C.tealWash,
          }}
        >
          <div className="flex items-center gap-1.5 px-3 min-w-0 max-sm:col-span-3">
            <span className="size-1.5 rounded-full shrink-0" style={{ background: C.teal }} />
            <span className="truncate text-[9.5px] font-medium" style={{ color: C.ink }}>
              {row.label}
            </span>
          </div>
          {row.cells.map((cell, j) => (
            <div
              key={j}
              className={
                "min-w-0 border-l px-2 max-sm:px-1 flex items-center " +
                (j === 0 ? "max-sm:border-l-0" : "")
              }
              style={{ borderColor: C.line }}
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span
                  className="size-[5px] rounded-full shrink-0"
                  style={{ background: SCHED[cell].dot }}
                />
                <span
                  className="truncate text-[9.5px] font-semibold"
                  style={{ color: SCHED[cell].text }}
                >
                  {SCHED[cell].label}
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

/** Where the tenders differ: nine lines, three state chips each, read
 *  down a column. Every row on this table differs, so every row
 *  carries the tint. */
function DifferBand() {
  const compact = useCompact();
  // Mobile shows six of the nine: at 38px a row, the seventh onward sat
  // below what the viewport could ever reach before the next stop, and
  // CMP_H_M.differ is budgeted on six (104+22+6×38+2 = 356).
  const rows = DIFFER.slice(0, compact ? 6 : DIFFER.length);
  return (
    <Card className="h-full overflow-hidden">
      <div className="px-3 py-2.5">
        <Kicker icon={GitCompareArrows}>The same project, read differently</Kicker>
        <p
          className="mt-1 font-ui text-[13px] font-semibold tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
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
        className={"h-[22px] border-t items-center " + COLS_CLS}
        style={{ borderColor: C.line }}
      >
        <span
          className="max-sm:hidden px-3 text-[8.5px] tracking-[0.16em] uppercase truncate"
          style={{ color: C.dim }}
        >
          Scope item
        </span>
        {TENDERS.map((t, j) => (
          <span
            key={t.name}
            className={
              "min-w-0 border-l px-2 max-sm:px-1 text-[8.5px] tracking-[0.16em] uppercase truncate " +
              (j === 0 ? "max-sm:border-l-0" : "")
            }
            style={{ borderColor: C.line, color: C.dim }}
          >
            {t.name}
          </span>
        ))}
      </div>

      {rows.map((row) => (
        <div
          key={row.trade}
          className={"h-[22px] max-sm:h-[38px] border-t " + COLS_CLS}
          style={{
            borderColor: C.line,
            background: C.tealWash,
          }}
        >
          <div className="flex items-center gap-1.5 px-3 min-w-0 max-sm:col-span-3">
            <span className="size-1.5 rounded-full shrink-0" style={{ background: C.teal }} />
            <span className="truncate text-[9.5px]" style={{ color: C.ink }}>
              {row.trade}
            </span>
          </div>
          {row.s.map((state, j) => {
            const t = TONE[SCOPE[state].tone];
            return (
              <div
                key={j}
                className={
                  "min-w-0 border-l px-2 max-sm:px-1 flex items-center " +
                  (j === 0 ? "max-sm:border-l-0" : "")
                }
                style={{ borderColor: C.line }}
              >
                <span
                  className="inline-flex max-w-full items-center rounded-full px-1.5 h-[15px] text-[8.5px] font-medium truncate"
                  style={{ color: t.text, background: t.bg }}
                >
                  {SCOPE[state].label}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </Card>
  );
}

/** The decision grid's money and programme groups. The teal cells
 *  sweep in a row at a time once `lit`, which is how a reader sees
 *  that no single tender wins everything. */
function DecisionBand({ lit }: { lit: boolean }) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="px-3 pt-2.5 pb-2">
        <Kicker icon={Scale}>Side by side</Kicker>
        <p
          className="mt-1 font-ui text-[13px] font-semibold tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
          The decision grid
        </p>
      </div>

      <div className={"h-[36px] border-t " + COLS_CLS} style={{ borderColor: C.line }}>
        <span className="max-sm:hidden" />
        {TENDERS.map((t, j) => (
          <div
            key={t.name}
            className={
              "min-w-0 border-l px-2 max-sm:px-1 flex items-center gap-1.5 " +
              (j === 0 ? "max-sm:border-l-0" : "")
            }
            style={{ borderColor: C.line }}
          >
            {/* The monogram stands down on mobile: its 24px are the
                difference between "Meridian Building Co" and
                "Meridian Bu…" on a 100px column. */}
            <span
              className="max-sm:hidden size-[18px] shrink-0 rounded-full inline-flex items-center justify-center text-[7px] font-bold"
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
              <span className="block truncate text-[8.5px] tabular-nums" style={{ color: C.muted }}>
                {t.price} inc GST
              </span>
            </span>
          </div>
        ))}
      </div>

      {DECISION.map((group, gi) => (
        <div key={group.title}>
          <p
            className="h-[20px] flex items-end px-3 pb-[3px] text-[8.5px] tracking-[0.2em] uppercase"
            style={{ color: C.dim }}
          >
            {group.title}
          </p>
          {group.rows.map((row, ri) => {
            // A row where every column wins is a row where nobody does.
            const meaningful = !!row.best && row.best.length < 3;
            return (
              <div
                key={row.label}
                className={"h-[34px] max-sm:h-[44px] border-t " + COLS_CLS}
                style={{ borderColor: C.line }}
              >
                <div className="flex items-center px-3 min-w-0 max-sm:col-span-3">
                  <span className="line-clamp-2 text-[9.5px] leading-[1.35]" style={{ color: C.dim }}>
                    {row.label}
                  </span>
                </div>
                {row.v.map((value, j) => {
                  const win = lit && meaningful && row.best!.includes(j);
                  return (
                    <div
                      key={j}
                      className={
                        "min-w-0 border-l px-2 max-sm:px-1 flex items-center transition-colors duration-500 " +
                        (j === 0 ? "max-sm:border-l-0" : "")
                      }
                      style={{
                        borderColor: C.line,
                        background: win ? TONE.good.bg : undefined,
                        transitionDelay: `${(gi * 4 + ri) * 90}ms`,
                      }}
                    >
                      <span
                        className="block line-clamp-2 text-[9.5px] leading-[1.35]"
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
        className="h-[24px] flex items-center border-t px-3 text-[8.5px] truncate"
        style={{ borderColor: C.line, color: C.dim }}
      >
        Open any builder&apos;s full evaluation to see the working behind their dimension scores.
      </p>
    </Card>
  );
}

/** The conditions behind the number, ending on the money story the
 *  role exists for: the client's provisional sum for rock against one
 *  builder's firm figure. */
function ConditionsBand() {
  return (
    <Card className="h-full overflow-hidden">
      <div className="px-3 pt-2.5 pb-2">
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

      <NameRow />

      {/* The schedule's own money story, kept for the foot of the
          travel: three treatments of one line, which no set of three
          builder PDFs can ever be made to show. */}
      <div
        className={"h-[39px] max-sm:h-[50px] border-t " + COLS_CLS}
        style={{
          borderColor: C.line,
          background: C.tealWash,
        }}
      >
        <div className="flex items-start gap-1.5 px-3 py-[4px] min-w-0 max-sm:col-span-3">
          <span className="mt-[4px] size-1.5 rounded-full shrink-0" style={{ background: C.teal }} />
          <span className="min-w-0">
            <span
              className="block truncate text-[9.5px] font-medium leading-[1.35]"
              style={{ color: C.ink }}
            >
              Rock excavation
            </span>
            <span className="block text-[8.5px] leading-[1.3] line-clamp-2" style={{ color: C.dim }}>
              Earthworks and excavation · your provisional sum $18,000
            </span>
          </span>
        </div>
        {(
          [
            { s: "excluded" as const },
            { s: "documented" as const, text: "$26,000 firm" },
            { s: "allowance" as const, text: "$18,000" },
          ] as Array<{ s: SchedState; text?: string }>
        ).map((cell, j) => (
          <div
            key={j}
            className={
              "min-w-0 border-l px-2 max-sm:px-1 flex items-center " +
              (j === 0 ? "max-sm:border-l-0" : "")
            }
            style={{ borderColor: C.line }}
          >
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span
                className="size-[5px] rounded-full shrink-0"
                style={{ background: SCHED[cell.s].dot }}
              />
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

      {CONDITIONS.map((row) => (
        <div
          key={row.q}
          className={"h-[36px] max-sm:h-[52px] border-t " + COLS_CLS}
          style={{
            borderColor: C.line,
            background: C.tealWash,
          }}
        >
          <div className="flex items-start gap-1.5 px-3 py-[4px] min-w-0 max-sm:col-span-3">
            <span className="mt-[4px] size-1.5 rounded-full shrink-0" style={{ background: C.teal }} />
            <span
              className="text-[9px] leading-[1.45] line-clamp-2"
              style={{ color: C.ink, fontWeight: 500 }}
            >
              {row.q}
            </span>
          </div>
          {row.v.map((value, j) => (
            <div
              key={j}
              className={
                "min-w-0 border-l px-2 max-sm:px-1 py-[4px] " +
                (j === 0 ? "max-sm:border-l-0" : "")
              }
              style={{ borderColor: C.line }}
            >
              <span
                className="block text-[9px] leading-[1.45] font-medium line-clamp-2"
                style={{ color: C.ink }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      ))}
    </Card>
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
      {/* The decision. The old cropped stage stood this down on phones;
          the portrait stage restores it, because the verdict is what the
          whole film was building to. Two mobile concessions keep the
          form's Send button — a click target — inside the 340px budget:
          the Shortlisted/Award footer stands down (the pill above says
          Shortlisted already), and while the invitation form is open the
          verdict yields the frame entirely, returning for the closing
          shot the record line lands on. */}
      <Card
        className={
          (s.form ? "max-sm:hidden " : "") + "shrink-0 overflow-hidden"
        }
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
          className="max-sm:hidden flex items-center justify-end gap-2 border-t px-3 py-2"
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
                // Mobile, form open: "Not shared with anyone yet" above
                // the form that is sharing it is 45px of stating the
                // obvious, and those are the Send button's 45px.
                className={
                  (s.form ? "max-sm:hidden " : "") +
                  "shrink-0 rounded-md border border-dashed px-3 py-2.5 text-center"
                }
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
      {/* Hidden on mobile: at half of 255px the sub clips mid-clause, and
          the sharing panel's own header sentence already says what each
          seat can do. */}
      <p className="max-sm:hidden mt-0.5 line-clamp-2 text-[9px] leading-[1.4]" style={{ color: C.dim }}>
        {sub}
      </p>
    </div>
  );
}
