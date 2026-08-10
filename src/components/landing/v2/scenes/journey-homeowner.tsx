"use client";

/**
 * Homeowner · the whole thing, in six screens.
 *
 * The default lens, so for most visitors this is the entire product:
 * plans go in, one list comes out, three verified builders price that
 * same list, the tenders arrive in the same shape, the round is read
 * side by side, and the owner awards. Nothing here is a mock-up of an
 * intention. Every screen is a miniature of a surface the app already
 * renders, at the figures of the example round it ships with.
 *
 * How these differ from the deck cards downstream. A deck card has a
 * pointer, a script and eight seconds; a hero screen has none of that.
 * Each one mounts, plays a short entrance, fires exactly one thing, and
 * is replaced. That single event is the whole mechanism, and it is why
 * the sequence can carry six surfaces in nineteen seconds without ever
 * reading as a slideshow of screenshots.
 *
 * Three compressions worth naming, because a later reader will
 * otherwise think they are mistakes:
 *
 *   · Step three blends two real rows. The header, the spot counter and
 *     the stepper are the project page's; the "N years in operation ·
 *     Suburb, VIC" line under each name is the richer row from the
 *     evaluation register one level down. The deck's round card already
 *     makes the same blend, for the same reason: a miniature has to
 *     carry identity in one line.
 *   · Step five prints each dimension's weight beside its label. The
 *     tender card does not; the dossier and the builder's own scorecard
 *     do. The weights are published and fixed, and a reader who cannot
 *     see them cannot check the arithmetic, which is the point of the
 *     screen.
 *   · Step six puts the award dialog's sentence under the awarded
 *     banner's heading. In the app they are a moment apart. They are the
 *     same fact, and the fact is the one the visitor came for: the
 *     contract is between the owner and the builder, not with us.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  FileUp,
  MessageSquare,
  Scale,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import {
  Avatar,
  C,
  Card,
  Division,
  Frame,
  GhostBtn,
  Kicker,
  ListFade,
  Pill,
  TONE,
  VerifyChip,
  WashRow,
  type HeroStep,
} from "./kit";

/** The app's own entrance curve. */
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The one event a screen is allowed, fired `after` ms into its life.
 * The shell mounts and unmounts these, so a timer per screen is the
 * entire clock: there is nothing to reset, share or tear down between
 * steps.
 */
function useBeat(after: number): boolean {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const t = window.setTimeout(() => setOn(true), after);
    return () => window.clearTimeout(t);
  }, [after]);
  return on;
}

/* ── shared parts ────────────────────────────────────────────────── */

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

/** A score bar. Static width: the scores never move on these screens,
 *  and animating a width inside a list is the one thing that would put
 *  the hero back on the layout thread. */
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

/** The evaluation's superlative chip. Arithmetically true, never a
 *  verdict, and desktop only: at 300px there is no room for it. */
function Position({ label }: { label: string }) {
  return (
    <span
      className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-[2px] text-[8.5px] font-semibold whitespace-nowrap"
      style={{ color: TONE.good.text, background: TONE.good.bg, borderColor: TONE.good.border }}
    >
      <Sparkles className="size-2.5" />
      {label}
    </span>
  );
}

/* ── step one · upload ───────────────────────────────────────────── */

/** The ten bars on the scanned sheet, at the app's own widths. */
const BARS = [54, 88, 64, 80, 46, 72, 90, 58, 76, 50];

