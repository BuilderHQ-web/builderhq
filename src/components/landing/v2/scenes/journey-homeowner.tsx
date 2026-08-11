"use client";

/**
 * Homeowner · the whole platform, walked through by hand.
 *
 * The default lens, so for most visitors this is the entire product:
 * plans go in, one list comes out, verified builders take the spots,
 * three tenders arrive in the same shape, the round is read side by
 * side, and the owner awards. Nothing here is a mock-up of an
 * intention. Every screen is a miniature of a surface the app already
 * renders, at the figures of the example round it ships with.
 *
 * THE HAND. One scene running one script on the deck's timeline
 * engine. A pointer moves to a real control, the control lights the way
 * a real hover would, the pointer hesitates for a beat, presses, and
 * only then does the app go somewhere. Five navigations, each earned by
 * a control the product genuinely renders:
 *
 *   Start a project   → Continue            (after the plans are read)
 *   Scope of works    → Publish             (the publish bar's button)
 *   Your round        → View tender stream  (the project page's link)
 *   Tenders           → Compare tenders     (the round panel's CTA)
 *   The tender eval.  → Award               (on the tender's own card)
 *
 * THE CAMERA, which is the direction this file now carries. The script
 * drives a camera as well as a hand, in the grammar of a screen
 * recording: detail is watched close, and every reveal is watched
 * wide. Before the pointer works a control the camera pushes in on it;
 * before a result lands that should be taken in whole, the camera has
 * already pulled back, so no reveal ever happens zoomed. Every
 * navigation is a zoom-through: lean in on the control, press, let the
 * next screen land under the zoom, then pull wide to show where the
 * press went. The pull-back IS the transition, and done every time it
 * gives the film an in-and-out breath. The camera never moves during a
 * scroll and never scrolls while pushed in, and the long reads get a
 * still, wide frame, because stillness is what makes the pushes land.
 *
 * The signature shot is the 242 count-up. The camera arrives on the
 * scope screen still zoomed from the Continue press, re-aims onto the
 * figure at 1.45 while it counts, holds a beat after the number lands,
 * then pulls wide as the register's divisions cascade in behind it:
 * the pull-back that shows how much one number unpacked into. The
 * citation lighting teal and the Award press are the other close-ups;
 * everything else, the scan, the round filling, the three tenders, the
 * decision grid, the awarded banner, plays wide.
 *
 * Each screen is captioned as an act, film-subtitle style, in the
 * frame's bottom left: a two-digit number and at most five words for
 * what the act IS. The captions sit OUTSIDE the camera, because
 * subtitles do not zoom with footage, and read in order they are the
 * story's table of contents.
 *
 * The Frame, its breadcrumb and the pointer sit outside the screen
 * crossfade and never remount, so the pointer never blinks out between
 * two screens, and both ride INSIDE the camera, so a push carries the
 * pointer with it exactly as a recorded zoom would. The breadcrumb
 * changes with every screen, which is the cheapest and most convincing
 * signal that the session actually navigated.
 *
 * Four compressions worth naming, because a later reader will otherwise
 * think they are mistakes:
 *
 *   · Screen one puts Continue under the finished scan. In the app the
 *     scan hands you straight to the wizard and Continue belongs to the
 *     step before it. They are one moment to a visitor, and a screen
 *     with no forward control cannot be left by hand.
 *   · Screen two puts the wizard's publish bar under the scope
 *     register. Both are real, one level apart, and publishing is
 *     precisely what turns a scope into a round.
 *   · Screen five prints each dimension's weight beside its label. The
 *     tender card does not; the dossier and the builder's own scorecard
 *     do. The weights are published and fixed, and a reader who cannot
 *     see them cannot check the arithmetic, which is the point of the
 *     screen.
 *   · Screen six's breadcrumb reads "Awarded", which is the app's own
 *     label for the project's status rather than a page name. It is the
 *     one word that says the decision landed.
 *
 * Every waypoint in the two scrolled surfaces is hard coded from
 * declared heights at module scope. Nothing is measured at runtime: a
 * scene that measures itself drifts the first time a font loads late,
 * and the pointer's own coordinates come from the real elements anyway,
 * so a waypoint that is twenty pixels out still puts the pointer on the
 * right control.
 */

import * as React from "react";
import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Award,
  Check,
  ChevronDown,
  FileText,
  FileUp,
  Scale,
  ScrollText,
  ShieldCheck,
  Star,
} from "lucide-react";

import { SceneCamera, SceneCursor, useSceneScript } from "../scene-motion";
import {
  ActCaption,
  Avatar,
  C,
  Card,
  Division,
  Frame,
  GhostBtn,
  Kicker,
  ListFade,
  Pill,
  ScopeLine,
  TealBtn,
  TONE,
  VerifyChip,
  WashRow,
} from "./kit";

/** The app's own entrance curve. */
const EASE = [0.16, 1, 0.3, 1] as const;

/** Slow enough to read as scrolling rather than jumping. */
const SCROLL = { duration: 0.85, ease: [0.22, 1, 0.36, 1] } as const;

/** A panel opening or a card growing. */
const OPEN = { duration: 0.4, ease: EASE } as const;

/** The screen crossfade. The Frame, the breadcrumb and the pointer are
 *  all outside this, so only the body ever changes. */
const CUT = { duration: 0.4, ease: EASE } as const;

/* ── the session's state ─────────────────────────────────────────── */

type Screen = "upload" | "scope" | "round" | "tenders" | "compare" | "award";

type S = {
  screen: Screen;
  /** Which control the pointer is over. One at a time, by design: a
   *  hand is only ever in one place. */
  hot: string | null;
  /** Screen one: the three phases of reading a plan set. */
  phase: "drop" | "scan" | "done";
  /** Screen two: whether the register has cascaded in yet (it holds
   *  back until the camera pulls wide off the 242 count), the opened
   *  division, its lit citation, the register's own offset. */
  reg: boolean;
  open: boolean;
  cite: boolean;
  scopeY: number;
  /** Screen three: how many of the three spots have gone. */
  spots: 2 | 3;
  /** Screen five: the evaluation column's offset, the working under one
   *  tender's weighted overall, and the grid's teal cells. */
  cmpY: number;
  dims: boolean;
  lit: boolean;
};

/**
 * Screen one, complete and finished, with no pointer. This is what the
 * engine restores between loops and what renders under
 * prefers-reduced-motion, so it has to be a screen worth looking at
 * rather than a scene caught mid-gesture.
 */
const RESTING: S = {
  screen: "upload",
  hot: null,
  phase: "drop",
  reg: false,
  open: false,
  cite: false,
  scopeY: 0,
  spots: 2,
  cmpY: 0,
  dims: false,
  lit: false,
};

/** The topbar's breadcrumb, per screen. Every one of these is a page
 *  title or a status label the app renders for itself. */
const CRUMB: Record<Screen, string> = {
  upload: "Start a project",
  scope: "Scope of works",
  round: "Your round",
  tenders: "Tenders",
  compare: "The tender evaluation",
  award: "Awarded",
};

