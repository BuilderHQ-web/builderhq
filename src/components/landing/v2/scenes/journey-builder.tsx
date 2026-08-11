"use client";

/**
 * Builder · the whole story, six acts, one pair of hands, one camera.
 *
 * The hero plays a builder's week end to end: the register they browse
 * on a Tuesday night, the project they hold a spot on, the scope that
 * was written for them before they arrived, the schedule they walk, the
 * document they send, and the job they win. One builder the whole way
 * through, Meridian Building Co, so the same name and the same figure
 * are on the last screen as on the fifth.
 *
 * THE DIRECTION. Three earlier versions are worth naming. The first
 * swapped screens on a timer and read as a slideshow, because nothing
 * caused the change. The second gave the pointer real controls to
 * press, which fixed the causing but watched everything from the same
 * chair. The third added a camera and overdid it: it zoomed through
 * every navigation and leaned on every detail, and at 660px a push
 * crops as much as it magnifies. This cut is an explainer. Between
 * acts the frame dissolves to a centred chapter card that says, in one
 * line, what is about to happen; the next screen mounts underneath it,
 * and the clear of the card is the reveal, always wide. The card IS
 * the cut, so the camera no longer travels through navigations at all.
 *
 * THE ZOOM BUDGET, all three pushes named, everything else wide:
 *
 *   · 1.2 on the analysed strip in act one — nine documents, 211
 *     pages, 242 items, the product's whole pitch to a builder, set in
 *     8.5px type that a wide shot cannot sell. The strip ends inside
 *     the 550px window the push leaves, so nothing being read crops.
 *   · 1.3 on the first schedule line in act four, the signature push.
 *     The line card and all four marks sit inside the window; the
 *     header counter at the frame's far right does not, so the counter
 *     holds its move until the pull-back and the wide shot is what
 *     reveals 18 become 19.
 *   · 1.25 on the sealing sentence in act five — the one sentence in
 *     the film that must actually be read, 9.5px at the frame's foot.
 *     The sentence, both controls and the ledger's tail all fit.
 *
 * Scrolls are always taken wide, and the long reads name their
 * sections with a bottom-centre tag instead of a lean: the document
 * register and the scope register both carry one while they travel.
 *
 * WHAT THE POINTER PRESSES, in order: the type filter and Apply on the
 * register, the Pascoe Vale row, the "Scope of works" section, "Start
 * your tender" on the project's fixed bar, one Included chip and then
 * "Continue" in the deck footer, "Submit tender" and its confirmation.
 * All of them are controls the app actually renders, and every press
 * keeps the hand: hover first, the 400ms hesitation, then the click.
 *
 * Two product rules carried over from the kit and easy to break: bright
 * teal is a FILL and never type, and the project reads UNLOCKED from
 * the frame it opens on, with its real street address and its real
 * filenames, because a visitor should see what a spot buys rather than
 * the wall in front of it.
 *
 * ONE NAMED COMPRESSION, so a later reader does not think it a mistake.
 * The builder project page is a single tall page whose sections carry
 * the ids and titles the unlock tour walks: Key details, The client,
 * Scope of works, Documents, Messages. In the app you reach them by
 * scrolling three thousand pixels. In a 660px frame that is not
 * available, so the miniature gives those same sections a rail and lets
 * the pointer step between them. The names are the app's own; only the
 * rail is the miniature's.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Building,
  Check,
  ChevronDown,
  Compass,
  Download,
  FileText,
  Home,
  Layers,
  MapPin,
  Sparkles,
  Unlock,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { SceneCamera, SceneCursor, useSceneScript } from "../scene-motion";
import {
  C,
  TONE,
  ELEV,
  ChapterCard,
  Frame,
  Card,
  Division,
  Kicker,
  ListFade,
  Mark,
  Pill,
  ScopeLine,
  SectionTag,
  TealBtn,
  Track,
  useCompact,
  type ToneKey,
} from "./kit";

/* ══ The session ════════════════════════════════════════════════════ */

/** The builder the journey follows, and the round they are on. */
const US = "Meridian Building Co";
const PROJECT = "Single dwelling · Pascoe Vale, VIC";

type Screen = "browse" | "project" | "scope" | "tender" | "submit" | "won";

/**
 * The breadcrumb in the topbar. It is the cheapest and most convincing
 * signal that the session navigated, so it changes with every screen
 * while everything else in the chrome holds still.
 */
const CRUMB: Record<Screen, string> = {
  browse: "Browse projects",
  project: PROJECT,
  scope: "Scope of works",
  tender: "Tender · the schedule",
  submit: "Review and submit",
  won: "Your tender",
};

/**
 * The chapter cards, one per act. Each title says what the act IS and
 * each sub carries the claim the footage then proves, so a visitor who
 * reads nothing else still gets the whole pitch in six short lines.
 * The film opens on act one's card the way an explainer does.
 */
const CARDS: Record<Screen, { n: string; title: string; sub: string }> = {
  browse: {
    n: "01",
    title: "Find projects that fit",
    sub: "Live rounds in your area, with spots capped so you know the field.",
  },
  project: {
    n: "02",
    title: "Access all project details",
    sub: "The full address and every document, exactly as the client filed them.",
  },
  scope: {
    n: "03",
    title: "We lay out the scope",
    sub: "242 items from the client’s documents. Nothing for you to assemble.",
  },
  tender: {
    n: "04",
    title: "Mark your price",
    sub: "Included, provisional sum, excluded. Line by line.",
  },
  submit: {
    n: "05",
    title: "We prepare your submission",
    sub: "The same questions as everyone, answered once and signed.",
  },
  won: {
    n: "06",
    title: "Win with confidence",
    sub: "Contract directly with the client and keep all of it.",
  },
};

type S = {
  screen: Screen;
  /** The chapter card over the canvas, or null while an act plays.
   *  Setting it together with `screen` is the cut: the new screen
   *  mounts underneath and the clear is the reveal, always wide. */
  card: { n: string; title: string; sub?: string } | null;
  /** The lower-third naming a section while a long surface scrolls. */
  tag: string | null;
  /** The control under the pointer. Nothing lights unless it is here. */
  hot: string | null;
  /** Browse: the type select carries a value; the query has been re-run.
   *  Separate because the app's filter bar is a GET form: choosing does
   *  nothing until Apply. */
  picked: boolean;
  filtered: boolean;
  /** Which section of the project page the rail is lit on. */
  sec: "facts" | "scope" | "documents";
  /** The document register's offset. Negative scrolls it up. */
  docY: number;
  /** The open division on the scope screen, and its lit citation. */
  open: string | null;
  cite: boolean;
  /** The scope register's offset. Negative scrolls it up. */
  scopeY: number;
  /** The schedule's offset, the lines marked Included, and the deck's
   *  own answered counter, which the 3px track is derived from. */
  schedY: number;
  marked: readonly string[];
  answered: number;
  /** The second step of the two-step submit. */
  confirm: boolean;
};

/**
 * Screen one, complete and finished, with nothing having happened yet:
 * the register as it loads, before any filter, cardless and wide. This
 * is also exactly what renders under prefers-reduced-motion, so it has
 * to stand alone.
 */
const RESTING: S = {
  screen: "browse",
  card: null,
  tag: null,
  hot: null,
  picked: false,
  filtered: false,
  sec: "facts",
  docY: 0,
  open: null,
  cite: false,
  scopeY: 0,
  schedY: 0,
  marked: [],
  answered: 18,
  confirm: false,
};

/** The app's entrance easing, and the slower curve a scrolled surface
 *  wants so it reads as scrolling rather than jumping. */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SCROLL = { duration: 0.85, ease: [0.22, 1, 0.36, 1] } as const;