function UploadScreen() {
  // The one event: the plan set lands and the app starts reading it.
  const reading = useBeat(800);

  return (
    <Frame crumb="Start a project">
      <div className="shrink-0">
        <Kicker>AI auto-fill from plans</Kicker>
        <p
          className="mt-1.5 font-ui font-semibold text-[14px] sm:text-[15px] tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
          Upload your plans
        </p>
        <p
          className="mt-1 hidden sm:block text-[10.5px] leading-[1.5] max-w-[46ch]"
          style={{ color: C.muted }}
        >
          Drop in your architectural plans as a PDF. We read them and fill out your project for
          you.
        </p>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {reading ? (
            <motion.div
              key="scan"
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.34, ease: EASE }}
            >
              <ScanSheet />
              <p className="mt-3 text-[12px] font-semibold" style={{ color: C.ink }}>
                Reading your plans
              </p>
              <p className="mt-1 text-[10.5px]" style={{ color: C.muted }}>
                Reading the title block…
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="drop"
              className="w-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.34, ease: EASE }}
            >
              <DropZone />
              <div className="mt-3 hidden sm:flex items-start gap-2">
                <ShieldCheck className="size-3.5 shrink-0 mt-[1px]" style={{ color: C.tealInk }} />
                <p className="text-[9.5px] leading-[1.55]" style={{ color: C.dim }}>
                  Your plans are read securely to fill the form. Nothing is published until you say
                  so.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Frame>
  );
}

/** The drop zone: dashed hairline, blueprint grid, the teal ring. */
function DropZone() {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-dashed px-6 py-6 sm:py-8 flex flex-col items-center"
      style={{ borderColor: C.line3, background: C.wash }}
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
        <FileUp className="size-4.5" strokeWidth={2} />
      </span>
      <p className="relative mt-3 text-[11.5px] sm:text-[12px] font-semibold" style={{ color: C.ink }}>
        Drop your plans here, or click to browse
      </p>
      <p className="relative mt-1 text-[10px]" style={{ color: C.dim }}>
        PDF · up to 28 MB
      </p>
    </div>
  );
}

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
        className="relative w-[136px] h-[172px] sm:w-[158px] sm:h-[198px] rounded-[12px] border overflow-hidden px-4 py-4"
        style={{
          borderColor: C.line3,
          background: "linear-gradient(180deg, #ffffff, rgba(250,248,243,0.96))",
          boxShadow: "0 24px 54px -26px rgba(15,23,32,0.30)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="size-[11px] rounded-[3px]" style={{ background: C.teal }} />
          <span className="h-[5px] w-[46px] rounded-full" style={{ background: "rgba(0,212,200,0.55)" }} />
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
          <span key={cls} aria-hidden className={`absolute size-2.5 ${cls}`} style={{ borderColor: C.tealLine }} />
        ))}
      </div>
    </div>
  );
}

/* ── step two · your scope ───────────────────────────────────────── */

/** Six of the register's divisions, in the pack's own build order. */
const GLIMPSE: Array<{ label: string; count: string }> = [
  { label: "Preliminaries and site establishment", count: "14 items" },
  { label: "Approvals, certification and compliance", count: "11 items" },
  { label: "Demolition and site clearing", count: "6 items" },
  { label: "Earthworks and excavation", count: "8 items" },
  { label: "Footings and ground floor structure", count: "7 items" },
  { label: "Concrete, formwork and reinforcement", count: "9 items" },
];