/** The act captions: a film subtitle per screen, and most of the
 *  explanation. Each one says what the act IS, in five words or
 *  fewer, so the six of them read as the platform's table of
 *  contents. */
const ACT_N: Record<Screen, string> = {
  upload: "01",
  scope: "02",
  round: "03",
  tenders: "04",
  compare: "05",
  award: "06",
};

const ACT_TEXT: Record<Screen, string> = {
  upload: "Your plans, read",
  scope: "One list, every trade",
  round: "Builders take their spots",
  tenders: "Three prices, one shape",
  compare: "Read side by side",
  award: "Awarded, directly",
};

/* ── screen one · what the plans gave up ─────────────────────────── */

/** Three of the fourteen details the read pulls out, under the field
 *  labels the project page prints them against. */
const PULLED: Array<[string, string]> = [
  ["4", "Bedrooms"],
  ["2", "Bathrooms"],
  ["2", "Floors"],
];

/* ── screen two · the scope register ─────────────────────────────── */

/** Seventeen of the register's thirty one divisions, in the pack's own
 *  build order. Enough that the list reads as a real register and that
 *  the two scroll beats have somewhere to go. */
const DIVISIONS: Array<{ key: string; label: string; count: string }> = [
  { key: "prelim", label: "Preliminaries and site establishment", count: "14 items" },
  { key: "approvals", label: "Approvals, certification and compliance", count: "11 items" },
  { key: "demolition", label: "Demolition and site clearing", count: "6 items" },
  { key: "earthworks", label: "Earthworks and excavation", count: "8 items" },
  { key: "footings", label: "Footings and ground floor structure", count: "7 items" },
  { key: "retaining", label: "Retaining walls and ground structures", count: "4 items" },
  { key: "concrete", label: "Concrete, formwork and reinforcement", count: "9 items" },
  { key: "steel", label: "Structural steel and framing", count: "12 items" },
  { key: "roofing", label: "Roofing, gutters and downpipes", count: "10 items" },
  { key: "cladding", label: "External wall cladding and finishes", count: "9 items" },
  { key: "windows", label: "Windows and external doors", count: "8 items" },
  { key: "insulation", label: "Insulation and sarking", count: "6 items" },
  { key: "plumbing", label: "Plumbing and drainage", count: "15 items" },
  { key: "electrical", label: "Electrical, data and lighting", count: "13 items" },
  { key: "linings", label: "Wall and ceiling linings", count: "12 items" },
  { key: "joinery", label: "Joinery and cabinetry", count: "11 items" },
  { key: "painting", label: "Painting and decorating", count: "7 items" },
];

/**
 * The two lines behind the division the pointer opens. This is the
 * product's whole claim in one panel: an item of work written in plain
 * English, tied to the page it came from, and beside it a line the
 * documents only partly answer, marked as such and saying what is
 * absent. The gap wording is the product's own, from scope/advice.ts.
 */
const APPROVAL_LINES: Array<{ label: string; plain: string; cite: string; gap?: string }> = [
  {
    label: "Building permit and mandatory inspections",
    plain:
      "The permit itself, and the inspections a surveyor must sign off as the build passes each stage.",
    cite: "Specification A1.2, page 7, Rev C",
  },
  {
    label: "Soil classification and site report",
    plain:
      "The report that says what the ground is made of, which decides how the footings are built.",
    cite: "Not found in your documents",
    gap: "No site classification on file, so every builder must assume the ground conditions.",
  },
];

/**
 * The register's waypoints. The list is a plain column of collapsed
 * rows on a 43px pitch with one division open, so these are counted
 * rather than measured.
 *
 *   settle  lifts the division just opened to the top of the viewport,
 *           which is what a reader does with a thumb before reading it,
 *           and which is the only reason the citation is still on
 *           screen at the shortest phone height.
 *   middle  the register carrying on past what fits.
 *   bottom  far enough to have read a long list, never so far that the
 *           column runs out and leaves a band of empty canvas.
 */
const SCOPE_Y = { settle: -50, middle: -260, bottom: -520 } as const;

/* ── screen three · the round ────────────────────────────────────── */

/** The seeded example round, in the order the spots were taken. */
const BUILDERS: Array<{ key: string; initials: string; name: string; line: string }> = [
  { key: "corten", initials: "CB", name: "Corten Build Co.", line: "6 years in operation · Melbourne, VIC" },
  { key: "meridian", initials: "MB", name: "Meridian Building Co", line: "14 years in operation · Brunswick, VIC" },
  { key: "brightwater", initials: "BH", name: "Brightwater Homes", line: "22 years in operation · Ivanhoe, VIC" },
];

/* ── screen four · the tenders as they land ──────────────────────── */

/**
 * The three tenders in price order, which is the order every table on
 * the evaluation reads left to right. Build periods are the round's
 * own: 36, 34 and 30 weeks.
 */
const TENDERS: Array<{
  key: string;
  mono: string;
  name: string;
  years: string;
  price: string;
  weeks: string;
}> = [
  { key: "corten", mono: "CB", name: "Corten Build Co.", years: "6 years in operation", price: "$712,800", weeks: "36 weeks" },
  { key: "meridian", mono: "MB", name: "Meridian Building Co", years: "14 years in operation", price: "$753,500", weeks: "34 weeks" },
  { key: "brightwater", mono: "BH", name: "Brightwater Homes", years: "22 years in operation", price: "$800,800", weeks: "30 weeks" },
];

/* ── screen five · the evaluation, and its geometry ──────────────── */

/** The gap between bands on the evaluation column. */
const GAP = 14;

/** The height of a tender card's decision footer, where Award lives. */
const FOOT = 36;

/**
 * Declared band heights. Each band holds its height whatever its
 * contents do, so a string that wraps one line further on a phone loses
 * a line inside its own card rather than pushing the column out of
 * register.
 */
const H = {
  head: 106,
  overview: 228,
  tender: 240,
  tenderOpen: 336,
  grid: 306,
  record: 64,
} as const;

/** Where each band's top sits, measured with the first tender card
 *  already open, which is the state the script leaves it in before it
 *  scrolls past. */
const TOP = (() => {
  const overview = H.head + GAP;
  const meridian = overview + H.overview + GAP;
  const corten = meridian + H.tenderOpen + GAP;
  const grid = corten + H.tender + GAP;
  const record = grid + H.grid + GAP;
  return { overview, meridian, corten, grid, record };
})();

/**
 * The column's waypoints, as offsets rather than positions. Each one
 * leaves a deliberate margin above the thing being read, and `award`
 * is chosen so the decision row sits about a hundred pixels down: high
 * enough to be on screen inside the shortest phone frame, low enough
 * that the working which justifies the decision is still above it.
 */
const AT = {
  overview: 8 - TOP.overview,
  meridian: -TOP.meridian,
  grid: 26 - TOP.grid,
  award: 102 - (TOP.meridian + H.tenderOpen - FOOT),
} as const;

/**
 * The single best paragraph on the surface, and the reason the scroll
 * pauses longest here. It is computed, not written: the engine finds
 * the cheapest tender, the allowances that make it cheap, and the
 * overrun that would erase the saving.
 */