/** A palette hex at one of the app's own alphas, so the band tints
 *  stay provably the palette rather than a second set of colours. */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* ══ The journey ════════════════════════════════════════════════════ */

export function BuilderJourney({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks, cam } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 2000,
    // The first beat raises act one's card, so any settle before it
    // shows the bare screen for a moment first.
    startDelay: 0,
    script: [
      /* ── The film opens on act one's card, the explainer's cold
         open: the register already sits underneath it. ──────────── */
      { set: { card: CARDS.browse } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── Act 1 · Find the round ───────────────────────────────────
         Wide open on the register, and wide it stays for the filter
         work. Choosing a type does nothing until Apply, which is the
         app's own GET-form behaviour and the reason for two presses.
         The film's first push lands only after the re-query, on the
         analysed strip: at 1.2 the whole strip and the row it sits in
         are inside the window, so nothing being read is cropped. */
      { wait: 650 },
      { move: "type", ms: 630 },
      { set: { hot: "type" } },
      { wait: 400 },
      { click: true },
      { set: { picked: true, hot: null } },
      { wait: 400 },
      { move: "apply", ms: 500 },
      { set: { hot: "apply" } },
      { wait: 400 },
      { click: true },
      // The re-query is a reveal, so it lands on the wide shot.
      { set: { filtered: true, hot: null } },
      { wait: 800 },
      // No push here. Leaning on the analysed strip cropped the
      // register either side of it, and the strip is the reason to
      // read the row, not a detail to hunt for.
      { wait: 950 },
      { move: "row", ms: 500 },
      { set: { hot: "row" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.project, screen: "project", hot: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── Act 2 · Everything, unlocked ─────────────────────────────
         The street address, the fact sheet, then the register of nine
         documents scrolled the way a builder scrolls it. All of it
         wide; the lower-third names what is rolling past instead of
         the camera chasing it. The second waypoint lands the list on
         the last of the nine, so the read ends on a still bottom. */
      { wait: 800 },
      // Press the rail rather than hovering a row and having the page
      // move on its own. A 400ms hesitation that is not followed by a
      // click is the hand's full tell of a press with no press: the one
      // beat in this film where something happened that nothing caused.
      { move: "nav-documents", ms: 700 },
      { set: { hot: "nav-documents" } },
      { wait: 400 },
      { click: true },
      { set: { hot: null, sec: "documents", docY: -180, tag: "Nine documents, real filenames" } },
      { wait: 800 },
      { set: { docY: -374, tag: "Surveys, soil and town planning" } },
      { wait: 850 },
      { set: { tag: null } },
      { move: "nav-scope", ms: 560 },
      { set: { hot: "nav-scope" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.scope, screen: "scope", sec: "scope", hot: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── Act 3 · The scope, already written ───────────────────────
         The stats band counts to 242 on the wide shot, the builder
         opens footings and reads a citation, and then the register is
         scrolled at its real length: fourteen divisions on screen and
         the tag carrying the claim. No push anywhere in the act — the
         card already said what this screen is, and the length of the
         list IS the shot. */
      { wait: 900 },
      { move: "div-footings", ms: 560 },
      { set: { hot: "div-footings" } },
      { wait: 400 },
      { click: true },
      { set: { open: "footings", hot: null } },
      { wait: 400 },
      // Frame the opened division, then let the scroll settle before
      // the pointer measures the citation's position.
      { set: { scopeY: -150 } },
      { wait: 900 },
      { move: "cite-footings", ms: 470 },
      { set: { cite: true } },
      { wait: 900 },
      // The long read: two legs down the register, each named. The
      // stops are set against the rendered list so the last division
      // arrives flush at the frame's foot.
      { set: { cite: false, tag: "242 items, every line cited", scopeY: -320 } },
      { wait: 850 },
      { set: { scopeY: -490, tag: "29 trades, every one covered" } },
      { wait: 850 },
      { set: { tag: null } },
      { move: "start-tender", ms: 560 },
      { set: { hot: "start-tender" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.tender, screen: "tender", hot: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── Act 4 · Mark your price ──────────────────────────────────
         The signature push, 1.3 on the first schedule line: the line,
         its citation and all four marks sit inside the window while
         Included fills teal. The header counter at the frame's far
         right does NOT fit at that scale, so it holds its move until
         the pull-back — the wide shot is what reveals 18 become 19
         and the track edge on. */
      { wait: 800 },
      // Wide. The mark and the counter it moves sit at opposite ends of
      // the frame, so any push that held the chips lost the counter,
      // which is the half that proves the schedule is closing.
      { move: "slab-included", ms: 560 },
      { set: { hot: "slab-included" } },
      { wait: 400 },
      { click: true },
      { set: { marked: ["slab"], hot: null } },
      { wait: 500 },
      { set: { answered: 19 } },
      { wait: 950 },
      { set: { schedY: -126 } },
      { wait: 900 },
      { move: "continue", ms: 560 },
      { set: { hot: "continue" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.submit, screen: "submit", hot: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── Act 5 · One sealed submission ────────────────────────────
         The cover, the price and the twelve-module ledger are read
         whole on the wide shot. The one lean is for the one sentence
         in the film that must actually be read: submitting seals the
         tender. The confirmation itself is pressed wide, so the cut
         to the award comes off a resting camera. */
      { wait: 1000 },
      { cam: { focus: "submit", scale: 1.25, ms: 900 } },
      { move: "submit", ms: 560 },
      { set: { hot: "submit" } },
      { wait: 400 },
      { click: true },
      { set: { confirm: true, hot: null } },
      { wait: 1150 },
      { cam: "reset" },
      { move: "submit-confirm", ms: 500 },
      { set: { hot: "submit-confirm" } },
      { wait: 400 },
      { click: true },
      { set: { card: CARDS.won, screen: "won", hot: null } },
      { wait: 1600 },
      { set: { card: null } },
      { wait: 500 },

      /* ── Act 6 · Won, no commission ───────────────────────────────
         The end of the session, and the camera never moves: a won job
         is taken in whole. The pointer rests on the one thing a
         builder reaches for here, and only then leaves the screen. */
      { wait: 1200 },
      { move: "pdf", ms: 720 },
      { set: { hot: "pdf" } },
      { wait: 1100 },
      { set: { hot: null } },
      { cursor: "hide" },
      { wait: 400 },
    ],
  });

  const { screen } = state;
  const onProjectPage = screen === "project" || screen === "scope";

  return (
    <div ref={root} className="relative w-full h-full overflow-hidden">
      {/* The cursor rides INSIDE the camera and grows with the zoom,
          exactly as a recorded cursor would. The section tag and the
          chapter card sit OUTSIDE it: titles do not zoom with footage,
          and the card must cover the whole frame whatever the camera
          was doing underneath. */}
      <SceneCamera cam={cam}>
        <Frame
          crumb={CRUMB[screen]}
          avatar="MB"
          // The page-level bars are chrome, not content: the project's
          // tender bar is fixed to the foot of the real page and the
          // deck's controls are ruled off at the foot of the real deck.
          // Keeping them out here means the bar survives the project to
          // scope move without remounting, exactly as it does in the app.
          overlay={
            <AnimatePresence mode="wait" initial={false}>
              {onProjectPage ? (
                <FootBar key="cta" tone="cta">
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className="shrink-0 inline-flex size-6 items-center justify-center rounded-md border"
                      style={{ borderColor: C.tealLine, background: C.tealMuted, color: C.tealInk }}
                    >
                      <FileText className="size-3" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-semibold leading-tight truncate" style={{ color: C.ink }}>
                        Ready to tender on this project?
                      </p>
                      <p className="mt-[1px] text-[8.5px] leading-tight truncate" style={{ color: C.dim }}>
                        Twelve short modules, about thirty minutes.
                      </p>
                    </div>
                  </div>
                  <Press k="start-tender" hot={state.hot === "start-tender"}>
                    <TealBtn>Start your tender</TealBtn>
                  </Press>
                </FootBar>
              ) : screen === "tender" ? (
                <FootBar key="deck" tone="deck">
                  <span className="inline-flex items-center gap-1.5 text-[10px]" style={{ color: C.dim }}>
                    <ArrowLeft className="size-3" />
                    Back
                  </span>
                  <Press k="continue" hot={state.hot === "continue"}>
                    <TealBtn>
                      Continue
                      <ArrowRight className="size-3" />
                    </TealBtn>
                  </Press>
                </FootBar>
              ) : null}
            </AnimatePresence>
          }
        >
          {/* The only thing that crossfades is the screen body. The
              topbar, the foot bar and the pointer sit outside it. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screen}
              className="flex-1 min-h-0 flex flex-col gap-2.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {screen === "browse" ? (
                <BrowseScreen picked={state.picked} filtered={state.filtered} hot={state.hot} />
              ) : screen === "project" ? (
                <ProjectScreen sec={state.sec} docY={state.docY} hot={state.hot} />
              ) : screen === "scope" ? (
                <ScopeScreen
                  sec={state.sec}
                  y={state.scopeY}
                  open={state.open}
                  cite={state.cite}
                  hot={state.hot}
                />
              ) : screen === "tender" ? (
                <TenderScreen
                  y={state.schedY}
                  marked={state.marked}
                  answered={state.answered}
                  hot={state.hot}
                />
              ) : screen === "submit" ? (
                <SubmitScreen confirm={state.confirm} hot={state.hot} />
              ) : (
                <WonScreen hot={state.hot} />
              )}
            </motion.div>
          </AnimatePresence>
        </Frame>
        <SceneCursor cursor={cursor} clicks={clicks} />
      </SceneCamera>

      <SectionTag text={state.tag} />
      <ChapterCard card={state.card} />
    </div>
  );
}

/* ══ Shared furniture ═══════════════════════════════════════════════ */

/**
 * A teal control the pointer can press. The ring is the app's own hover
 * treatment on the register's Apply button; the small swell is what
 * turns a lit rectangle into something that looks reachable. Transform
 * and box shadow only, so nothing here touches layout.
 */
function Press({ k, hot, children }: { k: string; hot: boolean; children: React.ReactNode }) {
  return (
    <motion.span
      data-cursor={k}
      className="inline-flex shrink-0 rounded-full"
      style={{ boxShadow: hot ? `0 0 0 3px ${C.tealMuted}` : undefined }}
      initial={false}
      animate={{ scale: hot ? 1.045 : 1 }}
      transition={{ duration: 0.24, ease: EASE }}
    >
      {children}
    </motion.span>
  );
}

/**
 * A bar ruled off at the foot of the frame, the way both the project
 * page and the tender deck pin their controls. The project's bar is
 * the teal-ruled one the app fixes to the viewport; the deck's is the
 * quiet rule under its slides, so the two do not read as the same
 * furniture surviving a navigation it did not survive.
 */
function FootBar({ tone, children }: { tone: "cta" | "deck"; children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-20 border-t px-3 h-[44px] flex items-center justify-between gap-2"
      style={
        tone === "cta"
          ? { borderColor: C.tealLine, background: C.paper }
          : { borderColor: C.line2, background: C.canvas }
      }
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** The spacer that keeps a list from running beneath the foot bar, the
 *  way the real page keeps a pb-32 under its fixed one. On the portrait
 *  phone stage the bar sits at the frame's foot like everywhere else,
 *  so the column reserves the bar's 44px less the frame's own 16px of
 *  bottom padding: h-7. From `sm` up the full h-11 stands as it was. */
function BarSpacer() {
  return <div aria-hidden className="shrink-0 h-7 sm:h-11" />;
}

/** A section's rule: teal label, then a hairline to the right edge.
 *  Split from its body so a section whose body is a scrolling viewport
 *  can keep the rule outside the clip. */
function RuleLine({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <header className="shrink-0 flex items-center gap-2">
      <Icon className="size-3 shrink-0" style={{ color: C.tealInk }} strokeWidth={2.2} />
      <h3 className="text-[8.5px] tracking-[0.2em] uppercase font-semibold shrink-0" style={{ color: C.tealInk }}>
        {label}
      </h3>
      <span aria-hidden className="h-px flex-1" style={{ background: C.line }} />
    </header>
  );
}

/** A ruled section whose body sits still. */
function Ruled({
  label,
  icon,
  children,
  className = "",
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={"shrink-0 " + className}>
      <RuleLine label={label} icon={icon} />
      <div className="pt-2">{children}</div>
    </section>
  );
}

/**
 * The floor a scrolling list keeps on a phone.
 *
 * The portrait stage bottoms out at 360px on short phones, and a column
 * of shrink-0 blocks will happily squeeze a flex-1 list to nothing,
 * which reads as a broken screen rather than a small one. Below `sm`
 * the list holds a floor and the tail of the column runs under the
 * ListFade instead; from `sm` up there is room and the list simply
 * fills what is left.
 */
const LIST = "relative flex-1 min-h-[92px] sm:min-h-0 overflow-hidden";

/**
 * The project page's sections, given a rail.
 *
 * The keys and the labels are the page's own, from the six stops the
 * unlock tour walks. Two of them stand down on a phone so the rail can
 * never run past the frame's edge.
 */
const SECTIONS: Array<{ key: string; label: string; phone: boolean }> = [
  { key: "facts", label: "Key details", phone: true },
  { key: "owner", label: "The client", phone: false },
  { key: "scope", label: "Scope of works", phone: true },
  { key: "documents", label: "Documents", phone: true },
  { key: "messaging", label: "Messages", phone: false },
];

function SectionRail({ active, hot }: { active: string; hot: string | null }) {
  return (
    <div className="relative shrink-0 flex items-center gap-1 overflow-hidden">
      {SECTIONS.map((s) => {
        const on = s.key === active;
        const lit =
          (s.key === "scope" && hot === "nav-scope") ||
          (s.key === "documents" && hot === "nav-documents");
        return (
          <span
            key={s.key}
            data-cursor={
              s.key === "scope"
                ? "nav-scope"
                : s.key === "documents"
                  ? "nav-documents"
                  : undefined
            }
            className={
              "shrink-0 rounded-full px-2 py-[3px] text-[8.5px] sm:text-[9px] whitespace-nowrap transition-colors duration-200 " +
              (s.phone ? "inline-flex" : "hidden sm:inline-flex")
            }
            style={
              on
                ? { color: TONE.good.text, background: TONE.good.bg, fontWeight: 600 }
                : lit
                  ? { color: C.tealInk, background: C.tealWash, fontWeight: 600 }
                  : { color: C.muted }
            }
          >
            {s.label}
          </span>
        );
      })}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 sm:hidden"
        style={{ background: `linear-gradient(90deg, transparent, ${C.canvas})` }}
      />
    </div>
  );
}

/* ══ 1 · Browse ═════════════════════════════════════════════════════ */

type Kind = "single_dwelling" | "multi_dwelling" | "renovation" | "extension";

/** Type name and mark, from the register card's own TYPE_META. Note
 *  "Multi dwelling" is unhyphenated on the card even though the filter
 *  hyphenates it. */
const TYPE_META: Record<Kind, { label: string; Icon: LucideIcon }> = {
  single_dwelling: { label: "Single dwelling", Icon: Home },
  multi_dwelling: { label: "Multi dwelling", Icon: Building },
  renovation: { label: "Renovation", Icon: Wrench },
  extension: { label: "Extension", Icon: Layers },
};

/** The one-off spot price per type, from projects/pricing.ts. */
const PRICE: Record<Kind, number> = {
  renovation: 49,
  extension: 99,
  single_dwelling: 149,
  multi_dwelling: 199,
};

/** The type's paper tint — the wash the band sits on, per type. */
const TINT: Record<Kind, string> = {
  single_dwelling: `linear-gradient(to bottom right, ${alpha(C.teal, 0.22)}, ${alpha(C.blue, 0.12)})`,
  multi_dwelling: `linear-gradient(to bottom right, ${alpha(C.blue, 0.19)}, ${alpha(C.blue, 0.08)})`,
  renovation: `linear-gradient(to bottom right, ${TONE.warn.bg}, ${TONE.risk.bg})`,
  extension: `linear-gradient(to bottom right, ${alpha(C.tealInk, 0.19)}, ${alpha(C.teal, 0.14)})`,
};

type Docket = {
  id: string;
  kind: Kind;
  title: string;
  where: string;
  budget: string;
  specs: Array<[string, string]>;
  spots: number;
  taken: number;
  /** The analysed line, only on rounds whose documents were read. */
  pack?: string;
};

/** Four live rounds, the shape browse returns before any filter. */
const ALL: Docket[] = [
  {
    id: "northcote",
    kind: "extension",
    title: "Rear extension, Northcote",
    where: "Northcote, VIC",
    budget: "$500k to $1m",
    specs: [["3", "beds"], ["2", "baths"], ["2", "storeys"]],
    spots: 3,
    taken: 1,
  },
  {
    id: "coburg",
    kind: "renovation",
    title: "Kitchen and bathroom renovation, Coburg",
    where: "Coburg, VIC",
    budget: "Under $500k",
    specs: [["4", "beds"], ["2", "baths"], ["1", "storey"]],
    spots: 3,
    taken: 0,
  },
  {
    id: "pascoe",
    kind: "single_dwelling",
    title: PROJECT,
    where: "Pascoe Vale, VIC",
    budget: "$1.5m to $2m",
    specs: [["4", "beds"], ["4", "baths"], ["3", "storeys"]],
    spots: 3,
    taken: 1,
    pack: "9 tender documents analysed · 211 pages read · 242 scope items identified",
  },
  {
    id: "reservoir",
    kind: "multi_dwelling",
    title: "Four townhouses, Reservoir",
    where: "Reservoir, VIC",
    budget: "$2m to $3m",
    specs: [["3", "beds"], ["2", "baths"], ["4", "dwellings"]],
    spots: 3,
    taken: 2,
  },
];

/** What the same query returns once type=Single dwelling is applied. */
const FILTERED: Docket[] = [
  ALL[2]!,
  {
    id: "brunswick",
    kind: "single_dwelling",
    title: "New home, Brunswick East",
    where: "Brunswick East, VIC",
    budget: "$1m to $1.5m",
    specs: [["4", "beds"], ["3", "baths"], ["2", "storeys"]],
    spots: 3,
    taken: 0,
  },
  {
    id: "yarraville",
    kind: "single_dwelling",
    title: "New home, Yarraville",
    where: "Yarraville, VIC",
    budget: "$1m to $1.5m",
    specs: [["3", "beds"], ["2", "baths"], ["1", "storey"]],
    spots: 3,
    taken: 1,
  },
];

function BrowseScreen({
  picked,
  filtered,
  hot,
}: {
  picked: boolean;
  filtered: boolean;
  hot: string | null;
}) {
  const rows = filtered ? FILTERED : ALL;

  return (
    <>
      <div className="shrink-0">
        <Kicker icon={Compass}>Browse</Kicker>
        <p
          className="mt-1.5 font-ui font-semibold uppercase text-[18px] sm:text-[21px] leading-[0.95] tracking-[-0.018em]"
          style={{ color: C.ink }}
        >
          Open tender rounds
        </p>
        <p className="mt-1.5 text-[9.5px] sm:text-[10px] leading-[1.5] truncate" style={{ color: C.muted }}>
          {filtered
            ? "3 projects live across Australia. 3 more running privately. 1 filter applied."
            : "12 projects live across Australia. 3 more running privately."}
        </p>
      </div>

      <FilterBar picked={picked} hot={hot} />

      <div className={LIST}>
        {/* The re-query genuinely replaces the result set, so the rows
            are keyed on it and re-settle rather than morph. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={filtered ? "filtered" : "all"}
            className="flex flex-col gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {rows.map((d, i) => (
              <motion.div
                key={d.id}
                initial={filtered ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: Math.min(i * 0.07, 0.24), ease: EASE }}
              >
                <DocketRow
                  d={d}
                  cursorKey={filtered && i === 0 ? "row" : undefined}
                  hot={filtered && i === 0 && hot === "row"}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
        <ListFade />
      </div>
    </>
  );
}

/** The GET form. Choosing a type does nothing until Apply is pressed,
 *  which is why the pointer presses both. */
function FilterBar({ picked, hot }: { picked: boolean; hot: string | null }) {
  return (
    <div
      className="shrink-0 grid items-center gap-2 border-y py-2.5"
      style={{
        borderColor: C.line,
        gridTemplateColumns: "minmax(0,1.4fr) minmax(0,120px) auto",
      }}
    >
      <span
        className="flex items-center h-7 px-2 rounded-[3px] border text-[10px] truncate"
        style={{ borderColor: C.line2, background: C.paper, color: C.faint }}
      >
        Search by title
      </span>

      <span
        data-cursor="type"
        className="flex items-center justify-between gap-1 h-7 px-2 rounded-[3px] border text-[10px] transition-colors duration-200"
        style={{
          borderColor: picked || hot === "type" ? C.tealLine : C.line2,
          background: picked ? C.tealWash : C.paper,
          color: picked ? C.tealInk : C.muted,
        }}
      >
        <span className="truncate">{picked ? "Single dwelling" : "Any type"}</span>
        <ChevronDown className="size-3 shrink-0" strokeWidth={2.2} />
      </span>

      <span
        data-cursor="apply"
        className="inline-flex items-center justify-center h-8 px-4 rounded-md text-[10.5px] font-semibold tracking-[0.04em]"
        style={{
          background: C.teal,
          color: C.onTeal,
          boxShadow: hot === "apply" ? `0 0 0 3px ${C.tealMuted}` : `0 0 0 1px ${C.tealLine}`,
        }}
      >
        Apply
      </span>
    </div>
  );
}

/** The beds/baths/storeys chips, shared by the docket body (from `sm`
 *  up) and the phone's state strip, so the two renders cannot drift. */
function SpecChips({ specs }: { specs: Array<[string, string]> }) {
  return (
    <>
      {specs.map(([v, l]) => (
        <span
          key={l}
          className="inline-flex items-center gap-1 h-[18px] px-1.5 rounded-md border whitespace-nowrap"
          style={{ borderColor: C.line, background: C.wash }}
        >
          <span className="font-ui font-semibold text-[9px] leading-none tabular-nums" style={{ color: C.ink }}>
            {v}
          </span>
          <span className="text-[6.5px] tracking-[0.12em] uppercase" style={{ color: C.dim }}>
            {l}
          </span>
        </span>
      ))}
    </>
  );
}

/** One docket: the type-set tinted band with the budget, the body, and
 *  the state rail. Hovering it lights the whole row and the open-in
 *  arrow arrives, because the row is a link.
 *
 *  On the phone the three-column row cannot hold 303px — the title fell
 *  to ten characters and the chips clipped mid-glyph — so the row
 *  restacks: band + title + suburb on one line, then the chips, the
 *  spots and the fee on a strip beneath. The spots and the fee are the
 *  act's point, so they are never the thing that yields. From `sm` up
 *  the wrapper is display:contents and the row renders exactly as it
 *  always has. */
function DocketRow({ d, cursorKey, hot }: { d: Docket; cursorKey?: string; hot?: boolean }) {
  const meta = TYPE_META[d.kind];
  const left = Math.max(0, d.spots - d.taken);

  return (
    <div
      data-cursor={cursorKey}
      className="flex max-sm:flex-col rounded-xl border overflow-hidden transition-colors duration-200"
      style={{
        borderColor: hot ? C.tealLine : C.line,
        background: hot ? C.tealWash : C.paper,
        boxShadow: ELEV,
      }}
    >
      <div className="flex min-w-0 sm:contents">
      {/* the band — the type set on its paper */}
      <div
        className="relative shrink-0 w-[82px] sm:w-[100px] border-r overflow-hidden"
        style={{ borderColor: C.line }}
      >
        <span aria-hidden className="absolute inset-0" style={{ background: TINT[d.kind] }} />
        {/* the drafting-sheet grid, at scene pitch */}
        <span
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, ${alpha(C.ink, 0.045)} 0 1px, transparent 1px 12px), repeating-linear-gradient(90deg, ${alpha(C.ink, 0.045)} 0 1px, transparent 1px 12px)`,
          }}
        />
        {/* the type, oversized and fading off the sheet */}
        <meta.Icon
          aria-hidden
          strokeWidth={0.9}
          className="absolute -bottom-2 -right-1.5 size-[42px] opacity-[0.06] rotate-[-6deg]"
          style={{ color: C.ink }}
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[38px]"
          style={{
            background: `linear-gradient(to top, ${alpha(C.paper, 0.94)} 40%, ${alpha(C.paper, 0.5)}, transparent)`,
          }}
        />
        <span
          className="absolute top-1 left-1 inline-flex items-center gap-[3px] px-[3px] py-[1px] rounded-[3px] border text-[6px] sm:text-[6.5px] tracking-[0.06em] uppercase font-semibold whitespace-nowrap"
          style={{ borderColor: C.line, background: alpha(C.paper, 0.8), color: C.ink }}
        >
          <meta.Icon className="size-[8px]" style={{ color: C.tealInk }} strokeWidth={2.2} />
          {meta.label}
        </span>
        <div className="absolute left-1.5 bottom-1">
          <p className="text-[6px] tracking-[0.16em] uppercase font-semibold" style={{ color: C.muted }}>
            Project budget
          </p>
          <p
            className="mt-[1px] font-ui font-semibold text-[10px] leading-none tracking-[-0.01em] tabular-nums"
            style={{ color: C.ink }}
          >
            {d.budget}
          </p>
        </div>
      </div>

      {/* the body — title, locality, the specification */}
      <div className="min-w-0 flex-1 px-2.5 py-2 flex flex-col justify-center gap-1">
        <p
          className="font-ui font-semibold text-[10.5px] sm:text-[11.5px] leading-[1.3] truncate"
          style={{ color: C.ink }}
        >
          {d.title}
        </p>
        <p className="flex items-center gap-1 text-[9px] min-w-0" style={{ color: C.muted }}>
          <MapPin className="size-[10px] shrink-0" style={{ color: C.dim }} />
          <span className="truncate">{d.where}</span>
        </p>
        {/* On the phone the chips live on the state strip below. */}
        <div className="max-sm:hidden flex items-center gap-1 overflow-hidden">
          <SpecChips specs={d.specs} />
        </div>
        {d.pack ? (
          // The film's only act-one push lands here, so the strip
          // carries its own key even though the pointer never visits it.
          // On the phone the strip wraps to two lines rather than
          // truncating the pitch to its first clause.
          <p data-cursor="pack" className="flex items-center gap-1 text-[8.5px] min-w-0" style={{ color: C.tealInk }}>
            <BookOpenCheck className="size-[10px] shrink-0" />
            <span className="truncate max-sm:whitespace-normal">{d.pack}</span>
          </p>
        ) : null}
      </div>
      </div>

      {/* the state rail — the dots first, the fee after. On the phone
          it is a full-width strip under the row: the chips take the
          first line, the spots and the fee share the second. */}
      <div
        className="shrink-0 w-[86px] sm:w-[102px] border-l px-1.5 py-2 overflow-hidden flex flex-col items-end justify-center gap-1 max-sm:w-full max-sm:border-l-0 max-sm:border-t max-sm:px-2.5 max-sm:py-1.5 max-sm:flex-row max-sm:flex-wrap max-sm:items-center max-sm:justify-between max-sm:gap-x-2 max-sm:gap-y-1"
        style={{ borderColor: C.line }}
      >
        <span className="sm:hidden flex w-full items-center gap-1">
          <SpecChips specs={d.specs} />
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="inline-flex items-center gap-[2px]">
            {Array.from({ length: d.spots }).map((_, i) => (
              <span
                key={i}
                className="size-[4px] rounded-full"
                style={
                  i < d.taken
                    ? { background: C.teal, boxShadow: `0 0 6px ${C.tealLine}` }
                    : { background: C.faint, opacity: 0.35 }
                }
              />
            ))}
          </span>
          <span className="text-[8px] tabular-nums whitespace-nowrap" style={{ color: C.muted }}>
            {left} of {d.spots} spots open
          </span>
        </span>
        <span className="text-[8px] tabular-nums" style={{ color: C.dim }}>
          ${PRICE[d.kind]} to enter
        </span>
        {/* The hover tell stands down on the phone strip — the row's
            teal wash already carries the hover, and a fourth item
            would crowd the fee off the line. */}
        <motion.span
          className="max-sm:hidden inline-flex items-center gap-1 text-[8px] font-semibold"
          style={{ color: C.tealInk }}
          initial={false}
          animate={{ opacity: hot ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          Open the project
          <ArrowUpRight className="size-[10px]" strokeWidth={2.4} />
        </motion.span>
      </div>
    </div>
  );
}

/* ══ 2 · The project ════════════════════════════════════════════════ */

/** The fact sheet, read with the street address on it. */
const FACTS: Array<[string, string]> = [
  ["Type", "Single dwelling"],
  ["Storeys", "3"],
  ["Bedrooms", "4"],
  ["Bathrooms", "4"],
  ["Land size", "600 to 800 m²"],
  ["Budget", "$1.5m to $2m"],
];

/**
 * The register, in the order a builder reads a document set, with the
 * real filenames. Nine on this round, which is why the pointer scrolls
 * it twice rather than pretending three is the set.
 */
const DOCS: Array<[string, string, string]> = [
  ["Architectural plans", "Architectural Drawings Rev D.pdf", "8.4 MB"],
  ["Architectural plans", "Site Plan and Setout Rev D.pdf", "2.2 MB"],
  ["Structural engineering", "Structural Drawings Rev C.pdf", "5.7 MB"],
  ["Civil engineering", "Civil and Stormwater Design.pdf", "3.1 MB"],
  ["Project specifications", "Specification and Finishes Schedule.pdf", "1.6 MB"],
  ["Land report", "Feature and Level Survey.pdf", "0.9 MB"],
  ["Soil report", "Geotechnical Site Investigation.pdf", "1.1 MB"],
  ["Energy efficiency", "NatHERS Assessment and Stamped Plans.pdf", "2.8 MB"],
  ["Town planning", "Planning Permit and Endorsed Plans.pdf", "4.3 MB"],
];

function ProjectScreen({
  sec,
  docY,
  hot,
}: {
  sec: string;
  docY: number;
  hot: string | null;
}) {
  return (
    <>
      <div className="shrink-0">
        <span
          className="inline-flex items-center gap-1.5 text-[8.5px] tracking-[0.22em] uppercase font-semibold"
          style={{ color: C.tealInk }}
        >
          <Unlock className="size-[10px]" />
          You hold a spot
        </span>
        <p
          className="mt-1 font-ui font-semibold uppercase text-[16px] sm:text-[19px] leading-[0.95] tracking-[-0.018em] truncate"
          style={{ color: C.ink }}
        >
          {PROJECT}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[9.5px] sm:text-[10px] min-w-0" style={{ color: C.muted }}>
          <MapPin className="size-3 shrink-0" style={{ color: C.tealInk }} />
          <span className="truncate font-ui font-medium" style={{ color: C.ink }}>
            18 Miller Street, Pascoe Vale VIC 3044
          </span>
        </p>
      </div>

      <SectionRail active={sec} hot={hot} />

      {/* On a phone the register is worth more than the fact sheet, and
          there is only room for one of them. */}
      <Ruled label="Key details" icon={Home} className="hidden sm:block">
        <div className="grid grid-cols-3 gap-x-3 gap-y-2">
          {FACTS.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <p className="text-[7.5px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>
                {k}
              </p>
              <p className="mt-0.5 font-ui font-semibold text-[10.5px] sm:text-[11px] leading-tight truncate" style={{ color: C.ink }}>
                {v}
              </p>
            </div>
          ))}
        </div>
      </Ruled>

      <div className="flex-1 min-h-[114px] sm:min-h-0 flex flex-col">
        <RuleLine label="Documents · 9" icon={FileText} />
        <div className={LIST}>
          <motion.div
            className="flex flex-col gap-1.5 pt-2"
            initial={false}
            animate={{ y: docY }}
            transition={docY === 0 ? { duration: 0 } : SCROLL}
          >
            {DOCS.map(([cat, name, size], i) => (
              <div key={name}>
                <p className="text-[7.5px] tracking-[0.18em] uppercase mb-1" style={{ color: C.dim }}>
                  {cat}
                </p>
                <div
                  data-cursor={i === 0 ? "doc-1" : undefined}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm border transition-colors duration-200"
                  style={{
                    borderColor: i === 0 && hot === "doc-1" ? C.tealLine : C.line,
                    background: i === 0 && hot === "doc-1" ? C.tealWash : C.wash,
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium truncate" style={{ color: C.ink }}>
                      {name}
                    </p>
                    <p className="text-[8px]" style={{ color: C.dim }}>
                      {size}
                    </p>
                  </div>
                  <span
                    className="shrink-0 inline-flex items-center justify-center size-5 rounded-sm border"
                    style={{ borderColor: C.line, color: C.muted }}
                  >
                    <Download className="size-2.5" />
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
          <ListFade />
        </div>
      </div>

      <BarSpacer />
    </>
  );
}

/* ══ 3 · The scope ══════════════════════════════════════════════════ */

/**
 * Fourteen of the round's twenty nine divisions, the same set the
 * owner's register scene shows, because it is the same register seen
 * from the other side. Enough that the list reads as the real 228-item
 * document rather than a sample of three, and enough that the scroll
 * has somewhere real to go. Footings is the one the builder opens here
 * and prices in the next act.
 */
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
  { key: "plumbing", label: "Plumbing and drainage", count: "15 items" },
  { key: "electrical", label: "Electrical, data and lighting", count: "13 items" },
  { key: "joinery", label: "Joinery and cabinetry", count: "11 items" },
];

/** The three lines behind the footings division — the same three the
 *  deck's schedule walks in act four, because the scope a builder
 *  reads is exactly the scope they price. */
const FOOTINGS_LINES: Array<{ label: string; plain: string; cite: string }> = [
  {
    label: "Waffle pod slab",
    plain:
      "A concrete slab poured over foam pods that sits on top of the ground, the most common modern house slab.",
    cite: "Structural S02, page 4, Rev B",
  },
  {
    label: "Piers and screw piles",
    plain:
      "Deep supports drilled or screwed down to solid ground where the surface soil cannot carry the home.",
    cite: "Geotechnical Report, page 11",
  },
  {
    label: "Termite management system",
    plain:
      "The barrier or treatment that protects the home from termites, required and certified under the code.",
    cite: "Specification A1.2, page 9, Rev C",
  },
];

/**
 * The script's scope offsets are desktop pixels, re-derived for the
 * portrait phone stage. The arithmetic:
 *
 *   Desktop viewport ≈ 444 content − rail 19 − rule 13 − stats 64 −
 *   spacer 44 − four gaps 40 ≈ 264, and −490 lands the register flush
 *   at the foot, so the rendered register ≈ 264 + 490 ≈ 754 tall.
 *
 *   At 303px each of footings' three plain sentences wraps one line
 *   taller (collapsed rows truncate, so only the open panel grows):
 *   register ≈ 754 + 3·15 ≈ 799. The phone viewport ≈ 340 content −
 *   rail 19 − rule 13 − stats 62 − spacer 28 − gaps 40 ≈ 178.
 *
 *   Flush foot: −(799 − 178) ≈ −620. The mid-read −320 sits 65% of the
 *   way down on desktop (320/490), so 0.65 · 620 ≈ −400. The first stop
 *   −150 holds: the four collapsed rows above footings keep their
 *   height at 303px, so the opened division tops the frame unchanged.
 */
const SCOPE_Y_COMPACT: Record<number, number> = {
  [-320]: -400,
  [-490]: -620,
};

function ScopeScreen({
  sec,
  y,
  open,
  cite,
  hot,
}: {
  sec: string;
  y: number;
  open: string | null;
  cite: boolean;
  hot: string | null;
}) {
  const compact = useCompact();
  const yy = compact ? (SCOPE_Y_COMPACT[y] ?? y) : y;
  return (
    <>
      <SectionRail active={sec} hot={hot} />

      <RuleLine label="Scope of works" icon={BookOpenCheck} />

      {/* The stats band on the real page: no boxes, centred figures over
          quiet labels, ruled above and below. */}
      <div className="shrink-0 grid grid-cols-3 border-y py-3" style={{ borderColor: C.line }}>
        {[
          ["Scope items", 242],
          ["Trades", 29],
          ["Pages read", 211],
        ].map(([l, v], i) => (
          <div
            key={l as string}
            className="px-2 text-center min-w-0"
            style={i === 0 ? undefined : { borderLeft: `1px solid ${C.line}` }}
          >
            <p
              className="font-ui font-semibold text-[20px] sm:text-[26px] leading-none tabular-nums"
              style={{ color: C.ink }}
            >
              {i === 0 ? <CountUp to={v as number} /> : (v as number)}
            </p>
            <p className="mt-1.5 text-[7.5px] tracking-[0.18em] uppercase font-semibold" style={{ color: C.dim }}>
              {l as string}
            </p>
          </div>
        ))}
      </div>

      {/* The register at its real length, clipped and scrolled the way
          the owner's scene scrolls it: the length of this list is the
          screen's whole argument. */}
      <div className={LIST}>
        <motion.div
          className="flex flex-col gap-1.5"
          initial={false}
          animate={{ y: yy }}
          transition={yy === 0 ? { duration: 0 } : SCROLL}
        >
          {DIVISIONS.map((d) => (
            <Division
              key={d.key}
              label={d.label}
              count={d.count}
              cursorKey={d.key === "footings" ? "div-footings" : undefined}
              hot={d.key === "footings" && hot === "div-footings"}
              open={open === d.key}
            >
              {d.key === "footings"
                ? FOOTINGS_LINES.map((l, i) => (
                    <ScopeLine
                      key={l.label}
                      label={l.label}
                      plain={l.plain}
                      cite={l.cite}
                      citeKey={i === 0 ? "cite-footings" : undefined}
                      citeHot={i === 0 && cite}
                    />
                  ))
                : null}
            </Division>
          ))}
        </motion.div>
        <ListFade />
      </div>

      <BarSpacer />
    </>
  );
}

/**
 * The headline figure, counted rather than printed. A number that lands
 * already finished reads as a graphic; one that arrives reads as a
 * result. Ease out cubic, so it decelerates onto the real total.
 */
function CountUp({ to }: { to: number }) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const started = performance.now();
    const dur = 820;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return <>{n}</>;
}

/* ══ 4 · Your tender ════════════════════════════════════════════════ */

/** The deck counts questions, not lines: 53 required across all twelve
 *  modules, so the counter and the 3px track can never drift apart. */
const REQUIRED = 53;

/** The four marks, in the deck's order. Excluded burns rust and N/A
 *  goes to ink; only the first two take the teal fill. */
const MARKS: Array<{ key: string; label: string; tone: ToneKey }> = [
  { key: "included", label: "Included", tone: "good" },
  { key: "allowance", label: "Provisional sum", tone: "good" },
  { key: "excluded", label: "Excluded", tone: "risk" },
  { key: "na", label: "N/A", tone: "ink" },
];

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

function TenderScreen({
  y,
  marked,
  answered,
  hot,
}: {
  y: number;
  marked: readonly string[];
  answered: number;
  hot: string | null;
}) {
  const compact = useCompact();
  /* The script's −126 is a desktop pixel. The arithmetic: the three
   * line cards measure ≈ 126 + 140 + 126 + two gaps 16 ≈ 408 on every
   * stage — the plain sentences cap at max-w-[56ch] ≈ 250px, narrower
   * than the phone's 277px measure, so nothing rewraps. The desktop
   * viewport ≈ 444 − header 26 − heading 61 − spacer 44 − gaps 30 ≈
   * 283, and −126 lands the register flush (126 + 283 ≈ 408). The
   * phone viewport ≈ 340 − header 26 − heading 37 − spacer 28 − gaps
   * 30 ≈ 219, so flush is −(408 − 219) ≈ −190. */
  const yy = compact && y !== 0 ? -190 : y;
  return (
    <>
      <div className="shrink-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0 overflow-hidden whitespace-nowrap">
            <Kicker>Module 5 of 12 · What&rsquo;s included</Kicker>
          </div>
          <p className="shrink-0 text-[10px] tabular-nums" style={{ color: C.dim }}>
            <span className="font-medium" style={{ color: C.ink }}>
              {answered}
            </span>
            /{REQUIRED}
          </p>
        </div>
        <div className="mt-2">
          <Track pct={Math.round((answered / REQUIRED) * 100)} />
        </div>
      </div>

      <div className="shrink-0">
        <p className="text-[8.5px] tracking-[0.18em] uppercase font-semibold tabular-nums" style={{ color: C.dim }}>
          <span style={{ color: C.tealInk }}>5.1</span> · The tender schedule · 4 of 9
        </p>
        <h2
          className="mt-1.5 font-ui font-semibold tracking-[-0.02em] text-[14px] sm:text-[17px] leading-[1.25]"
          style={{ color: C.ink }}
        >
          Footings and ground floor structure
        </h2>
        <p className="hidden sm:block mt-1.5 text-[10px] leading-[1.55] max-w-[58ch]" style={{ color: C.muted }}>
          3 lines from the client&rsquo;s documents. Mark what your price does with each one.
        </p>
      </div>

      <div className={LIST}>
        <motion.div
          className="flex flex-col gap-2"
          initial={false}
          animate={{ y: yy }}
          transition={yy === 0 ? { duration: 0 } : SCROLL}
        >
          {LINES.map((line) => {
            const on = marked.includes(line.id);
            return (
              <Card
                key={line.id}
                tone={on ? "accent" : "plain"}
                // The card is the signature push's camera target: the
                // 1.3 lean frames the whole line and all four marks.
                cursorKey={`line-${line.id}`}
                className="px-3 py-3 transition-[background-color,border-color,box-shadow] duration-300"
              >
                <p className="text-[11px] sm:text-[11.5px] font-ui font-semibold leading-[1.35]" style={{ color: C.ink }}>
                  {line.label}
                </p>
                <p className="mt-1.5 text-[9.5px] leading-[1.5] max-w-[56ch]" style={{ color: C.muted }}>
                  {line.plain}
                </p>
                <p className="mt-1.5 text-[8.5px] truncate" style={{ color: C.dim }}>
                  {line.cite}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {MARKS.map((m) => (
                    <Mark
                      key={m.key}
                      label={m.label}
                      tone={m.tone}
                      on={on && m.key === "included"}
                      cursorKey={m.key === "included" ? `${line.id}-included` : undefined}
                      hot={hot === `${line.id}-${m.key}`}
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </motion.div>
        <ListFade />
      </div>

      <BarSpacer />
    </>
  );
}

/* ══ 5 · Submit ═════════════════════════════════════════════════════ */

/**
 * The twelve modules of the deck, in the order the ledger prints them.
 * Documents is spliced in before sign-off, which is why the questions
 * run 01 to 10 and then 12.
 */
const MODULES: Array<[string, string, string]> = [
  ["01", "Eligibility", "9/9"],
  ["02", "Project understanding", "4/4"],
  ["03", "Company credentials", "13/13"],
  ["04", "Commercial submission", "17/17"],
  ["05", "What’s included", "8/8"],
  ["06", "What’s not included", "3/3"],
  ["07", "Provisional sums and prime costs", "7/7"],
  ["08", "Programme", "8/8"],
  ["09", "Delivery", "7/7"],
  ["10", "Builder commentary", "4/4"],
  ["11", "Additional documents", "2 attached"],
  ["12", "Sign-off", "5/5"],
];

function SubmitScreen({ confirm, hot }: { confirm: boolean; hot: string | null }) {
  return (
    <>
      {/* Every measure of air on this screen is added at `sm` and again
          at `lg`, which are the two heights the frame takes from 640px
          up (476 and 528). Below `sm` the portrait stage gives the
          stack ~340px whole: the cover, the ledger under its fade and
          both submit presses all sit inside it, so the phone keeps the
          tightest spacing tier. */}
      <div className="shrink-0">
        <Track pct={100} />
        <div className="mt-1.5 lg:mt-2">
          <Kicker>Review and submit</Kicker>
        </div>
        <p
          className="hidden sm:block mt-1 lg:mt-2 text-[13px] lg:text-[14px] font-ui font-semibold leading-tight lg:leading-[1.3] tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
          Your tender is ready. It reads well.
        </p>
      </div>

      {/* The cover is the document object, not a section. The app prints
          it on white; the kit has no white, so it is the paper with the
          2px ink rule and a lift, which is what makes it read as a page
          rather than another card. It is given the margins a printed
          cover has: the rule sits clear of the masthead, the project and
          the price sit clear of the rule, and from `sm` up the smallest
          type on it is 7px rather than 6.5, because a cover that has to
          be squinted at is not one you would be proud to send. */}
      <div
        className="shrink-0 rounded-[4px] px-3 py-2 sm:px-3.5 sm:py-2.5 lg:px-4 lg:py-3.5"
        style={{ background: C.paper, boxShadow: ELEV }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-ui font-bold text-[10px] lg:text-[11px] tracking-[-0.01em]" style={{ color: C.ink }}>
            BuilderHQ
          </span>
          <span
            className="text-[6.5px] sm:text-[7px] uppercase font-semibold tracking-[0.28em]"
            style={{ color: C.dim }}
          >
            Tender submission
          </span>
        </div>
        <div className="mt-1 sm:mt-1.5 lg:mt-2 h-[2px]" style={{ background: TONE.ink.text }} />
        <div className="mt-2 sm:mt-2.5 lg:mt-3.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <p
              className="font-ui text-[11.5px] sm:text-[12px] lg:text-[13px] leading-[1.15] truncate"
              style={{ color: C.ink }}
            >
              {PROJECT}
            </p>
            <p
              className="hidden sm:block mt-0.5 lg:mt-1 text-[8.5px] lg:text-[9px] leading-tight truncate"
              style={{ color: C.muted }}
            >
              {US}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className="text-[6.5px] sm:text-[7px] leading-tight uppercase font-semibold tracking-[0.18em]"
              style={{ color: C.dim }}
            >
              Price ex GST
            </p>
            <p
              className="font-ui font-semibold text-[14px] sm:text-[15px] lg:text-[17px] leading-none tabular-nums"
              style={{ color: C.ink }}
            >
              $685,000
            </p>
            <p
              className="hidden sm:block mt-0.5 lg:mt-1 text-[8.5px] lg:text-[9px] leading-tight tabular-nums"
              style={{ color: C.muted }}
            >
              $753,500 inc GST
            </p>
          </div>
        </div>
      </div>

      {/* The contents of the submission.
          Twelve rows at 19px filled the hole to the last pixel and were
          cut mid-row at the foot, which is most of why the screen read
          as a form. The rows now carry the height that makes them
          legible and the register runs on under the fade instead, the
          same way the document register and the scope register do
          earlier in this film. Five modules read clean and the sixth is
          going; the fade is the honest signal that there are twelve.
          The phone gets the same treatment: the portrait stage leaves
          the ledger ~137px after the cover and the submit block take
          theirs, which is five clean rows and the fade — the register
          IS the act's proof that everything was answered, so it plays
          on every stage. */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="border-t" style={{ borderColor: C.line }}>
          {MODULES.map(([n, title, count]) => (
            <div
              key={n}
              className="flex items-center gap-2 lg:gap-2.5 py-[4px] lg:py-[5px] border-b"
              style={{ borderColor: C.line }}
            >
              <span
                className="w-3.5 shrink-0 font-mono text-[8px] lg:text-[8.5px] tabular-nums"
                style={{ color: C.dim }}
              >
                {n}
              </span>
              <span
                className="min-w-0 shrink truncate text-[9.5px] lg:text-[10px] leading-tight"
                style={{ color: C.ink }}
              >
                {title}
              </span>
              <span
                aria-hidden
                className="flex-1 min-w-[10px] border-b border-dotted translate-y-[3px]"
                style={{ borderColor: C.line2 }}
              />
              <span className="shrink-0 text-[8.5px] lg:text-[9px] tabular-nums" style={{ color: C.dim }}>
                {count}
              </span>
              <span
                className="size-[12px] lg:size-[13px] shrink-0 rounded-full inline-flex items-center justify-center"
                style={{ background: C.teal, color: C.onTeal }}
              >
                <Check className="size-[8px]" strokeWidth={3.5} />
              </span>
            </div>
          ))}
        </div>
        <ListFade />
      </div>

      {/* The two-step submit, inline where the app puts it. The block
          holds one height for both states, so the ledger above it never
          reflows while the controls change. On the phone the sealing
          sentence runs three lines at 303px (it caps near 250px wide
          from `sm` up), so the block carries the extra line's height:
          3·13 + gap 6 + button 32 ≈ 77. */}
      <div
        className="shrink-0 mt-1 sm:mt-auto relative border-t h-[78px] sm:h-[72px]"
        style={{ borderColor: C.line }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {confirm ? (
            <motion.div
              key="confirm"
              className="absolute inset-0 flex flex-col justify-center gap-1.5"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              <p
                className="text-[9px] sm:text-[9.5px] leading-[1.45] lg:leading-[1.6] line-clamp-2 max-sm:line-clamp-3 max-w-[56ch]"
                style={{ color: C.ink }}
              >
                Submitting seals your tender for this round. The owner receives it exactly as this
                review reads, and it can only change by withdrawing.
              </p>
              <div className="flex items-center gap-3">
                <Press k="submit-confirm" hot={hot === "submit-confirm"}>
                  <TealBtn>
                    Submit tender
                    <ArrowRight className="size-3" />
                  </TealBtn>
                </Press>
                <span className="text-[9.5px]" style={{ color: C.muted }}>
                  Keep editing
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cta"
              className="absolute inset-0 flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              <Press k="submit" hot={hot === "submit"}>
                <TealBtn>
                  Submit tender
                  <ArrowRight className="size-3" />
                </TealBtn>
              </Press>
              <span className="text-[9.5px]" style={{ color: C.dim }}>
                Save and exit
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ══ 6 · Won ════════════════════════════════════════════════════════ */

function WonScreen({ hot }: { hot: string | null }) {
  return (
    <>
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <Kicker>Tender</Kicker>
          <Pill>
            <Sparkles className="size-2.5" />
            Awarded
          </Pill>
        </div>
        <p
          className="mt-2 font-ui font-semibold uppercase text-[17px] sm:text-[20px] leading-[0.95] tracking-[-0.018em] truncate"
          style={{ color: C.ink }}
        >
          {PROJECT}
        </p>
        <p className="mt-1.5 text-[10px] tabular-nums truncate" style={{ color: C.muted }}>
          {US} · $753,500 inc GST
        </p>
        <p className="mt-2.5 text-[10px] sm:text-[10.5px] leading-[1.6] max-w-[54ch]" style={{ color: C.muted }}>
          The owner went with you. Well earned. Reach out, agree the contract, and take it from
          here.
        </p>
      </div>

      {/* On every stage now: "no commission" is the reason this act
          exists, and the whole screen sums ≈246px against the phone's
          340 — header ≈96, this block ≈98, the PDF row 32, two gaps. */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="border-y py-3" style={{ borderColor: C.tealLine }}>
          <p className="text-[8.5px] tracking-[0.16em] uppercase font-semibold" style={{ color: C.tealInk }}>
            Your client
          </p>
          <p className="mt-1.5 text-[10px] sm:text-[10.5px] leading-[1.6] max-w-[54ch]" style={{ color: C.ink }}>
            Agree the contract and insurances directly. Your conversation stays in Messages.
          </p>
          <p
            className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold"
            style={{ color: C.tealInk }}
          >
            <Check className="size-3 shrink-0" strokeWidth={3} />
            No commission on what you win
          </p>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <Press k="pdf" hot={hot === "pdf"}>
          <TealBtn>
            <Download className="size-3" />
            Tender document (PDF)
          </TealBtn>
        </Press>
        <span className="text-[9.5px] truncate" style={{ color: C.dim }}>
          Sealed and verifiable. Send it anywhere.
        </span>
      </div>
    </>
  );
}
