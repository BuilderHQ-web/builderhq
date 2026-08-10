"use client";

/**
 * Architect / practice · step two — the list is written, the practice
 * decides who prices it.
 *
 * Wizard step 4 at /architect/projects/[slug]/edit, which is the one
 * screen where both architect-only moves live: the Open / Private
 * choice and the invitations manager. The cascade the pointer sets off
 * is the product's own, not a landing-page flourish — one click swaps
 * the selected card's skin, rewrites the three lines under it,
 * unmounts the spot count and lifts the invitations into its place.
 *
 * There is no third mode. Hybrid was retired because it was never one:
 * inviting a builder you trust and leaving the remaining spots to the
 * network is an open round with invites, which is exactly what the
 * closing beat leaves on screen.
 *
 * The card beside this scene argues both halves of the step, so the
 * head states the list as settled fact and the animation spends itself
 * on the choice. The register itself belongs to the scope scene.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpenCheck,
  Check,
  Globe2,
  Link2,
  Lock,
  Mail,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, ELEV, Frame, GhostBtn, Kicker, ListFade } from "./kit";

type Mode = "open" | "private";
type S = {
  mode: Mode;
  /** Pointer resting on a mode button: the app only darkens the border. */
  hot: Mode | null;
  panel: "none" | "directory";
  invited: number;
  /** Whether the column is scrolled to its foot, where the invites live. */
  follow: boolean;
};

/** An open round of three spots with one builder already invited: a
 *  finished screen, and the state the reduced-motion visitor gets. */
const RESTING: S = { mode: "open", hot: null, panel: "none", invited: 1, follow: false };

const SPOTS = 3;