const PRICE_STORY =
  "Corten Build Co. is $37,000 cheaper on paper, but $105,000 of its price sits in allowances of its own choosing that Meridian Building Co has priced in full. If those allowances overrun their stated figures by more than 35%, the saving is gone. The decision is not which number is lower; it is how much you trust the allowances.";

/** The round strip. Four stat cells, exactly as the app computes them. */
const STRIP: Array<[string, string, string]> = [
  ["Tenders received", "3", "project live 14 days"],
  ["Lowest tender inc GST", "$712,800", "highest $800,800 · 12% spread"],
  ["Build period", "30–36 weeks", ""],
  ["Significant flags", "2", "raised across the round"],
];

/**
 * The six dimensions in rubric order with their published weights and
 * the points Meridian earned. `leads` is the round leader on that line,
 * which is what turns the bar and the number teal on the real card.
 * Weighted, these are the 86 the card prints, and a reader who checks
 * the arithmetic will find it holds.
 */
const DIMS: Array<{ label: string; weight: number; score: number; leads?: boolean }> = [
  { label: "Price firmness", weight: 25, score: 100, leads: true },
  { label: "Scope coverage", weight: 25, score: 100, leads: true },
  { label: "Preparation", weight: 15, score: 54 },
  { label: "Credentials & capacity", weight: 15, score: 80 },
  { label: "Delivery & aftercare", weight: 12, score: 94, leads: true },
  { label: "Programme confidence", weight: 8, score: 60 },
];

/** The three tender columns, in price order. */
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
    rows: [{ label: "Trades in the price", v: ["18 of 22", "23 of 23", "23 of 23"], win: [1, 2] }],
  },
];

/* ── screen six · what the decision leaves behind ────────────────── */

/** The two tenders that were not taken. They stay Submitted unless the
 *  owner declines them, which is a separate choice inside the dialog. */
const OTHERS = [
  { mono: "CB", name: "Corten Build Co.", price: "$712,800" },
  { mono: "BH", name: "Brightwater Homes", price: "$800,800" },
];

/* ── the journey ─────────────────────────────────────────────────── */

export function HomeownerJourney({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks, cam } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 2200,
    script: [
      /* ── act 01 · your plans, read ───────────────────────────────
         The pointer's first two presses, and the camera's first push
         and pull. By the time the session leaves this screen the
         visitor has seen the whole grammar once: lean in on a
         control, press, pull wide for what the press produced. */
      { wait: 400 },
      // The first move places rather than travels: the engine fades the
      // pointer in already standing on its target, so `ms` is moot here.
      { move: "drop" },
      { cam: { focus: "drop", scale: 1.3, ms: 800 } },
      { set: { hot: "drop" } },
      { wait: 420 },
      { click: true },
      { set: { phase: "scan", hot: null } },
      { wait: 300 },
      // Wide BEFORE the read plays out: the scan is a reveal, and
      // reveals are watched wide.
      { cam: "reset" },
      { wait: 950 },
      { set: { phase: "done" } },
      { wait: 900 },
      // The first zoom-through. Lean in on Continue, press, and let
      // the scope screen land under the zoom.
      { cam: { focus: "continue", scale: 1.35, ms: 800 } },
      { move: "continue", ms: 620 },
      { set: { hot: "continue" } },
      { wait: 400 },
      { click: true },
      { set: { screen: "scope", hot: null } },
      // Longer than the other landings: the crossfade must finish
      // before the camera can measure the figure it re-aims onto.
      { wait: 600 },

      /* ── act 02 · one list, every trade ──────────────────────────
         THE SIGNATURE SHOT. The camera arrives still zoomed from the
         Continue press and re-aims onto the figure at 1.45 while it
         counts up to 242. It holds a beat after the number lands,
         then pulls wide as the register's divisions cascade in behind
         it: the pull-back that shows how much one number unpacked
         into. */
      { cam: { focus: "scope-count", scale: 1.45, ms: 900 } },
      { wait: 1600 },
      { set: { reg: true } },
      { cam: "reset" },
      { wait: 650 },
      { move: "div-approvals", ms: 800 },
      { set: { hot: "approvals" } },
      { wait: 420 },
      { click: true },
      { set: { open: true, hot: null } },
      { wait: 450 },
      // Lift what was just opened to the top before reading it. Every
      // scroll in this film happens on a wide, motionless camera.
      { set: { scopeY: SCOPE_Y.settle } },
      { wait: 900 },
      // The second close-up: the citation, watched at 1.3 while it
      // lights teal. Push first, then let the pointer work it.
      { cam: { focus: "cite-approvals", scale: 1.3, ms: 800 } },
      { move: "cite-approvals", ms: 620 },
      { set: { cite: true } },
      { wait: 1300 },
      { set: { cite: false } },
      { cam: "reset" },
      { wait: 250 },
      // Two flicks rather than one long glide, because that is how a
      // register this long actually gets read.
      { set: { scopeY: SCOPE_Y.middle } },
      { wait: 900 },
      { set: { scopeY: SCOPE_Y.bottom } },
      { wait: 900 },
      // Zoom-through on Publish.
      { cam: { focus: "publish", scale: 1.35, ms: 800 } },
      { move: "publish", ms: 700 },
      { set: { hot: "publish" } },
      { wait: 400 },
      { click: true },
      { set: { screen: "round", hot: null } },
      { wait: 350 },

      /* ── act 03 · the builders take the spots ────────────────────
         A wide act. The third spot filling is a reveal, so the camera
         pulls back on arrival and does not move again until the
         exit. */
      { cam: "reset" },
      { wait: 700 },
      { move: "row-corten", ms: 760 },
      { set: { hot: "corten" } },
      { wait: 650 },
      // The last spot goes while the pointer is resting on the first
      // builder. Nobody clicked this: it is the round being live.
      { set: { spots: 3, hot: null } },
      { wait: 1050 },
      // Zoom-through on the tender stream link.
      { cam: { focus: "stream", scale: 1.35, ms: 800 } },
      { move: "stream", ms: 700 },
      { set: { hot: "stream" } },
      { wait: 400 },
      { click: true },
      { set: { screen: "tenders", hot: null } },
      { wait: 350 },

      /* ── act 04 · three tenders, one shape ───────────────────────
         The three cards land ON the pull-back, the widest reveal in
         the film, and the camera stays wide while the eye goes to the
         cheapest. That it is the cheapest is the whole reason the
         next screen exists. */
      { cam: "reset" },
      { wait: 900 },
      { move: "card-corten", ms: 760 },
      { set: { hot: "corten" } },
      { wait: 700 },
      { set: { hot: null } },
      // Zoom-through on Compare tenders.
      { cam: { focus: "compare", scale: 1.35, ms: 800 } },
      { move: "compare", ms: 700 },
      { set: { hot: "compare" } },
      { wait: 400 },
      { click: true },
      { set: { screen: "compare", hot: null } },
      { wait: 350 },

      /* ── act 05 · the evaluation, read side by side ──────────────
         The longest act, and the stillest. The overview paragraph is
         a long read, so it gets a wide, motionless camera; the one
         push is on the weighted score as its working opens, and the
         one after that is the Award press. */
      { cam: "reset" },
      { wait: 350 },
      { set: { cmpY: AT.overview } },
      { wait: 2250 },
      { set: { cmpY: AT.meridian } },
      { wait: 900 },
      // Push on the score row, then open its working and read the
      // published weights close.
      { cam: { focus: "score", scale: 1.3, ms: 800 } },
      { move: "score", ms: 620 },
      { set: { hot: "score" } },
      { wait: 400 },
      { click: true },
      { set: { dims: true, hot: null } },
      { wait: 1200 },
      // Wide before the grid: the teal cells arriving a row at a time
      // is a reveal, and it says no single tender wins everything.
      { cam: "reset" },
      { set: { cmpY: AT.grid } },
      { wait: 650 },
      { set: { lit: true } },
      { wait: 1100 },
      // Back up to the tender that was chosen, which is what a person
      // does once they have read the lot.
      { set: { cmpY: AT.award } },
      { wait: 900 },
      // The decision, watched close. Zoom-through on Award.
      { cam: { focus: "award", scale: 1.35, ms: 800 } },
      { move: "award", ms: 620 },
      { set: { hot: "award" } },
      { wait: 450 },
      { click: true },
      { set: { screen: "award", hot: null } },
      { wait: 350 },

      /* ── act 06 · the decision ───────────────────────────────────
         One pull-back onto the awarded banner and then stillness, all
         the way into the loop pause. The film ends wide, the way it
         started. */
      { cam: "reset" },
      { wait: 1900 },
      { cursor: "hide" },
      { wait: 500 },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full overflow-hidden">
      {/* The camera wraps the window AND the pointer, so a push-in
          carries the pointer with it the way a recorded zoom does. The
          Frame and its breadcrumb live outside the crossfade, so the
          window never remounts and the breadcrumb is the one piece of
          chrome that tells you the session moved. The act caption sits
          outside the camera: subtitles do not zoom with footage. */}
      <SceneCamera cam={cam}>
        <Frame crumb={CRUMB[state.screen]}>
          <AnimatePresence mode="wait">
            <motion.div
              key={state.screen}
              className="flex-1 min-h-0 flex flex-col gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={CUT}
            >
              {state.screen === "upload" ? (
                <UploadScreen s={state} />
              ) : state.screen === "scope" ? (
                <ScopeScreen s={state} />
              ) : state.screen === "round" ? (
                <RoundScreen s={state} />
              ) : state.screen === "tenders" ? (
                <TendersScreen s={state} />
              ) : state.screen === "compare" ? (
                <CompareScreen s={state} />
              ) : (
                <AwardScreen />
              )}
            </motion.div>
          </AnimatePresence>
        </Frame>

        <SceneCursor cursor={cursor} clicks={clicks} />
      </SceneCamera>

      <ActCaption n={ACT_N[state.screen]} text={ACT_TEXT[state.screen]} />
    </div>
  );
}

