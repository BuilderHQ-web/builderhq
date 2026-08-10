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
 * Each screen mounts, plays one entrance and one micro-event, and is
 * replaced. There is no pointer and no script: a hero has a few seconds
 * per screen, and a cursor travelling to a control it then clicks spends
 * most of them on the travel.
 *
 * Two compressions worth naming, both of which the deck scenes already
 * make and document:
 *
 *   · The builder rows on "Builders join" carry the identity line from
 *     the evaluation register ("22 years in operation · Ivanhoe, VIC").
 *     The project page's own row shows the state and the unlock recency
 *     instead. A miniature has one line to establish who these people
 *     are, and that is the line that does it.
 *
 *   · That same screen puts the invitations manager under the round
 *     panel. In the product they are one route apart, the wizard and the
 *     project page, but invitations stay live after publish
 *     (tender-round-step.tsx:16-18) and the practice's builder joining
 *     its own invitation is the whole point of the step.
 *
 * The invited builder is never shown as verified. A builder joins on the
 * practice's say so, and BuilderHQ checks the ABN and the licence after
 * that, so the row carries the product's own "Verification in progress"
 * rather than the teal register chips the other two have earned.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Award,
  BookOpenCheck,
  Check,
  FileDown,
  FileUp,
  Files,
  Globe2,
  Lock,
  Mail,
  Plus,
  Scale,
  Sparkles,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  Track,
  VerifyChip,
  WashRow,
  type HeroStep,
} from "./kit";

/**
 * The one delayed beat a screen is allowed. Every screen here is static
 * except for a single turn, and a shared timer keeps that honest: there
 * is nowhere to put a second one without adding a second call.
 */
function useBeat(delay: number): boolean {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const t = window.setTimeout(() => setOn(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return on;
}

/** The entrance every screen shares, so the sequence has one gait. */
const RISE = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const },
};

/** The round, in price order, as every comparison surface reads it. */
const TENDERS = [
  { mono: "CB", name: "Corten Build Co.", price: "$712,800", weighted: 47 },
  { mono: "MB", name: "Meridian Building Co", price: "$753,500", weighted: 86 },
  { mono: "BH", name: "Brightwater Homes", price: "$800,800", weighted: 94 },
] as const;

/* ── 1 · Upload ──────────────────────────────────────────────────── */

/**
 * The intake at /owner/projects/new, which the practice reaches through
 * the same wizard from /architect/projects/new. Setup rather than
 * payoff here, so it gets the shortest hold in the journey: the plans go
 * in, the product starts reading, and the next screen is the result.
 */