/** The two options, worded as tender-round-step.tsx words them. */
const MODES: Array<{ id: Mode; title: string; sub: string; icon: LucideIcon }> = [
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

/** What happens next, per mode. The middle line is the one that does
 *  not change, which is the point of the step. */
const FLOW: Record<Mode, string[]> = {
  open: [
    "Your project goes live to verified builders on BuilderHQ, and any builders you invite join free.",
    "Builders take a spot and price from your documents.",
    "You compare every submission side by side.",
  ],
  private: [
    "You invite the builders you want pricing this project.",
    "Each builder joins through their own link, at no cost to them.",
    "You compare every submission side by side.",
  ],
};

/** Invite rows are sparse in the product: a name and one detail line,
 *  which for a builder already on BuilderHQ is that literal phrase. No
 *  licence, no suburb, no years — those belong to the directory row. */
const INVITED: Array<{ name: string; detail: string }> = [
  { name: "Meridian Building Co", detail: "BuilderHQ builder" },
  { name: "Brightwater Homes", detail: "BuilderHQ builder" },
];

const DIRECTORY: Array<{ name: string; detail: string }> = [
  { name: "Brightwater Homes", detail: "Ivanhoe, VIC · 22 yrs" },
  { name: "Corten Build Co.", detail: "Melbourne, VIC · 6 yrs" },
];

/** A private round has no denominator: the invite list is the round. */
function countTail(mode: Mode, n: number): string {
  if (mode === "open") return `invited · ${SPOTS} spots in the round`;
  return n === 1 ? "builder invited · they are the round" : "builders invited · they are the round";
}

export function ArchitectRoundSetupScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);
  const view = React.useRef<HTMLDivElement>(null);
  const column = React.useRef<HTMLDivElement>(null);
  const invites = React.useRef<HTMLElement>(null);

  // The step is taller than the card at every size the deck allows, so
  // the invitations have to be scrolled to. Measure the lift rather than
  // assume it: this card is 476px tall on a laptop and 714px on a
  // monitor, and one hard-coded offset would either hide the invitations
  // or leave a hole underneath them. Brings the invitations card to the
  // top of the view, and never past the foot of the step.
  const [lift, setLift] = React.useState(0);
  const measure = React.useCallback(() => {
    const v = view.current;
    const c = column.current;
    const a = invites.current;
    if (!v || !c || !a) return;
    const over = c.offsetHeight - v.clientHeight;
    const next = Math.max(0, Math.round(Math.min(over, a.offsetTop - 8)));
    setLift((p) => (p === next ? p : next));
  }, []);

  React.useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (view.current) ro.observe(view.current);
    if (column.current) ro.observe(column.current);
    return () => ro.disconnect();
  }, [measure]);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    // The two mode beats run at the top of the step, where both buttons
    // are on screen at any card height, and the invitation beat runs at
    // the foot. The pointer never reaches for a control the visitor
    // cannot see, which a single top-to-bottom pass could not promise.
    script: [
      // Beat one: the choice. One click, three regions of the screen.
      { move: "mode-private" },
      { set: { hot: "private" } },
      { wait: 240 },
      { click: true },
      { set: { mode: "private", hot: null } },
      { wait: 760 },
      // Beat two: and back, because the choice is a setting, not a
      // fork. The spot count returns with it.
      { move: "mode-open" },
      { set: { hot: "open" } },
      { wait: 200 },
      { click: true },
      { set: { mode: "open", hot: null } },
      { wait: 620 },
      // Beat three: an invited builder joins the open round, which is
      // the capability the copy beside this card is claiming.
      { set: { follow: true } },
      { wait: 640 },
      { move: "add-directory" },
      { click: true },
      { set: { panel: "directory" } },
      { wait: 620 },
      { move: "dir-invite" },
      { click: true },
      { set: { invited: 2 } },
      // The pointer leaves before the hold, so the frame the visitor
      // rests on is the round itself: open, three spots, two builders
      // invited into it.
      { wait: 700 },
      { cursor: "hide" },
      { wait: 900 },
    ],
  });

  const { mode, invited, panel } = state;

  // Every beat that changes the column's height animates it, so the
  // final height lands a few hundred milliseconds after the state does.
  // Re-measure once it has, rather than trusting the observer to have
  // caught the last frame of a collapse.
  React.useEffect(() => {
    const t = window.setTimeout(measure, 420);
    return () => window.clearTimeout(t);
  }, [measure, mode, panel, invited]);

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame
        crumb="Studio North · Pascoe Vale"
        avatar="SN"
        right={<span className="text-[9.5px]" style={{ color: C.dim }}>Autosaved</span>}
      >
        {/* The list is a settled fact by the time this step opens, so it
            gets one dim line and none of the animation. */}
        <div className="shrink-0">
          <Kicker icon={BookOpenCheck}>The tender pack</Kicker>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <p
              className="min-w-0 truncate text-[14.5px] font-ui font-semibold tracking-[-0.015em]"
              style={{ color: C.ink }}
            >
              Tender round
            </p>
            <p className="shrink-0 text-[9.5px]" style={{ color: C.dim }}>
              228 lines of work, built from your documents
            </p>
          </div>
        </div>

        <div ref={view} className="relative flex-1 min-h-0 overflow-hidden">
          <motion.div
            ref={column}
            className="flex flex-col gap-2.5"
            animate={{ y: state.follow ? -lift : 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <StepCard icon={Globe2} title="Who can tender" sub="Pick how builders come to this round.">
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => (
                  <ModeOption
                    key={m.id}
                    title={m.title}
                    sub={m.sub}
                    icon={m.icon}
                    active={mode === m.id}
                    hot={state.hot === m.id}
                    cursorKey={`mode-${m.id}`}
                  />
                ))}
              </div>

              <div
                className="mt-2.5 rounded-md border px-2.5 py-2.5"
                style={{ borderColor: C.line, background: C.wash }}
              >
                <p
                  className="text-[9px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: C.dim }}
                >
                  How this round runs
                </p>
                {/* The three lines rewrite themselves off the same click
                    as the skin above them. Keyed on the mode so the new
                    trio fades up in place: an instant swap of three
                    lines reads as a glitch rather than a consequence. */}
                <motion.ol
                  key={mode}
                  className="mt-1.5 flex flex-col gap-1.5"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                >
                  {FLOW[mode].map((line, i) => (
                    <li
                      key={line}
                      className="flex items-start gap-2 text-[9.5px] leading-[1.5]"
                      style={{ color: C.muted }}
                    >
                      <span
                        className="mt-[0.5px] size-[14px] shrink-0 rounded-full border grid place-items-center text-[8px] font-semibold"
                        style={{ borderColor: C.line2, color: C.dim }}
                      >
                        {i + 1}
                      </span>
                      {line}
                    </li>
                  ))}
                </motion.ol>
              </div>
            </StepCard>

            {/* Spots are an open-round idea. On private the whole card
                leaves the flow, which is what lifts the invitations. */}
            <AnimatePresence initial={false}>
              {mode === "open" ? (
                <motion.div
                  key="spots"
                  className="overflow-hidden shrink-0"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
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
                          className="h-8 w-11 rounded-md border grid place-items-center text-[11.5px] font-ui font-semibold tabular-nums"
                          style={
                            n === SPOTS
                              ? { borderColor: C.tealLine, background: C.tealWash, color: C.ink }
                              : { borderColor: C.line, background: C.wash, color: C.muted }
                          }
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[9.5px] leading-[1.5]" style={{ color: C.dim }}>
                      Three is the sweet spot for most projects: real competition without wasting
                      builders’ time. Builders you invite count towards these spots.
                    </p>
                  </StepCard>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <StepCard
              anchorRef={invites}
              icon={Mail}
              title="Invited builders"
              sub={
                <Rewrite k={mode}>
                  {mode === "private"
                    ? "Only these builders can price the project. They join free."
                    : "These builders join free. Remaining spots open to the network."}
                </Rewrite>
              }
            >
              <p className="mb-2.5 text-[10px]" style={{ color: C.muted }}>
                <span className="font-ui font-semibold tabular-nums" style={{ color: C.ink }}>
                  {invited}
                </span>{" "}
                <Rewrite k={`${mode}-${invited}`}>{countTail(mode, invited)}</Rewrite>
              </p>

              <ul className="flex flex-col gap-1.5">
                <AnimatePresence initial={false}>
                  {INVITED.slice(0, invited).map((b) => (
                    <motion.li
                      key={b.name}
                      className="overflow-hidden"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <InviteRow name={b.name} detail={b.detail} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <GhostBtn cursorKey="add-directory" hot={state.panel === "directory"}>
                  <Search className="size-3" strokeWidth={2.2} />
                  From the directory
                </GhostBtn>
                <GhostBtn>
                  <Plus className="size-3" strokeWidth={2.2} />
                  Invite by email
                </GhostBtn>
              </div>

              <AnimatePresence initial={false}>
                {state.panel === "directory" ? (
                  <motion.div
                    key="directory"
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div
                      className="mt-2.5 rounded-md border p-2.5"
                      style={{ borderColor: C.line, background: C.wash }}
                    >
                      <div className="relative">
                        <Search
                          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 size-3"
                          style={{ color: C.dim }}
                        />
                        <div
                          className="h-7 rounded-md border pl-7 pr-2 flex items-center text-[10px]"
                          style={{ borderColor: C.line, background: C.paper, color: C.faint }}
                        >
                          Search approved builders by name or suburb
                        </div>
                      </div>
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {DIRECTORY.map((b, i) => (
                          <DirectoryRow
                            key={b.name}
                            name={b.name}
                            detail={b.detail}
                            invited={INVITED.slice(0, invited).some((x) => x.name === b.name)}
                            cursorKey={i === 0 ? "dir-invite" : undefined}
                          />
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </StepCard>
          </motion.div>

          <ListFade />
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/* ── the step's card shell ───────────────────────────────────────── */

/** The wizard's own card: header band with a teal glyph, then a body. */
function StepCard({
  icon: Icon,
  title,
  sub,
  children,
  anchorRef,
}: {
  icon: LucideIcon;
  title: string;
  sub: React.ReactNode;
  children: React.ReactNode;
  /** Set on the card the scroll beat brings to the top of the view. */
  anchorRef?: React.RefObject<HTMLElement | null>;
}) {
  return (
    <section
      ref={anchorRef}
      className="rounded-lg border overflow-hidden shrink-0"
      style={{ borderColor: C.line, background: C.paper, boxShadow: ELEV }}
    >
      <header
        className="flex items-start gap-2.5 px-3 py-2 border-b"
        style={{ borderColor: C.line }}
      >
        <span
          className="size-[22px] shrink-0 rounded-md border grid place-items-center"
          style={{ borderColor: C.line, background: C.wash, color: C.tealInk }}
        >
          <Icon className="size-3" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[11.5px] font-ui font-semibold leading-tight" style={{ color: C.ink }}>
            {title}
          </p>
          <p className="mt-0.5 text-[9.5px] leading-tight truncate" style={{ color: C.dim }}>
            {sub}
          </p>
        </div>
      </header>
      <div className="px-3 py-2.5">{children}</div>
    </section>
  );
}

/* ── the choice ──────────────────────────────────────────────────── */

/** One of the two options. Selected is a teal hairline and a teal wash
 *  with the check disc; hovering only darkens the border, which is all
 *  the real button does. */
function ModeOption({
  title,
  sub,
  icon: Icon,
  active,
  hot,
  cursorKey,
}: {
  title: string;
  sub: string;
  icon: LucideIcon;
  active: boolean;
  hot: boolean;
  cursorKey: string;
}) {
  return (
    <div
      data-cursor={cursorKey}
      className="rounded-md border p-2.5 transition-colors duration-200"
      style={{
        borderColor: active ? C.tealLine : hot ? C.line3 : C.line,
        background: active ? C.tealWash : C.wash,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="size-[22px] shrink-0 rounded-md border grid place-items-center transition-colors duration-200"
          style={
            active
              ? { borderColor: C.tealLine, background: C.tealMuted, color: C.tealInk }
              : { borderColor: C.line, background: "transparent", color: C.dim }
          }
        >
          <Icon className="size-3" strokeWidth={2.2} />
        </span>
        <AnimatePresence initial={false}>
          {active ? (
            <motion.span
              key="tick"
              className="size-4 shrink-0 rounded-full grid place-items-center"
              style={{ background: C.teal, color: C.onTeal }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Check className="size-2.5" strokeWidth={3.2} />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <p className="mt-2 text-[11.5px] font-ui font-semibold" style={{ color: C.ink }}>
        {title}
      </p>
      <p className="mt-0.5 text-[9px] leading-[1.5] line-clamp-2" style={{ color: C.dim }}>
        {sub}
      </p>
    </div>
  );
}

/* ── the invitations ─────────────────────────────────────────────── */

/** An invited builder. Deliberately sparse: the product shows a name,
 *  one detail line, the status and the two link controls, and nothing
 *  else — no licence, no suburb, no years in operation. */
function InviteRow({ name, detail }: { name: string; detail: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border px-2.5 py-2"
      style={{ borderColor: C.line, background: C.wash }}
    >
      <span
        className="size-[26px] shrink-0 rounded-md border grid place-items-center"
        style={{ borderColor: C.line, background: C.paper2, color: C.dim }}
      >
        <UserRound className="size-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-ui font-medium truncate" style={{ color: C.ink }}>
          {name}
        </p>
        <p className="text-[9px] truncate" style={{ color: C.dim }}>
          {detail}
        </p>
      </div>
      <span
        className="shrink-0 rounded-full border px-1.5 py-[3px] text-[8.5px] font-bold uppercase tracking-[0.08em]"
        style={{ borderColor: C.line2, color: C.dim }}
      >
        Invited
      </span>
      <span
        className="shrink-0 inline-flex items-center gap-1 h-[22px] px-2 rounded-md border text-[9px]"
        style={{ borderColor: C.line, color: C.muted }}
      >
        <Link2 className="size-2.5" strokeWidth={2.2} />
        Link
      </span>
      <span
        className="shrink-0 size-[22px] rounded-md border grid place-items-center"
        style={{ borderColor: C.line, color: C.dim }}
      >
        <X className="size-2.5" strokeWidth={2.4} />
      </span>
    </div>
  );
}

/** A directory row: this is where the suburb and the years live. */
function DirectoryRow({
  name,
  detail,
  invited,
  cursorKey,
}: {
  name: string;
  detail: string;
  invited: boolean;
  cursorKey?: string;
}) {
  return (
    <li
      className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5"
      style={{ borderColor: C.line, background: C.paper }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-ui font-medium truncate" style={{ color: C.ink }}>
          {name}
        </p>
        <p className="text-[9px] truncate" style={{ color: C.dim }}>
          {detail}
        </p>
      </div>
      {invited ? (
        <span
          className="shrink-0 px-1.5 text-[8.5px] font-bold uppercase tracking-[0.08em]"
          style={{ color: C.dim }}
        >
          Invited
        </span>
      ) : (
        <span
          data-cursor={cursorKey}
          className="shrink-0 inline-flex items-center gap-1 h-[22px] px-2.5 rounded-full border text-[9.5px]"
          style={{ borderColor: C.line3, color: C.ink }}
        >
          <Plus className="size-2.5" strokeWidth={2.4} />
          Invite
        </span>
      )}
    </li>
  );
}

/** A line that rewrites in place. The mode flip changes what several
 *  lines say at once, and a hard cut on all of them reads as a bug. */
function Rewrite({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <motion.span key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24 }}>
      {children}
    </motion.span>
  );
}