/* ── one · upload ────────────────────────────────────────────────── */

function UploadScreen({ s }: { s: S }) {
  return (
    <>
      <div className="shrink-0">
        <Kicker>AI auto-fill from plans</Kicker>
        <p
          className="mt-2 font-ui font-semibold text-[15px] sm:text-[16.5px] tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
          Upload your plans
        </p>
        <p
          className="mt-1.5 hidden sm:block text-[11px] leading-[1.55] max-w-[50ch]"
          style={{ color: C.muted }}
        >
          Drop in your architectural plans as a PDF. We read them and fill out your project for
          you.
        </p>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {s.phase === "drop" ? (
            <motion.div
              key="drop"
              className="w-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <DropZone hot={s.hot === "drop"} />
              <div className="mt-4 hidden sm:flex items-start gap-2">
                <ShieldCheck className="size-3.5 shrink-0 mt-[1px]" style={{ color: C.tealInk }} />
                <p className="text-[10px] leading-[1.6] max-w-[58ch]" style={{ color: C.dim }}>
                  Your plans are read securely to fill the form. Nothing is published until you say
                  so.
                </p>
              </div>
            </motion.div>
          ) : s.phase === "scan" ? (
            <motion.div
              key="scan"
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <ScanSheet />
              <p className="mt-4 text-[13px] font-semibold" style={{ color: C.ink }}>
                Reading your plans
              </p>
              <p className="mt-1 text-[11px]" style={{ color: C.muted }}>
                Reading the title block…
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              className="flex flex-col items-center text-center w-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <span
                className="hidden sm:inline-flex size-10 items-center justify-center rounded-full"
                style={{ background: C.tealMuted, color: C.tealInk }}
              >
                <Check className="size-5" strokeWidth={2.6} />
              </span>
              <p
                className="mt-0 sm:mt-3.5 font-ui font-semibold text-[15px] sm:text-[16.5px]"
                style={{ color: C.ink }}
              >
                Got it.
              </p>
              <p className="mt-1 text-[11px]" style={{ color: C.muted }}>
                Pulled 14 details from your plans
              </p>

              <div className="mt-4 hidden sm:block w-full max-w-[330px]">
                <WashRow className="px-3.5 py-2.5 text-left">
                  <p className="text-[11.5px] font-semibold" style={{ color: C.ink }}>
                    Single dwelling · Pascoe Vale, VIC
                  </p>
                  <div className="mt-2 flex items-stretch">
                    {PULLED.map(([v, l], i) => (
                      <div
                        key={l}
                        className="flex-1 px-2.5"
                        style={i === 0 ? { paddingLeft: 0 } : { borderLeft: `1px solid ${C.line}` }}
                      >
                        <p
                          className="font-ui font-semibold text-[13px] leading-none tabular-nums"
                          style={{ color: C.ink }}
                        >
                          {v}
                        </p>
                        <p
                          className="mt-1 text-[8.5px] uppercase tracking-[0.12em]"
                          style={{ color: C.dim }}
                        >
                          {l}
                        </p>
                      </div>
                    ))}
                  </div>
                </WashRow>
              </div>

              <div className="mt-3.5 sm:mt-5">
                <Press k="continue" hot={s.hot === "continue"}>
                  <TealBtn>Continue</TealBtn>
                </Press>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/** The drop zone: dashed hairline, blueprint grid, the teal ring. It
 *  lights under the pointer, because the real one does. */
function DropZone({ hot }: { hot: boolean }) {
  return (
    <div
      data-cursor="drop"
      className="relative overflow-hidden rounded-lg border border-dashed px-6 py-4 sm:py-7 lg:py-9 flex flex-col items-center transition-colors duration-200"
      style={{
        borderColor: hot ? C.tealLine : C.line3,
        background: hot ? C.tealWash : C.wash,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(24,34,44,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(24,34,44,0.10) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 45%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 50% 45%, black 30%, transparent 80%)",
        }}
      />
      <span
        className="relative inline-flex size-10 items-center justify-center rounded-full transition-transform duration-200"
        style={{
          background: C.tealMuted,
          color: C.tealInk,
          boxShadow: "0 0 0 6px rgba(0,212,200,0.06)",
          transform: hot ? "translateY(-2px)" : "none",
        }}
      >
        <FileUp className="size-4.5" strokeWidth={2} />
      </span>
      <p className="relative mt-3 text-[12px] sm:text-[12.5px] font-semibold" style={{ color: C.ink }}>
        Drop your plans here, or click to browse
      </p>
      <p className="relative mt-1 text-[10px]" style={{ color: C.dim }}>
        PDF · up to 28 MB
      </p>
    </div>
  );
}

/** The ten bars on the scanned sheet, at the app's own widths. */
const BARS = [54, 88, 64, 80, 46, 72, 90, 58, 76, 50];

/** The sheet being read, with the beam that lights each line as it
 *  passes. The product's own scan, at hero scale. */
function ScanSheet() {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute -inset-5 rounded-[24px] blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(0,212,200,0.28), transparent 70%)" }}
      />
      <div
        className="relative w-[104px] h-[132px] sm:w-[152px] sm:h-[190px] rounded-[12px] border overflow-hidden px-4 py-4"
        style={{
          borderColor: C.line3,
          background: "linear-gradient(180deg, #ffffff, rgba(250,248,243,0.96))",
          boxShadow: "0 24px 54px -26px rgba(15,23,32,0.30)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="size-[11px] rounded-[3px]" style={{ background: C.teal }} />
          <span
            className="h-[5px] w-[46px] rounded-full"
            style={{ background: "rgba(0,212,200,0.55)" }}
          />
        </div>

        <div className="mt-3 flex flex-col gap-[7px]">
          {BARS.map((w, i) => (
            <motion.span
              key={i}
              className="block h-[5px] rounded-full"
              style={{ width: `${w}%`, background: C.teal }}
              animate={{ opacity: [0.16, 0.16, 1, 0.16] }}
              transition={{
                duration: 2.2,
                times: [0, i / (BARS.length + 2), (i + 1.2) / (BARS.length + 2), 1],
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>

        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-[26px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,212,200,0), rgba(0,212,200,0.22), rgba(0,212,200,0))",
          }}
          animate={{ top: ["6%", "88%", "6%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {[
          "left-2 top-2 border-l border-t",
          "right-2 top-2 border-r border-t",
          "left-2 bottom-2 border-l border-b",
          "right-2 bottom-2 border-r border-b",
        ].map((cls) => (
          <span
            key={cls}
            aria-hidden
            className={`absolute size-2.5 ${cls}`}
            style={{ borderColor: C.tealLine }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── two · the scope register ────────────────────────────────────── */

function ScopeScreen({ s }: { s: S }) {
  return (
    <>
      <div className="shrink-0 flex items-center justify-between gap-3">
        <p className="font-ui font-semibold text-[14px] sm:text-[15px]" style={{ color: C.ink }}>
          Scope of works
        </p>
        <Pill>
          <Check className="size-2.5" strokeWidth={3} /> Approved
        </Pill>
      </div>
      {/* The figure the whole act zooms on. The camera arrives here
          still pushed from the Continue press; the count runs up while
          it is watched at 1.45, and the register cascades in on the
          pull-back. Visible at every size, because the signature shot
          has to exist on a phone too. */}
      <div data-cursor="scope-count" className="shrink-0 flex items-baseline gap-1.5">
        <CountUp
          to={242}
          delay={0.75}
          className="font-ui font-semibold text-[19px] leading-none tabular-nums"
          style={{ color: C.ink }}
        />
        <p className="text-[10.5px] leading-snug" style={{ color: C.muted }}>
          items of work, built from your documents.
          <span className="hidden sm:inline"> Every builder prices this same list.</span>
        </p>
      </div>

      {/* The register itself, clipped, so the scroll beats read as a
          list being scrolled rather than a card changing height. The
          divisions hold back until the script pulls the camera wide
          off the count, then rise in a cascade: the reveal happens on
          the wide shot, never under the zoom. */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <motion.div
          className="flex flex-col gap-2.5"
          initial={false}
          animate={{ y: s.scopeY }}
          transition={SCROLL}
        >
          {DIVISIONS.map((d, i) => (
            <motion.div
              key={d.key}
              initial={false}
              animate={{ opacity: s.reg ? 1 : 0, y: s.reg ? 0 : 14 }}
              transition={{ duration: 0.5, ease: EASE, delay: s.reg ? i * 0.045 : 0 }}
            >
              <Division
                label={d.label}
                count={d.count}
                cursorKey={`div-${d.key}`}
                hot={s.hot === d.key}
                open={d.key === "approvals" && s.open}
              >
                {/* Only the one division the pointer opens carries lines.
                    The rest are headers, which is all the register shows
                    until you ask it for more. */}
                {d.key === "approvals"
                  ? APPROVAL_LINES.map((l, li) => (
                      <ScopeLine
                        key={l.label}
                        label={l.label}
                        plain={l.plain}
                        cite={l.cite}
                        citeKey={li === 0 ? "cite-approvals" : undefined}
                        citeHot={li === 0 && s.cite}
                        gap={l.gap}
                      />
                    ))
                  : null}
              </Division>
            </motion.div>
          ))}
        </motion.div>
        <ListFade />
      </div>

      {/* The publish bar. Fixed in the app and fixed here, which is why
          the register can be scrolled anywhere and still be left by
          hand. */}
      <div
        className="shrink-0 flex items-center gap-3 border-t pt-2.5"
        style={{ borderColor: C.line }}
      >
        <span
          className="hidden sm:inline-flex items-center gap-1.5 text-[10px]"
          style={{ color: C.dim }}
        >
          <ShieldCheck className="size-3.5" style={{ color: C.tealInk }} />
          Checked line by line by a person
        </span>
        <span className="ml-auto">
          <Press k="publish" hot={s.hot === "publish"}>
            <TealBtn>Publish</TealBtn>
          </Press>
        </span>
      </div>
    </>
  );
}

/* ── three · the builders take the spots ─────────────────────────── */

function RoundScreen({ s }: { s: S }) {
  const spots = s.spots;
  return (
    <>
      <div className="shrink-0">
        <div className="flex items-baseline justify-between gap-3">
          <Kicker>
            <PulseDot />
            <span className="inline-flex h-[11px] items-center">
              <Swap k={spots}>{spots} builders on your round</Swap>
            </span>
          </Kicker>
          <span
            className="inline-flex h-[13px] items-center text-[10px] tabular-nums shrink-0"
            style={{ color: C.dim }}
          >
            <Swap k={spots}>{spots} of 3 spots taken</Swap>
          </span>
        </div>
        <p
          className="mt-2 h-[20px] font-ui font-semibold text-[15px] sm:text-[16.5px] leading-[20px] tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
          <Swap k={spots}>{spots} builders joined your round</Swap>
        </p>
        <p
          className="mt-1.5 hidden sm:block text-[10.5px] leading-[1.55] max-w-[56ch]"
          style={{ color: C.muted }}
        >
          They have your plans and contact details and can message you. Tenders usually follow
          within days.
        </p>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <ul className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {BUILDERS.slice(0, spots).map((b) => (
              <motion.li
                key={b.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.46, ease: EASE }}
              >
                <WashRow
                  className="px-3.5 py-3"
                  cursorKey={`row-${b.key}`}
                  hot={s.hot === b.key}
                >
                  {/* The chips sit beside the name rather than under it.
                      Three rows have to fit above the tenders card at
                      every frame height, and a third line inside each
                      row is what stops them. */}
                  <div className="flex items-center gap-3">
                    <Avatar txt={b.initials} size={30} />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[12px] leading-[15px] font-semibold truncate"
                        style={{ color: C.ink }}
                      >
                        {b.name}
                      </p>
                      <p
                        className="mt-0.5 text-[10px] leading-[13px] truncate"
                        style={{ color: C.dim }}
                      >
                        {b.line}
                      </p>
                    </div>
                    <div className="hidden sm:flex shrink-0 items-center gap-1.5">
                      <VerifyChip label="ABN" />
                      <VerifyChip label="Licence" />
                    </div>
                  </div>
                </WashRow>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <ListFade />
      </div>

      {/* The project page's tenders card, which is where the owner goes
          next and which says, honestly, that there is nothing in it
          yet. */}
      <Card className="shrink-0 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <FileText className="size-3.5 shrink-0" style={{ color: C.dim }} />
          <p className="text-[11.5px] font-semibold" style={{ color: C.ink }}>
            Tenders · 0
          </p>
        </div>
        <p className="mt-1.5 hidden sm:block text-[10px] leading-[1.55]" style={{ color: C.dim }}>
          No tenders yet. Builders who take a spot on your round submit tenders here, laid out side
          by side for comparison.
        </p>
        <span
          data-cursor="stream"
          className="mt-2.5 -mx-1.5 inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] font-medium transition-colors duration-200"
          style={{
            color: C.tealInk,
            background: s.hot === "stream" ? C.tealWash : "transparent",
          }}
        >
          View tender stream
          <ArrowUpRight className="size-3" />
        </span>
      </Card>
    </>
  );
}

/* ── four · the tenders land ─────────────────────────────────────── */

function TendersScreen({ s }: { s: S }) {
  return (
    <>
      <div className="shrink-0">
        <Kicker>
          <PulseDot />
          3 tenders in
        </Kicker>
        <p
          className="mt-2 font-ui font-semibold text-[15px] sm:text-[16.5px] tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
          You have 3 tenders to compare
        </p>
        <p
          className="mt-1.5 hidden sm:block text-[10.5px] leading-[1.55] max-w-[58ch]"
          style={{ color: C.muted }}
        >
          Read them side by side, across price, timeline, and inclusions, then award the builder
          you trust.
        </p>
      </div>

      {/* They arrive in the same shape because they answered the same
          instrument, which is the only reason the numbers below them can
          be compared at all. */}
      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col gap-3">
        {TENDERS.map((t, i) => (
          <motion.div
            key={t.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.44, delay: 0.06 + i * 0.24, ease: EASE }}
          >
            <Card
              className="px-3.5 py-3.5 transition-colors duration-200"
              cursorKey={`card-${t.key}`}
              style={s.hot === t.key ? { borderColor: C.tealLine } : undefined}
            >
              <div className="flex items-start gap-3">
                <Mono txt={t.mono} size={24} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className="text-[12px] font-semibold leading-tight truncate"
                    style={{ color: C.ink }}
                  >
                    {t.name}
                  </p>
                  <p className="mt-1 text-[9.5px] leading-tight truncate" style={{ color: C.muted }}>
                    {t.years}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[8px] uppercase tracking-[0.16em]" style={{ color: C.dim }}>
                    Tender price inc GST
                  </p>
                  <p
                    className="mt-1 font-ui font-semibold text-[17px] leading-none tabular-nums"
                    style={{ color: C.ink }}
                  >
                    {t.price}
                  </p>
                  <p className="mt-1.5 text-[9.5px] leading-none" style={{ color: C.muted }}>
                    {t.weeks}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
        <ListFade />
      </div>

      <div className="shrink-0 flex justify-end">
        <GhostBtn cursorKey="compare" hot={s.hot === "compare"}>
          Compare tenders
        </GhostBtn>
      </div>
    </>
  );
}

/* ── five · the tender evaluation ────────────────────────────────── */

function CompareScreen({ s }: { s: S }) {
  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      <motion.div
        className="absolute inset-x-0 top-0 flex flex-col"
        style={{ gap: GAP }}
        initial={false}
        animate={{ y: s.cmpY }}
        transition={SCROLL}
      >
        {/* the round, in four numbers */}
        <Band h={H.head}>
          <p
            className="font-ui font-semibold uppercase tracking-[-0.02em] text-[15px] sm:text-[16.5px] leading-[1.05] line-clamp-1"
            style={{ color: C.ink, height: 20 }}
          >
            Single dwelling · Pascoe Vale, VIC
          </p>
          <Card className="mt-2.5 overflow-hidden" style={{ height: 74 }}>
            <div className="grid grid-cols-4 h-full">
              {STRIP.map(([label, value, sub], i) => (
                <div
                  key={label}
                  className={"px-1.5 sm:px-2 py-2 min-w-0 " + (i ? "border-l" : "")}
                  style={{ borderColor: C.line }}
                >
                  <p
                    className="text-[7px] sm:text-[7.5px] uppercase tracking-[0.14em] leading-[1.3] line-clamp-2"
                    style={{ color: C.dim }}
                  >
                    {label}
                  </p>
                  {/* Sized for the narrowest desktop frame rather than
                      the widest: the hero column is under 420px at the
                      bottom of the lg range, and a truncated figure is
                      worse than a slightly smaller one. */}
                  <p
                    className="mt-1 font-ui font-semibold text-[11px] sm:text-[13.5px] leading-none tabular-nums truncate"
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

        {/* the finding. everything else on the page is evidence for it */}
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
              className="mt-4 max-w-[54ch] text-[11.5px] sm:text-[12px] leading-[1.7] line-clamp-8 sm:line-clamp-none"
              style={{ color: C.ink }}
            >
              {PRICE_STORY}
            </p>
          </div>
        </Band>

        <TenderBand
          mono="MB"
          name="Meridian Building Co"
          years="14 years in operation"
          price="$753,500"
          programme="34 weeks · keys May 2027"
          firm={100}
          firmNote="Fully priced, no allowances"
          score={86}
          flagTone="good"
          flagWord="No significant flags"
          attention="3 worth attention"
          h={s.dims ? H.tenderOpen : H.tender}
          open={s.dims}
          scoreKey="score"
          awardKey="award"
          hotScore={s.hot === "score"}
          hotAward={s.hot === "award"}
        />

        <TenderBand
          mono="CB"
          name="Corten Build Co."
          years="6 years in operation"
          price="$712,800"
          programme="36 weeks · keys Jun 2027"
          firm={84}
          firmNote="Firm to 84% · $105,000 in allowances"
          score={47}
          flagTone="risk"
          flagWord="2 significant flags"
          attention="6 worth attention"
          h={H.tender}
        />

        {/* side by side */}
        <Band h={H.grid}>
          <Card className="h-full overflow-hidden flex flex-col">
            <div className="px-3.5 pt-3 pb-2.5 border-b" style={{ borderColor: C.line }}>
              <Kicker icon={Scale}>Side by side</Kicker>
              <p
                className="mt-1.5 font-ui font-semibold uppercase tracking-[-0.015em] text-[17px] leading-none"
                style={{ color: C.ink }}
              >
                The decision grid
              </p>
              <p className="mt-2 text-[9px] leading-[1.45] line-clamp-2" style={{ color: C.muted }}>
                Every row is the builders&apos; own answers, lined up. A teal cell holds the
                strongest position on that line.
              </p>
            </div>

            <div className="px-3 py-2 border-b" style={{ borderColor: C.line }}>
              <GridRow>
                <span />
                {COLUMNS.map((col) => (
                  <span key={col.name} className="min-w-0 flex items-center gap-1.5 pr-1">
                    <span className="hidden sm:inline-flex">
                      <Mono txt={col.mono} size={18} />
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block truncate text-[9px] font-semibold leading-tight"
                        style={{ color: C.ink }}
                      >
                        {col.name}
                      </span>
                      <span className="block truncate text-[8px] leading-tight" style={{ color: C.muted }}>
                        {col.price}
                      </span>
                    </span>
                  </span>
                ))}
              </GridRow>
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
                      <GridRow h={24}>
                        <span className="truncate text-[9px] pr-1" style={{ color: C.muted }}>
                          {r.label}
                        </span>
                        {r.v.map((v, ci) => {
                          const win = s.lit && r.win.includes(ci);
                          return (
                            <span
                              key={ci}
                              className="min-w-0 h-full flex items-center px-1 -ml-1 text-[9px] leading-[1.25] transition-colors duration-500"
                              style={{
                                background: win ? TONE.good.bg : undefined,
                                color: win ? TONE.good.text : C.ink,
                                fontWeight: win ? 600 : 400,
                                transitionDelay: `${(gi * 3 + ri) * 90}ms`,
                              }}
                            >
                              <span className="line-clamp-2">{v}</span>
                            </span>
                          );
                        })}
                      </GridRow>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </Band>

        <Band h={H.record}>
          <Card className="h-full overflow-hidden px-3.5 py-2.5 flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block text-[8px] uppercase tracking-[0.18em]" style={{ color: C.tealInk }}>
                Module by module
              </span>
              <span className="mt-0.5 block text-[11.5px] font-semibold leading-tight" style={{ color: C.ink }}>
                The full record
              </span>
              <span className="block truncate text-[9px]" style={{ color: C.muted }}>
                Every disclosed answer, question by question, exactly as submitted.
              </span>
            </span>
            <ChevronDown className="size-3.5 shrink-0" style={{ color: C.dim }} />
          </Card>
        </Band>

        <div aria-hidden style={{ height: 30 }} />
      </motion.div>

      <ListFade />
    </div>
  );
}

/** One band of the evaluation column at its declared height, which is
 *  what makes the waypoints above deterministic. Deliberately not
 *  clipped: the cards inside clip their own content, and clipping here
 *  would cut off the shadow that puts the paper above the canvas. */
function Band({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <div className="shrink-0" style={{ height: h }}>
      {children}
    </div>
  );
}

/** The four column measure every table on this surface shares. */
function GridRow({ children, h }: { children: React.ReactNode; h?: number }) {
  return (
    <div
      className="grid items-center gap-0 grid-cols-[0.85fr_repeat(3,minmax(0,1fr))] sm:grid-cols-[1.12fr_repeat(3,minmax(0,1fr))]"
      style={{ height: h }}
    >
      {children}
    </div>
  );
}

/**
 * One tender, as its card reads on the evaluation. Only the first one
 * carries cursor keys: the pointer opens its working and, once the
 * round has been read to the bottom and back, presses its Award.
 */
function TenderBand({
  mono,
  name,
  years,
  price,
  programme,
  firm,
  firmNote,
  score,
  flagTone,
  flagWord,
  attention,
  h,
  open,
  scoreKey,
  awardKey,
  hotScore,
  hotAward,
}: {
  mono: string;
  name: string;
  years: string;
  price: string;
  programme: string;
  firm: number;
  firmNote: string;
  score: number;
  flagTone: "good" | "risk";
  flagWord: string;
  attention: string;
  h: number;
  open?: boolean;
  scoreKey?: string;
  awardKey?: string;
  hotScore?: boolean;
  hotAward?: boolean;
}) {
  return (
    <motion.div className="shrink-0" initial={false} animate={{ height: h }} transition={OPEN}>
      <Card
        className="h-full overflow-hidden flex flex-col px-3.5 pt-3"
        style={hotScore || hotAward ? { borderColor: C.tealLine } : undefined}
      >
        <div className="flex items-center gap-3">
          <Mono txt={mono} size={24} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold leading-tight" style={{ color: C.ink }}>
              {name}
            </p>
            <p className="mt-0.5 text-[9.5px] leading-tight" style={{ color: C.muted }}>
              {years}
            </p>
          </div>
        </div>

        <p className="mt-2.5 text-[8px] uppercase tracking-[0.16em]" style={{ color: C.dim }}>
          Tender price inc GST
        </p>
        <p
          className="mt-1 font-ui font-semibold text-[22px] leading-none tabular-nums"
          style={{ color: C.ink }}
        >
          {price}
        </p>
        <p className="mt-1 text-[9.5px]" style={{ color: C.muted }}>
          {programme}
        </p>

        <div className="mt-2">
          <FirmSplit firm={firm} h={7} />
        </div>
        <p className="mt-1 text-[9.5px] truncate" style={{ color: C.muted }}>
          {firmNote}
        </p>

        <div className="mt-2.5 border-t pt-2.5" style={{ borderColor: C.line }}>
          <div
            data-cursor={scoreKey}
            className="flex items-center gap-2.5 rounded px-1 -mx-1 transition-colors duration-200"
            style={{ height: 16, background: hotScore ? C.tealWash : undefined }}
          >
            <span
              className="w-[92px] sm:w-[118px] shrink-0 truncate text-[9.5px] font-semibold"
              style={{ color: C.ink }}
            >
              Weighted overall
            </span>
            <Bar pct={score} h={5} leads />
            <span
              className="w-6 shrink-0 text-right font-ui font-semibold text-[12px] tabular-nums"
              style={{ color: C.ink }}
            >
              {score}
            </span>
          </div>

          {/* The working, revealed by opening the row above it. Height
              animated rather than mounted, so the card and the column
              below it stay in lockstep. */}
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
                  <span
                    className="w-[92px] sm:w-[118px] shrink-0 truncate text-[9px]"
                    style={{ color: C.muted }}
                  >
                    {d.label}
                    <span style={{ color: C.dim }}> · {d.weight}%</span>
                  </span>
                  <Bar pct={d.score} h={4} leads={d.leads} />
                  <span
                    className="w-6 shrink-0 text-right font-ui text-[11px] tabular-nums"
                    style={{ color: d.leads ? TONE.good.text : C.ink }}
                  >
                    {d.score}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <p className="mt-2.5 text-[9.5px] leading-tight">
          <span className="font-semibold" style={{ color: TONE[flagTone].text }}>
            {flagWord}
          </span>
          <span style={{ color: C.muted }}> · {attention}</span>
        </p>

        {/* The decision sits on the card, where the app puts it. */}
        <div
          className="mt-auto -mx-3.5 border-t px-3.5 flex items-center justify-between gap-2"
          style={{ borderColor: C.line, height: FOOT }}
        >
          <span
            className="inline-flex items-center gap-1 text-[9.5px] font-semibold"
            style={{ color: C.ink }}
          >
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
              data-cursor={awardKey}
              className="inline-flex items-center gap-1 rounded-[5px] px-2 py-[3px] text-[9px] font-semibold transition-[box-shadow] duration-200"
              style={{
                background: C.ink,
                color: C.canvas,
                boxShadow: hotAward ? `0 0 0 3px ${C.tealMuted}` : `0 0 0 0 ${C.tealWash}`,
              }}
            >
              <Award className="size-2.5" />
              Award
            </span>
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

/* ── six · the decision ──────────────────────────────────────────── */

function AwardScreen() {
  return (
    <>
      {/* The confirmation, given its own entrance a beat after the
          screen so it reads as the consequence of the press rather than
          as furniture that was already there. */}
      <motion.div
        className="shrink-0 flex items-center gap-3 rounded-lg border px-3.5 py-3"
        style={{ borderColor: TONE.good.border, background: TONE.good.bg }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: C.tealInk, color: C.paper }}
        >
          <Award className="size-4.5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-tight" style={{ color: C.ink }}>
            This project is awarded to Meridian Building Co.
          </p>
          <p className="mt-1 text-[10px] leading-[1.45]" style={{ color: C.muted }}>
            They will be notified immediately and given your contact details so you can move to
            contract.
          </p>
        </div>
      </motion.div>

      <Card className="shrink-0 px-3.5 pt-3 overflow-hidden">
        <div className="flex items-center gap-3">
          <Mono txt="MB" size={24} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold leading-tight" style={{ color: C.ink }}>
              Meridian Building Co
            </p>
            <p className="mt-0.5 text-[9.5px] leading-tight" style={{ color: C.muted }}>
              14 years in operation
            </p>
          </div>
          <motion.span
            className="shrink-0 inline-flex items-center gap-1 rounded-[5px] px-2 py-[4px] text-[9px] uppercase tracking-[0.08em] font-bold"
            style={{ background: C.tealInk, color: C.paper }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.42, ease: EASE }}
          >
            <Award className="size-2.5" />
            Awarded
          </motion.span>
        </div>

        <p className="mt-3 text-[8px] uppercase tracking-[0.16em]" style={{ color: C.dim }}>
          Tender price inc GST
        </p>
        <p
          className="mt-1 font-ui font-semibold text-[21px] leading-none tabular-nums"
          style={{ color: C.ink }}
        >
          $753,500
        </p>
        <p className="mt-1.5 text-[9.5px]" style={{ color: C.muted }}>
          34 weeks · Fully priced, no allowances
        </p>

        <div className="mt-3 border-t pt-2.5" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2.5" style={{ height: 16 }}>
            <span
              className="w-[92px] sm:w-[118px] shrink-0 truncate text-[9.5px] font-semibold"
              style={{ color: C.ink }}
            >
              Weighted overall
            </span>
            <Bar pct={86} h={5} leads />
            <span
              className="w-6 shrink-0 text-right font-ui font-semibold text-[12px] tabular-nums"
              style={{ color: C.ink }}
            >
              86
            </span>
          </div>
        </div>

        <div
          className="mt-2.5 -mx-3.5 border-t px-3.5 py-2 flex items-center justify-between gap-2"
          style={{ borderColor: C.line }}
        >
          <span
            className="inline-flex items-center gap-1 text-[9.5px] font-semibold"
            style={{ color: C.ink }}
          >
            <ScrollText className="size-3" />
            Read the evaluation
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-[5px] border px-2 py-[3px] text-[9px] font-semibold"
            style={{ borderColor: TONE.good.border, background: TONE.good.bg, color: TONE.good.text }}
          >
            <Star className="size-2.5 fill-current" />
            Shortlisted
          </span>
        </div>
      </Card>

      {/* What the decision leaves behind. The two tenders that were not
          taken stay Submitted: declining them is a separate choice the
          owner makes inside the award dialog. */}
      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col gap-2">
        <motion.p
          className="shrink-0 text-[9.5px] leading-[13px]"
          style={{ color: C.dim }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          The record below stays exactly as it stood on decision day.
        </motion.p>
        {OTHERS.map((o) => (
          <Card key={o.name} className="px-3.5 py-2">
            <div className="flex items-center gap-3">
              <Mono txt={o.mono} size={20} />
              <p
                className="min-w-0 flex-1 truncate text-[11px] font-semibold"
                style={{ color: C.ink }}
              >
                {o.name}
              </p>
              <p className="shrink-0 text-[10px] tabular-nums" style={{ color: C.muted }}>
                {o.price}
              </p>
              <span className="shrink-0">
                <Pill tone="ink">Submitted</Pill>
              </span>
            </div>
          </Card>
        ))}
        <ListFade />
      </div>
    </>
  );
}

/* ── atoms this scene owns ───────────────────────────────────────── */

/**
 * A hover ring around a kit plate button. The kit's buttons carry no
 * hover state of their own, and a pointer that slides over dead
 * furniture looks fake, so the response lives out here rather than
 * being pushed into atoms four other scenes share. Colour and shadow
 * move on a CSS transition; nothing here goes near the layout thread.
 */
function Press({ k, hot, children }: { k: string; hot: boolean; children: React.ReactNode }) {
  return (
    <span
      data-cursor={k}
      className="inline-flex rounded-full transition-[box-shadow,transform] duration-200"
      style={{
        boxShadow: hot ? `0 0 0 4px ${C.tealMuted}` : `0 0 0 0 ${C.tealWash}`,
        transform: hot ? "translateY(-1px)" : "none",
      }}
    >
      {children}
    </span>
  );
}

/**
 * The register's headline figure, counted rather than printed. It runs
 * once, on mount, delayed so the camera is already standing on it when
 * the number starts to move. It writes textContent through a ref
 * rather than state: the count renders ninety-odd frames and none of
 * them needs React.
 */
function CountUp({
  to,
  delay,
  className,
  style,
}: {
  to: number;
  delay: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = String(to);
      return;
    }
    el.textContent = "0";
    const run = animate(0, to, {
      delay,
      duration: 1.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => run.stop();
  }, [to, delay, reduced]);
  return (
    <span ref={ref} className={className} style={style}>
      0
    </span>
  );
}

/** The signature monogram, the app's ink-to-teal gradient circle. */
function Mono({ txt, size = 20 }: { txt: string; size?: number }) {
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

/**
 * The firm-versus-allowance bar. Two facts in one shape: the amber
 * track is what can still move, and the teal gradient is what is
 * committed in the contract sum.
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

/** The round's live dot. A genuine animate-ping in the product. */
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

/** A text slot that rewrites itself without shifting the line below. */
function Swap({ k, children }: { k: React.Key; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={k}
        className="inline-block whitespace-nowrap"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.2, ease: EASE }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}