function UploadScreen() {
  const scanning = useBeat(700);

  return (
    <Frame crumb="Start a project" avatar="SN">
      <div className="shrink-0">
        <Kicker>AI auto-fill from plans</Kicker>
        <p
          className="mt-1.5 text-[14.5px] font-ui font-semibold tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
          Upload your plans
        </p>
        <p className="mt-1 line-clamp-2 text-[10px] leading-[1.5] max-w-[50ch]" style={{ color: C.muted }}>
          Drop in your architectural plans as a PDF. We read them and fill out your project for
          you.
        </p>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {scanning ? (
            <motion.div
              key="scan"
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            >
              <ScanSheet />
              <p className="mt-2.5 text-[11.5px] font-semibold" style={{ color: C.ink }}>
                Reading your plans
              </p>
              <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>
                Reading the title block…
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="drop"
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <DropZone />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Frame>
  );
}

/** The drop zone: dashed hairline, blueprint grid, the teal disc. */
function DropZone() {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-dashed px-5 py-7 flex flex-col items-center"
      style={{ borderColor: C.tealLine, background: "rgba(0,212,200,0.05)" }}
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
        className="relative inline-flex size-10 items-center justify-center rounded-full"
        style={{ background: C.tealMuted, color: C.tealInk, boxShadow: "0 0 0 6px rgba(0,212,200,0.06)" }}
      >
        <FileUp className="size-[18px]" strokeWidth={2} />
      </span>
      <p className="relative mt-3 text-[11.5px] font-semibold" style={{ color: C.ink }}>
        Drop your plans here, or click to browse
      </p>
      <p className="relative mt-1 text-[9.5px]" style={{ color: C.dim }}>
        PDF · up to 28 MB
      </p>
    </div>
  );
}

/** The sheet being read. The product's own scan, at hero scale. */
function ScanSheet() {
  const bars = [54, 88, 64, 80, 46, 72, 90, 58];
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute -inset-4 rounded-[22px] blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(0,212,200,0.26), transparent 70%)" }}
      />
      <div
        className="relative w-[132px] h-[156px] rounded-[10px] border overflow-hidden px-3.5 py-3.5"
        style={{
          borderColor: C.line3,
          background: "linear-gradient(180deg, #ffffff, rgba(250,248,243,0.96))",
          boxShadow: "0 22px 48px -26px rgba(15,23,32,0.30)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="size-[10px] rounded-[3px]" style={{ background: C.teal }} />
          <span className="h-[4px] w-[42px] rounded-full" style={{ background: "rgba(0,212,200,0.55)" }} />
        </div>

        <div className="mt-2.5 flex flex-col gap-[6px]">
          {bars.map((w, i) => (
            <motion.span
              key={i}
              className="block h-[4px] rounded-full"
              style={{ width: `${w}%`, background: C.teal }}
              animate={{ opacity: [0.16, 0.16, 1, 0.16] }}
              transition={{
                duration: 2.4,
                times: [0, i / (bars.length + 2), (i + 1.2) / (bars.length + 2), 1],
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>

        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-[22px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,212,200,0), rgba(0,212,200,0.22), rgba(0,212,200,0))",
          }}
          animate={{ top: ["6%", "86%", "6%"] }}
          transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

/* ── 2 · The scope ───────────────────────────────────────────────── */

/** The register at /architect/projects/[slug]/scope, six of its
 *  divisions, with the division a practice checks first already open. */
const DIVISIONS: Array<{ key: string; label: string; count: string }> = [
  { key: "prelim", label: "Preliminaries and site establishment", count: "14 lines" },
  { key: "approvals", label: "Approvals, certification and compliance", count: "11 lines" },
  { key: "earthworks", label: "Earthworks and excavation", count: "8 lines" },
  { key: "footings", label: "Footings and ground floor structure", count: "7 lines" },
  { key: "roofing", label: "Roofing and roof plumbing", count: "10 lines" },
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
 * The list written from the practice's own drawings. The micro-event is
 * the citation lighting under the first line, because for a practice the
 * claim is not that a list exists, it is that every line on it can be
 * traced back to a sheet they drew.
 */
function ScopeScreen() {
  const cited = useBeat(950);

  return (
    <Frame crumb="Scope of works" avatar="SN">
      <div className="shrink-0 flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-ui font-semibold" style={{ color: C.ink }}>
          Scope of works
        </p>
        <p className="shrink-0 text-[9.5px] tabular-nums" style={{ color: C.dim }}>
          228 lines · 29 trades
        </p>
      </div>
      <p className="shrink-0 line-clamp-2 text-[10px] leading-[1.5]" style={{ color: C.muted }}>
        Read directly from your documents. Each line shows the page it came from.
      </p>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-1.5">
          {DIVISIONS.map((d, i) => (
            <motion.div
              key={d.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
            >
              <Division label={d.label} count={d.count} open={d.key === "earthworks"}>
                {d.key === "earthworks"
                  ? OPEN_LINES.map((l, j) => (
                      <ScopeLine
                        key={l.label}
                        label={l.label}
                        plain={l.plain}
                        cite={l.cite}
                        citeHot={j === 0 && cited}
                      />
                    ))
                  : null}
              </Division>
            </motion.div>
          ))}
        </div>
        <ListFade />
      </div>
    </Frame>
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
 * Wizard step 4, the one screen where the architect-only moves live. The
 * practice arrives on Private and chooses Open, and the choice does what
 * it does in the product: the spot count only exists on an open round, so
 * it mounts as a consequence rather than as a second animation.
 */
function WhoPricesScreen() {
  const open = useBeat(700);

  return (
    <Frame
      crumb="Studio North · Pascoe Vale"
      avatar="SN"
      right={
        <span className="text-[9.5px]" style={{ color: C.dim }}>
          Autosaved
        </span>
      }
    >
      <div className="shrink-0 flex items-center justify-between gap-3">
        {/* The kicker holds its width and the count gives way, so a
            narrow frame truncates the sentence rather than wrapping the
            label onto two lines. */}
        <span className="shrink-0">
          <Kicker icon={BookOpenCheck}>Tender round</Kicker>
        </span>
        <p className="min-w-0 truncate text-[9.5px]" style={{ color: C.dim }}>
          228 lines of work, built from your documents
        </p>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-2.5">
          <StepCard icon={Globe2} title="Who can tender" sub="Pick how builders come to this round.">
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <ModeOption
                  key={m.id}
                  title={m.title}
                  sub={m.sub}
                  icon={m.icon}
                  active={m.id === (open ? "open" : "private")}
                />
              ))}
            </div>
          </StepCard>

          {/* Spots are an open-round idea, so the card is the product's
              own conditional rather than a reveal invented for the hero. */}
          <AnimatePresence initial={false}>
            {open ? (
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
                        className="h-7 w-10 rounded-md border grid place-items-center text-[11px] font-ui font-semibold tabular-nums"
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
            <p className="mb-2 text-[10px]" style={{ color: C.muted }}>
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
    </Frame>
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
      <header className="flex items-start gap-2.5 px-3 py-1.5 border-b" style={{ borderColor: C.line }}>
        <span
          className="size-[20px] shrink-0 rounded-md border grid place-items-center"
          style={{ borderColor: C.line, background: C.wash, color: C.tealInk }}
        >
          <Icon className="size-[11px]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-ui font-semibold leading-tight" style={{ color: C.ink }}>
            {title}
          </p>
          <p className="mt-0.5 truncate text-[9px] leading-tight" style={{ color: C.dim }}>
            {sub}
          </p>
        </div>
      </header>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}

/** One of the two options. Selected is a teal hairline, a teal wash and
 *  the check disc, which is all the real button does. */
function ModeOption({
  title,
  sub,
  icon: Icon,
  active,
}: {
  title: string;
  sub: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <div
      className="rounded-md border p-2 transition-colors duration-300"
      style={{
        borderColor: active ? C.tealLine : C.line,
        background: active ? C.tealWash : C.wash,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="size-[20px] shrink-0 rounded-md border grid place-items-center transition-colors duration-300"
          style={
            active
              ? { borderColor: C.tealLine, background: C.tealMuted, color: C.tealInk }
              : { borderColor: C.line, background: "transparent", color: C.dim }
          }
        >
          <Icon className="size-[11px]" strokeWidth={2.2} />
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
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <Check className="size-2.5" strokeWidth={3.2} />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <p className="mt-1.5 text-[11px] font-ui font-semibold" style={{ color: C.ink }}>
        {title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[9px] leading-[1.45]" style={{ color: C.dim }}>
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
      className="flex items-center gap-2 rounded-md border px-2.5 py-1.5"
      style={{ borderColor: C.line, background: C.wash }}
    >
      <span
        className="size-[24px] shrink-0 rounded-md border grid place-items-center"
        style={{ borderColor: C.line, background: C.paper2, color: C.dim }}
      >
        <UserRound className="size-3" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-ui font-medium" style={{ color: C.ink }}>
          {name}
        </p>
        <p className="truncate text-[9px]" style={{ color: C.dim }}>
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
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex pt-1">
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

/** The page's own stepper, at the stage this screen sits in. */
const NEXT: Array<{ n: string; state: "done" | "current" | "next"; chip: string; title: string; body: string }> = [
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

/**
 * The round filling. Two builders came off the marketplace and were
 * checked before they arrived; the third is the practice's own, and it
 * joins on the practice's authority rather than on a completed check.
 * The single beat is that invitation turning into a joined builder.
 */
function BuildersJoinScreen() {
  const joined = useBeat(950);

  return (
    <Frame crumb="Your round" avatar="SN">
      <div className="shrink-0 flex items-baseline justify-between gap-2">
        <Kicker icon={Sparkles}>Builders on your round</Kicker>
        <span className="shrink-0 text-[10px] tabular-nums" style={{ color: C.dim }}>
          {joined ? "3 of 3 spots taken" : "2 of 3 spots taken"}
        </span>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col gap-2">
        {TAKEN.map((b, i) => (
          <motion.div
            key={b.name}
            className="shrink-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
          >
            <WashRow className="px-3 py-2">
              <div className="flex items-center gap-2.5">
                <Avatar txt={b.initials} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-semibold leading-[14px]" style={{ color: C.ink }}>
                    {b.name}
                  </p>
                  <p className="mt-0.5 truncate text-[9.5px] leading-[12px]" style={{ color: C.dim }}>
                    {b.line}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <VerifyChip label="ABN" />
                    <VerifyChip label="Licence" />
                  </div>
                </div>
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
            <div className="flex items-center gap-2 px-3 pt-2">
              <Kicker icon={Mail}>Invited builders</Kicker>
            </div>
            <p className="px-3 pt-1 pb-2 line-clamp-2 text-[9.5px] leading-[1.5]" style={{ color: C.muted }}>
              These builders join free. Remaining spots open to the network.
            </p>
            <div className="px-3 pb-2.5">
              <InviteRow
                name="Brightwater Homes"
                detail="BuilderHQ builder"
                status={joined ? "Joined" : "Invited"}
              />
            </div>
          </Card>
        </motion.div>

        {/* The page's third band. Static, and honestly so: the whole
            screen happens inside the one stage, so step two stays
            current throughout. It sits below the fold on the real page
            too, which is why it is the part the fade takes. */}
        <motion.div
          className="shrink-0 pt-1"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <p
            className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-medium"
            style={{ color: C.dim }}
          >
            <Activity className="size-3 shrink-0" strokeWidth={2.2} /> What happens next
          </p>
          <ol className="mt-2 grid grid-cols-3 gap-2">
            {NEXT.map((s) => (
              <li
                key={s.n}
                className="rounded-lg border p-2"
                style={{
                  borderColor: s.state === "current" ? C.tealLine : C.line,
                  background: s.state === "current" ? C.tealWash : C.paper,
                }}
              >
                <div className="mb-1.5 flex items-center justify-between gap-1">
                  <span
                    className="inline-flex size-[16px] shrink-0 items-center justify-center rounded-full border text-[8.5px] font-bold tabular-nums"
                    style={
                      s.state === "current"
                        ? { borderColor: "transparent", background: C.teal, color: C.onTeal }
                        : s.state === "done"
                          ? { borderColor: C.tealLine, color: C.tealInk }
                          : { borderColor: C.line3, color: C.dim }
                    }
                  >
                    {s.state === "done" ? <Check className="size-2.5" strokeWidth={3} /> : s.n}
                  </span>
                  <span
                    className="truncate text-[7.5px] uppercase tracking-[0.14em] font-semibold"
                    style={{ color: s.state === "current" ? C.tealInk : C.dim }}
                  >
                    {s.chip}
                  </span>
                </div>
                <p
                  className="text-[10px] font-semibold leading-tight"
                  style={{ color: s.state === "next" ? C.muted : C.ink }}
                >
                  {s.title}
                </p>
                <p className="mt-1 line-clamp-3 text-[8.5px] leading-[1.45]" style={{ color: C.dim }}>
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </motion.div>

        <ListFade />
      </div>
    </Frame>
  );
}

/* ── 5 · Tenders in ──────────────────────────────────────────────── */

/** The round strip at the head of the evaluation. Shared with the last
 *  screen, which is the same page read from the other end. */
const STRIP: Array<[string, string, string]> = [
  ["Tenders received", "3", "project live 14 days"],
  ["Lowest tender inc GST", "$712,800", "highest $800,800 · 12% spread"],
  ["Significant flags", "2", "raised across the round"],
];

/** What each tender says about itself on its own card. */
const SUBMITTED: Array<{ mono: string; name: string; price: string; weeks: string; firm: string }> = [
  {
    mono: "CB",
    name: "Corten Build Co.",
    price: "$712,800",
    weeks: "36 weeks",
    firm: "Firm to 84% · $105,000 in allowances",
  },
  {
    mono: "MB",
    name: "Meridian Building Co",
    price: "$753,500",
    weeks: "34 weeks",
    firm: "Fully priced, no allowances",
  },
  {
    mono: "BH",
    name: "Brightwater Homes",
    price: "$800,800",
    weeks: "30 weeks",
    firm: "Fully priced, no allowances",
  },
];

/**
 * Three tenders, arriving in the same shape. The cards land one after
 * another rather than all at once, because the point of the screen is
 * not that three prices exist, it is that all three answered the same
 * submission and so land on the same three fields.
 */
function TendersInScreen() {
  return (
    <Frame crumb="Single dwelling · Pascoe Vale, VIC" avatar="SN">
      <div className="shrink-0">
        <Kicker icon={Files}>The tender evaluation</Kicker>
        <p className="mt-1.5 line-clamp-2 text-[9.5px] leading-[1.5] max-w-[62ch]" style={{ color: C.muted }}>
          Every builder tendering here answered the same structured submission, under declaration.
          The analysis below is read entirely from what they disclosed. Nothing is estimated.
        </p>
      </div>

      <Card className="shrink-0 grid grid-cols-3 overflow-hidden">
        {STRIP.map(([label, value, sub], i) => (
          <div
            key={label}
            className={"min-w-0 px-2.5 py-1.5 " + (i ? "border-l" : "")}
            style={{ borderColor: C.line }}
          >
            <p className="truncate text-[8px] uppercase tracking-[0.11em]" style={{ color: C.dim }}>
              {label}
            </p>
            <p
              className="mt-0.5 truncate font-ui font-semibold text-[16px] leading-none tabular-nums"
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

      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* The cards take the full height of the frame's remainder, as
            they do on the real page, rather than sitting in a band with
            dead canvas under them. */}
        <div className="grid h-full grid-cols-3 gap-2">
          {SUBMITTED.map((t, i) => (
            <motion.div
              key={t.name}
              className="flex h-full flex-col rounded-lg border overflow-hidden"
              style={{ borderColor: C.line, background: C.paper, boxShadow: ELEV }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.44, delay: 0.5 + 0.16 * i, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-1.5 px-2.5 pt-2">
                <span
                  className="size-[18px] shrink-0 rounded-full inline-flex items-center justify-center text-[7.5px] font-bold"
                  style={{ background: C.tealMuted, color: C.tealInk }}
                >
                  {t.mono}
                </span>
                <p className="min-w-0 truncate text-[10px] font-semibold" style={{ color: C.ink }}>
                  {t.name}
                </p>
              </div>
              <div className="px-2.5 pt-2">
                <p className="text-[7.5px] uppercase tracking-[0.14em]" style={{ color: C.dim }}>
                  Tender price inc GST
                </p>
                <p
                  className="mt-0.5 truncate font-ui font-semibold text-[15px] leading-none tabular-nums"
                  style={{ color: C.ink }}
                >
                  {t.price}
                </p>
                <p className="mt-1 text-[9px]" style={{ color: C.muted }}>
                  {t.weeks}
                </p>
              </div>
              <p
                className="mt-auto line-clamp-2 border-t px-2.5 py-1.5 text-[8.5px] leading-[1.4]"
                style={{ borderColor: C.line, color: C.dim }}
              >
                {t.firm}
              </p>
              <div className="border-t px-2.5 py-2" style={{ borderColor: C.line }}>
                <Pill tone="ink">Submitted</Pill>
              </div>
            </motion.div>
          ))}
        </div>
        <ListFade />
      </div>
    </Frame>
  );
}

/* ── 6 · Compare ─────────────────────────────────────────────────── */

/** One grid for every band, exactly as the comparison surface does it. */
const COLS = "minmax(0,1.05fr) repeat(3, minmax(0,1fr))";

type GridRow = { label: string; v: [string, string, string]; best?: number[] };

/** The decision grid, its labelled groups and the app's own rule for the
 *  strongest position on a line. A row where every column wins is a row
 *  where nobody does, so those are left untinted. */
const GRID: Array<{ title: string; rows: GridRow[] }> = [
  {
    title: "The money",
    rows: [
      { label: "Price inc GST", v: ["$712,800", "$753,500", "$800,800"], best: [0] },
      { label: "Firm portion", v: ["$543,000 (84%)", "$685,000 (100%)", "$728,000 (100%)"], best: [1, 2] },
      { label: "Allowances", v: ["$105,000 (2 PS, 3 PC)", "None", "None"], best: [1, 2] },
    ],
  },
  {
    title: "Scope",
    rows: [{ label: "Trades in the price", v: ["14 of 22", "23 of 23", "23 of 23"], best: [1, 2] }],
  },
];

/**
 * The whole argument for a practice, in one table: three submissions on
 * one grid, so there is nothing to reconcile before they can be read.
 * The longest hold in the journey, because it is the only screen with
 * something to actually study.
 *
 * The beat is the weighted overall bars filling. They are scored under a
 * fixed rubric applied identically to every tender, so the figure is the
 * last thing to arrive rather than the first thing claimed.
 */
function CompareScreen() {
  const scored = useBeat(900);

  return (
    <Frame crumb="The tender evaluation" avatar="SN">
      <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="shrink-0 px-3 pt-2.5 pb-2">
          <Kicker icon={Scale}>The like-for-like read</Kicker>
          <p
            className="mt-1 text-[13px] font-ui font-semibold tracking-[-0.015em]"
            style={{ color: C.ink }}
          >
            Same questions, every builder
          </p>
          <p
            className="mt-1 hidden sm:block line-clamp-2 text-[9.5px] leading-[1.5] max-w-[64ch]"
            style={{ color: C.muted }}
          >
            Each tender below answered the BuilderHQ submission standard, so price, scope and
            conditions compare on the same terms. Differences surface first.
          </p>
        </div>

        <div className="relative flex-1 min-h-0 overflow-hidden">
          <motion.div {...RISE}>
            <div
              className="h-[34px] border-t"
              style={{ borderColor: C.line, display: "grid", gridTemplateColumns: COLS }}
            >
              <span />
              {TENDERS.map((t) => (
                <div
                  key={t.name}
                  className="min-w-0 border-l px-2 flex items-center gap-1.5"
                  style={{ borderColor: C.line }}
                >
                  <span
                    className="size-[17px] shrink-0 rounded-full inline-flex items-center justify-center text-[7px] font-bold"
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

            {GRID.map((group) => (
              <div key={group.title}>
                <p
                  className="h-[19px] flex items-end px-3 pb-[3px] text-[8.5px] tracking-[0.2em] uppercase"
                  style={{ color: C.dim }}
                >
                  {group.title}
                </p>
                {group.rows.map((row) => {
                  const meaningful = !!row.best && row.best.length < 3;
                  return (
                    <div
                      key={row.label}
                      className="h-[30px] border-t"
                      style={{ borderColor: C.line, display: "grid", gridTemplateColumns: COLS }}
                    >
                      <div className="flex items-center px-3 min-w-0">
                        <span className="line-clamp-2 text-[9px] leading-[1.35]" style={{ color: C.dim }}>
                          {row.label}
                        </span>
                      </div>
                      {row.v.map((value, j) => {
                        const win = meaningful && row.best!.includes(j);
                        return (
                          <div
                            key={j}
                            className="min-w-0 border-l px-2 flex items-center"
                            style={{ borderColor: C.line, background: win ? TONE.good.bg : undefined }}
                          >
                            <span
                              className="block line-clamp-2 text-[9px] leading-[1.35]"
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
              className="h-[19px] flex items-end px-3 pb-[3px] text-[8.5px] tracking-[0.2em] uppercase"
              style={{ color: C.dim }}
            >
              The six dimensions
            </p>
            <div
              className="h-[38px] border-t"
              style={{ borderColor: C.line, display: "grid", gridTemplateColumns: COLS }}
            >
              <div className="flex items-center px-3 min-w-0">
                <span className="truncate text-[9px] font-semibold" style={{ color: C.ink }}>
                  Weighted overall
                </span>
              </div>
              {TENDERS.map((t) => (
                <div
                  key={t.name}
                  className="min-w-0 border-l px-2 flex flex-col justify-center gap-1"
                  style={{ borderColor: C.line }}
                >
                  <span
                    className="font-ui font-semibold text-[13px] leading-none tabular-nums"
                    style={{ color: C.ink }}
                  >
                    {t.weighted}
                  </span>
                  <Track pct={scored ? t.weighted : 0} h={4} />
                </div>
              ))}
            </div>

            <p
              className="h-[22px] flex items-center border-t px-3 text-[8.5px] truncate"
              style={{ borderColor: C.line, color: C.dim }}
            >
              Open any builder&apos;s full evaluation to see the working behind their dimension
              scores.
            </p>
          </motion.div>
          <ListFade />
        </div>
      </Card>
    </Frame>
  );
}

/* ── 7 · Your client ─────────────────────────────────────────────── */

/**
 * The handover. The practice's judgement, the practice's name on it, and
 * the client given a seat at the round rather than an email with three
 * PDFs attached.
 *
 * The seat arriving is the beat, and it arrives already attributed: a
 * name, a date and the seat they hold. The authorship line under the
 * recommendation says the same thing about the practice. Nothing on this
 * screen is anonymous, which is the point of ending here.
 */
function YourClientScreen() {
  const seated = useBeat(900);

  return (
    <Frame
      crumb="Single dwelling · Pascoe Vale, VIC"
      avatar="SN"
      right={
        <span
          className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[9px] font-semibold whitespace-nowrap"
          style={{ borderColor: C.tealLine, background: C.tealWash, color: C.tealInk }}
        >
          <FileDown className="size-2.5 shrink-0" strokeWidth={2.4} />
          The report
        </span>
      }
    >
      <div className="shrink-0 flex items-center">
        <Kicker icon={Files}>The tender evaluation</Kicker>
      </div>

      <Card className="shrink-0 grid grid-cols-3 overflow-hidden">
        {STRIP.map(([label, value, sub], i) => (
          <div
            key={label}
            className={"min-w-0 px-2.5 py-1.5 " + (i ? "border-l" : "")}
            style={{ borderColor: C.line }}
          >
            <p className="truncate text-[8px] uppercase tracking-[0.11em]" style={{ color: C.dim }}>
              {label}
            </p>
            <p
              className="mt-0.5 truncate font-ui font-semibold text-[15px] leading-none tabular-nums"
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

      <Card
        className="shrink-0 overflow-hidden"
        style={{ borderColor: C.tealLine, background: C.tealWash }}
      >
        <div className="px-3 pt-2 pb-1.5">
          <div className="flex items-center gap-2.5">
            <Avatar txt="MB" size={26} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-semibold leading-tight" style={{ color: C.ink }}>
                Meridian Building Co
              </p>
              <p
                className="mt-0.5 truncate text-[10px] leading-tight tabular-nums"
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
          <p className="mt-1.5 truncate text-[9.5px]" style={{ color: C.dim }}>
            Fully priced, no allowances · No significant flags
          </p>
        </div>
        <div
          className="flex items-center justify-between gap-2 border-t px-3 py-1.5"
          style={{ borderColor: C.line }}
        >
          <p className="min-w-0 truncate text-[9px] leading-tight" style={{ color: C.muted }}>
            Prepared by{" "}
            <span style={{ color: C.ink, fontWeight: 500 }}>Studio North Architecture</span> with
            BuilderHQ
          </p>
          <span className="flex shrink-0 items-center gap-1.5">
            <GhostBtn hot>
              <Star className="size-3 shrink-0" strokeWidth={2.2} fill="currentColor" />
              Shortlisted
            </GhostBtn>
            <span
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold"
              style={{ background: C.ink, color: C.paper }}
            >
              <Award className="size-3 shrink-0" strokeWidth={2.2} />
              Award
            </span>
          </span>
        </div>
      </Card>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="shrink-0 px-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <Kicker icon={Users}>Sharing</Kicker>
            <GhostBtn>
              <Plus className="size-3 shrink-0" strokeWidth={2.4} />
              Share the project
            </GhostBtn>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[9.5px] leading-[1.5]" style={{ color: C.muted }}>
            Give your client a seat at the round. A seat sees the project and the evaluation; a
            Deciding seat can also shortlist and award.
          </p>
        </div>

        <div className="relative flex-1 min-h-0 overflow-hidden px-3 pt-2 pb-1.5">
          {/* mode="wait" so the empty panel is gone before the seat
              lands: both in the flow at once would shunt the row down a
              row-height and back. */}
          <AnimatePresence mode="wait" initial={false}>
            {seated ? (
              <motion.div
                key="seat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                <WashRow className="flex items-center gap-2.5 px-2.5 py-2" hot>
                  <span
                    className="size-7 shrink-0 rounded-md border inline-flex items-center justify-center"
                    style={{ borderColor: C.line2, color: C.dim }}
                  >
                    <UserRound className="size-3.5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium leading-tight" style={{ color: C.ink }}>
                      J. Calder
                    </p>
                    <p className="mt-0.5 truncate text-[9.5px] leading-tight" style={{ color: C.tealInk }}>
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
                className="rounded-md border border-dashed px-3 py-2.5 text-center"
                style={{ borderColor: C.line2 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-[10px]" style={{ color: C.muted }}>
                  Not shared with anyone yet.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <ListFade />
        </div>
      </Card>
    </Frame>
  );
}

/* ── the journey ─────────────────────────────────────────────────── */

/**
 * Seven steps in the time the other lenses take for five, so the holds
 * are budgeted against reading load rather than shared out evenly: the
 * upload is setup and gets the least, the comparison is the only screen
 * with something to study and gets the most.
 */
export const ARCHITECT_JOURNEY: HeroStep[] = [
  { key: "upload", label: "Upload", hold: 2200, Screen: UploadScreen },
  { key: "scope", label: "The scope", hold: 2800, Screen: ScopeScreen },
  { key: "who", label: "Who prices it", hold: 3000, Screen: WhoPricesScreen },
  { key: "join", label: "Builders join", hold: 2800, Screen: BuildersJoinScreen },
  { key: "tenders", label: "Tenders in", hold: 2600, Screen: TendersInScreen },
  { key: "compare", label: "Compare", hold: 4000, Screen: CompareScreen },
  { key: "client", label: "Your client", hold: 3200, Screen: YourClientScreen },
];