function ScopeScreen() {
  return (
    <Frame crumb="Scope of works">
      <div className="shrink-0 flex flex-col items-center text-center">
        <p
          className="text-[8.5px] sm:text-[9px] uppercase tracking-[0.24em] font-semibold"
          style={{ color: C.tealInk }}
        >
          Identified from your documents
        </p>
        <CountUp to={242} />
        <p className="text-[11.5px] sm:text-[12.5px] font-semibold" style={{ color: C.ink }}>
          items of work
        </p>
        <div
          className="mt-3 flex items-stretch rounded-lg border overflow-hidden"
          style={{ borderColor: C.line, background: C.paper }}
        >
          {[
            ["29", "trades"],
            ["211", "pages read"],
            ["9", "documents"],
          ].map(([v, l], i) => (
            <div
              key={l}
              className="px-3 sm:px-5 py-2 text-center"
              style={i === 0 ? undefined : { borderLeft: `1px solid ${C.line}` }}
            >
              <p
                className="font-ui font-semibold text-[14px] leading-none tabular-nums"
                style={{ color: C.ink }}
              >
                {v}
              </p>
              <p className="mt-1 text-[8.5px] uppercase tracking-[0.12em]" style={{ color: C.dim }}>
                {l}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="shrink-0 text-[10px] leading-snug" style={{ color: C.muted }}>
        Every builder prices this same list.
      </p>

      {/* The register itself, clipped. Enough of it to prove the figure
          above is a list and not a headline. */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-1.5">
          {GLIMPSE.map((d, i) => (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.34 + i * 0.06, ease: EASE }}
            >
              <Division label={d.label} count={d.count} />
            </motion.div>
          ))}
        </div>
        <ListFade />
      </div>
    </Frame>
  );
}

/**
 * The headline figure, counted rather than printed. A number that lands
 * already finished reads as a graphic; one that arrives reads as a
 * result. Eases out, so it decelerates onto the real total.
 */
function CountUp({ to }: { to: number }) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const started = performance.now();
    const dur = 850;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return (
    <p
      className="mt-1 font-ui font-semibold tabular-nums leading-none tracking-[-0.04em] text-[46px] sm:text-[58px]"
      style={{ color: C.ink }}
    >
      {n}
    </p>
  );
}

/* ── step three · builders join ──────────────────────────────────── */

type Spots = 2 | 3;

/** The seeded example round, in the order the spots were taken. */
const BUILDERS: Array<{ initials: string; name: string; line: string }> = [
  { initials: "CB", name: "Corten Build Co.", line: "6 years in operation · Melbourne, VIC" },
  { initials: "MB", name: "Meridian Building Co", line: "14 years in operation · Brunswick, VIC" },
  { initials: "BH", name: "Brightwater Homes", line: "22 years in operation · Ivanhoe, VIC" },
];

function RoundScreen() {
  // The one event: the last spot goes, and the panel's whole strip
  // rewrites on the same frame, exactly as the real one does.
  const full = useBeat(1150);
  const spots: Spots = full ? 3 : 2;

  return (
    <Frame crumb="Your round">
      <div className="shrink-0">
        <Kicker>
          <PulseDot />
          <span className="inline-flex h-[11px] items-center">
            <Swap k={spots}>{spots} builders on your round</Swap>
          </span>
        </Kicker>
        <p
          className="mt-1.5 h-[19px] font-ui font-semibold text-[14px] sm:text-[15px] leading-[19px] tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
          <Swap k={spots}>{spots} builders joined your round</Swap>
        </p>
        <p
          className="mt-1 hidden sm:block text-[10.5px] leading-[1.5] max-w-[52ch]"
          style={{ color: C.muted }}
        >
          They have your plans and contact details and can message you. Tenders usually follow
          within days.
        </p>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* The section label goes at the narrowest sizes rather than
            wrapping onto the counter, which is the one number this
            screen exists to move. */}
        <div className="shrink-0 flex items-baseline justify-between gap-2">
          <span className="hidden sm:inline-flex min-w-0">
            <Kicker icon={Sparkles}>Builders on your round</Kicker>
          </span>
          <span
            className="inline-flex h-[13px] items-center text-[10px] tabular-nums"
            style={{ color: C.dim }}
          >
            <Swap k={spots}>{spots} of 3 spots taken</Swap>
          </span>
        </div>

        <ul className="mt-2 flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {BUILDERS.slice(0, spots).map((b) => (
              <motion.li
                key={b.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.44, ease: EASE }}
              >
                <WashRow className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar txt={b.initials} size={28} />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[11.5px] leading-[14px] font-semibold truncate"
                        style={{ color: C.ink }}
                      >
                        {b.name}
                      </p>
                      <p className="mt-0.5 text-[9.5px] leading-[12px] truncate" style={{ color: C.dim }}>
                        {b.line}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <VerifyChip label="ABN" />
                        <VerifyChip label="Licence" />
                      </div>
                    </div>
                  </div>
                </WashRow>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {/* The panel's own CTA, which only exists once a builder has
            taken a spot. It appears at the one frame height that has
            room for it: three rows already fill the shorter frame. */}
        <div className="mt-auto pt-2 hidden lg:flex shrink-0">
          <GhostBtn hot>
            <MessageSquare className="size-3 shrink-0" strokeWidth={2.2} />
            Message builders
          </GhostBtn>
        </div>
      </div>
    </Frame>
  );
}

/* ── step four · tenders in ──────────────────────────────────────── */

/**
 * The three tenders as they land, in price order, which is the order
 * every table on the evaluation reads left to right. Build periods are
 * the round's own: 36, 34 and 30 weeks.
 */
const TENDERS: Array<{ mono: string; name: string; years: string; price: string; weeks: string }> = [
  { mono: "CB", name: "Corten Build Co.", years: "6 years in operation", price: "$712,800", weeks: "36 weeks" },
  { mono: "MB", name: "Meridian Building Co", years: "14 years in operation", price: "$753,500", weeks: "34 weeks" },
  { mono: "BH", name: "Brightwater Homes", years: "22 years in operation", price: "$800,800", weeks: "30 weeks" },
];

function TendersScreen() {
  return (
    <Frame crumb="Your round">
      <div className="shrink-0">
        <Kicker>
          <PulseDot />
          3 tenders in
        </Kicker>
        <p
          className="mt-1.5 font-ui font-semibold text-[14px] sm:text-[15px] tracking-[-0.015em]"
          style={{ color: C.ink }}
        >
          You have 3 tenders to compare
        </p>
        <p
          className="mt-1 hidden sm:block text-[10.5px] leading-[1.5] max-w-[52ch]"
          style={{ color: C.muted }}
        >
          Read them side by side, across price, timeline, and inclusions, then award the builder
          you trust.
        </p>
      </div>

      {/* The one event: three tenders landing one after another. They
          arrive in the same shape because they answered the same
          instrument, which is the only reason the numbers below them
          can be compared at all. */}
      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col gap-2.5">
        {TENDERS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.04 + i * 0.2, ease: EASE }}
          >
            <Card className="px-3 py-3">
              <div className="flex items-start gap-2.5">
                <Mono txt={t.mono} size={22} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[11.5px] font-semibold leading-tight truncate" style={{ color: C.ink }}>
                    {t.name}
                  </p>
                  <p className="mt-0.5 text-[9px] leading-tight truncate" style={{ color: C.muted }}>
                    {t.years}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[7.5px] uppercase tracking-[0.16em]" style={{ color: C.dim }}>
                    Tender price inc GST
                  </p>
                  <p
                    className="mt-0.5 font-ui font-semibold text-[16px] leading-none tabular-nums"
                    style={{ color: C.ink }}
                  >
                    {t.price}
                  </p>
                  <p className="mt-1 text-[9px] leading-none" style={{ color: C.muted }}>
                    {t.weeks}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}

        <div className="mt-auto shrink-0 pt-1">
          <GhostBtn hot>Compare tenders</GhostBtn>
        </div>
      </div>
    </Frame>
  );
}

/* ── step five · compare ─────────────────────────────────────────── */

/**
 * The weighted overall for each tender, and the superlative each one
 * genuinely holds. The scores run against the prices, which is the
 * whole argument of the screen: the cheapest tender is the weakest read
 * on the round, and it is weakest for reasons that are printed.
 */
const READ: Array<{
  mono: string;
  name: string;
  years: string;
  price: string;
  score: number;
  leads?: boolean;
  position: string;
  dims?: boolean;
}> = [
  {
    mono: "CB",
    name: "Corten Build Co.",
    years: "6 years in operation",
    price: "$712,800",
    score: 47,
    position: "Lowest headline price",
  },
  {
    mono: "MB",
    name: "Meridian Building Co",
    years: "14 years in operation",
    price: "$753,500",
    score: 86,
    position: "Fully priced",
    dims: true,
  },
  {
    mono: "BH",
    name: "Brightwater Homes",
    years: "22 years in operation",
    price: "$800,800",
    score: 94,
    leads: true,
    position: "Shortest build period",
  },
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

function CompareScreen() {
  // The one event: the working opens under the weighted overall.
  const open = useBeat(1150);

  return (
    <Frame crumb="The tender evaluation">
      <div className="shrink-0">
        <Kicker icon={Scale}>The tenders</Kicker>
        <p
          className="mt-1.5 hidden sm:block text-[10px] leading-[1.55] max-w-[58ch]"
          style={{ color: C.muted }}
        >
          Every builder tendering here answered the same structured submission, under declaration.
          Nothing is estimated.
        </p>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col gap-1.5">
        {READ.map((t) => (
          <Card key={t.name} className="px-3 py-[6px]">
            <div className="flex items-center gap-2.5">
              <Mono txt={t.mono} size={20} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: C.ink }}>
                  {t.name}
                </p>
                <p className="text-[8.5px] leading-tight truncate" style={{ color: C.muted }}>
                  {t.years}
                </p>
              </div>
              <p
                className="shrink-0 font-ui font-semibold text-[12.5px] leading-none tabular-nums"
                style={{ color: C.ink }}
              >
                {t.price}
                <span className="ml-1 text-[8px] font-normal" style={{ color: C.dim }}>
                  inc GST
                </span>
              </p>
            </div>

            <div className="mt-2 flex items-center gap-2.5" style={{ height: 16 }}>
              <span
                className="w-[92px] sm:w-[118px] shrink-0 truncate text-[9.5px] font-semibold"
                style={{ color: C.ink }}
              >
                Weighted overall
              </span>
              <Bar pct={t.score} h={5} leads={t.leads} />
              <span
                className="w-6 shrink-0 text-right font-ui font-semibold text-[12px] tabular-nums"
                style={{ color: t.leads ? TONE.good.text : C.ink }}
              >
                {t.score}
              </span>
              <Position label={t.position} />
            </div>

            {/* The working, on the one tender whose six the app prints
                on this card. Height animated rather than mounted, so the
                two rows below stay in lockstep with it. */}
            {t.dims ? (
              <motion.div
                className="overflow-hidden"
                initial={false}
                animate={{ height: open ? 96 : 0 }}
                transition={{ duration: 0.4, ease: EASE }}
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
            ) : null}
          </Card>
        ))}
      </div>
    </Frame>
  );
}

/* ── step six · award ────────────────────────────────────────────── */

/** The two tenders that were not taken. They stay Submitted unless the
 *  owner declines them, which is a separate choice inside the dialog. */
const OTHERS = [
  { mono: "CB", name: "Corten Build Co.", price: "$712,800" },
  { mono: "BH", name: "Brightwater Homes", price: "$800,800" },
];

function AwardScreen() {
  // The one event: the award lands. The banner opens, the status chip
  // turns, and the levers become a record of the decision.
  const awarded = useBeat(1250);

  return (
    <Frame crumb="The tender evaluation">
      <motion.div
        className="shrink-0 overflow-hidden"
        initial={false}
        animate={{ height: awarded ? 60 : 0 }}
        transition={{ duration: 0.42, ease: EASE }}
      >
        <div
          className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5"
          style={{ borderColor: TONE.good.border, background: TONE.good.bg }}
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: C.tealInk, color: C.paper }}
          >
            <Award className="size-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold leading-tight" style={{ color: C.ink }}>
              This project is awarded to Meridian Building Co.
            </p>
            <p className="mt-0.5 text-[9.5px] leading-[1.4]" style={{ color: C.muted }}>
              They will be notified immediately and given your contact details so you can move to
              contract.
            </p>
          </div>
        </div>
      </motion.div>

      <Card className="shrink-0 px-3 pt-2.5 overflow-hidden">
        <div className="flex items-center gap-2.5">
          <Mono txt="MB" size={22} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-semibold leading-tight" style={{ color: C.ink }}>
              Meridian Building Co
            </p>
            <p className="text-[9px] leading-tight" style={{ color: C.muted }}>
              14 years in operation
            </p>
          </div>
          <span className="shrink-0">
            {awarded ? (
              <span
                className="inline-flex items-center gap-1 rounded-[5px] px-2 py-[3px] text-[9px] uppercase tracking-[0.08em] font-bold"
                style={{ background: C.tealInk, color: C.paper }}
              >
                Awarded
              </span>
            ) : (
              <Pill tone="ink">Submitted</Pill>
            )}
          </span>
        </div>

        <p className="mt-2 text-[8px] uppercase tracking-[0.16em]" style={{ color: C.dim }}>
          Tender price inc GST
        </p>
        <p
          className="mt-1 font-ui font-semibold text-[20px] leading-none tabular-nums"
          style={{ color: C.ink }}
        >
          $753,500
        </p>
        <p className="mt-1 text-[9px]" style={{ color: C.muted }}>
          34 weeks · Fully priced, no allowances
        </p>

        <div className="mt-2.5 border-t pt-2" style={{ borderColor: C.line }}>
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

        {/* The decision sits on the card, where the app puts it. */}
        <div
          className="mt-2 -mx-3 border-t px-3 py-2 flex items-center justify-between gap-2"
          style={{ borderColor: C.line }}
        >
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold" style={{ color: C.ink }}>
            <ScrollText className="size-3" />
            Read the evaluation
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-[5px] border px-2 py-[3px] text-[9px] font-semibold"
              style={{ borderColor: TONE.good.border, background: TONE.good.bg, color: TONE.good.text }}
            >
              <Star className="size-2.5 fill-current" />
              Shortlisted
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-[5px] px-2 py-[3px] text-[9px] font-semibold transition-opacity duration-300"
              style={{
                background: C.ink,
                color: C.canvas,
                opacity: awarded ? 0.35 : 1,
              }}
            >
              <Award className="size-2.5" />
              Award
            </span>
          </span>
        </div>
      </Card>

      {/* What the decision leaves behind. The two tenders that were not
          taken stay Submitted: declining them is a separate choice the
          owner makes inside the award dialog. */}
      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col gap-1.5">
        <motion.p
          className="shrink-0 text-[9px] leading-[13px]"
          style={{ color: C.dim }}
          initial={false}
          animate={{ opacity: awarded ? 1 : 0 }}
          transition={{ duration: 0.4, delay: awarded ? 0.2 : 0 }}
        >
          The record below stays exactly as it stood on decision day.
        </motion.p>
        {OTHERS.map((o) => (
          <Card key={o.name} className="px-3 py-1.5">
            <div className="flex items-center gap-2.5">
              <Mono txt={o.mono} size={18} />
              <p className="min-w-0 flex-1 truncate text-[10.5px] font-semibold" style={{ color: C.ink }}>
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
      </div>
    </Frame>
  );
}

/* ── the journey ─────────────────────────────────────────────────── */

/**
 * Holds are budgeted against reading load, not evenly: the two screens
 * that carry one figure get the least, the comparison gets the most.
 * The rail fills across each hold, so these numbers are the pacing.
 * Nineteen seconds end to end.
 */
export const HOMEOWNER_JOURNEY: HeroStep[] = [
  { key: "upload", label: "Upload", hold: 2800, Screen: UploadScreen },
  { key: "scope", label: "Your scope", hold: 2600, Screen: ScopeScreen },
  { key: "round", label: "Builders join", hold: 3200, Screen: RoundScreen },
  { key: "tenders", label: "Tenders in", hold: 3000, Screen: TendersScreen },
  { key: "compare", label: "Compare", hold: 4000, Screen: CompareScreen },
  { key: "award", label: "Award", hold: 3200, Screen: AwardScreen },
];
