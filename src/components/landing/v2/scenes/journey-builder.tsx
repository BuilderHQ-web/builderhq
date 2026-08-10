"use client";

/**
 * Builder · the whole story, six screens.
 *
 * The hero plays a builder's week end to end: the register they browse
 * on a Tuesday night, the project they take a spot on, the scope that
 * was written for them before they arrived, the schedule they walk, the
 * document they send, and the job they win. One builder the whole way
 * through, Meridian Building Co, so the same name and the same figure
 * are on the last screen as on the fifth.
 *
 * Every screen is a miniature of a real surface: /builder/browse, the
 * unlocked project page, its scope card, module 5 of the tender deck,
 * the review slide, and the awarded outcome. The strings are the app's
 * own. Two product rules carried over from the kit and easy to break:
 * bright teal is a fill and never type, and the project shows UNLOCKED
 * from the second screen on, because a visitor should see what a spot
 * buys rather than the wall in front of it.
 *
 * Unlike the deck scenes there is no cursor and no script here. A
 * screen mounts, plays a short entrance, fires exactly one event, and
 * is replaced. The step's `hold` is the pacing.
 */

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpenCheck,
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
  type LucideIcon,
} from "lucide-react";

import {
  C,
  TONE,
  ELEV,
  Frame,
  Card,
  Kicker,
  Pill,
  TealBtn,
  Track,
  Division,
  ScopeLine,
  Mark,
  ListFade,
  type HeroStep,
  type ToneKey,
} from "./kit";

/** The app's own entrance easing (journey.tsx, Reveal). */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** The builder the journey follows, and the round they are on. */
const US = "Meridian Building Co";
const PROJECT = "Single dwelling · Pascoe Vale, VIC";

/**
 * The one timer every screen shares: its single event, fired once the
 * entrance has settled. Reduced motion gets the settled state on the
 * first frame instead, since under it the hero holds on step one and
 * nothing would ever arrive to fire it.
 */
function useBeat(ms: number): boolean {
  const reduced = useReducedMotion();
  const [fired, setFired] = React.useState(false);
  React.useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setFired(true), ms);
    return () => window.clearTimeout(t);
  }, [ms, reduced]);
  return fired || Boolean(reduced);
}

/** A palette hex at one of the app's own alphas, so the cover tints
 *  stay provably the palette rather than a second set of colours. */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* ══ 1 · Browse ═════════════════════════════════════════════════════ */

type Docket = {
  id: string;
  title: string;
  where: string;
  budget: string;
  cover: string;
  specs: Array<[string, string]>;
  spots: number;
  taken: number;
};

/** The register with the type filter applied, so every row is work
 *  this builder actually does. The single dwelling spot price is $149. */
const ROUNDS: Docket[] = [
  {
    id: "pascoe",
    title: PROJECT,
    where: "Pascoe Vale, VIC",
    budget: "$1.5m to $2m",
    cover: "/project-covers/single-3.webp",
    specs: [["4", "beds"], ["4", "baths"], ["3", "storeys"]],
    spots: 3,
    taken: 1,
  },
  {
    id: "brunswick",
    title: "New home, Brunswick East",
    where: "Brunswick East, VIC",
    budget: "$1m to $1.5m",
    cover: "/project-covers/single-2.webp",
    specs: [["4", "beds"], ["3", "baths"], ["2", "storeys"]],
    spots: 3,
    taken: 0,
  },
  {
    id: "yarraville",
    title: "New home, Yarraville",
    where: "Yarraville, VIC",
    budget: "$1m to $1.5m",
    cover: "/project-covers/single-1.webp",
    specs: [["3", "beds"], ["2", "baths"], ["1", "storey"]],
    spots: 3,
    taken: 1,
  },
];

function BrowseScreen() {
  // The event: the analysed line arrives on the round the story
  // follows, which is the one thing on the register a builder cannot
  // get anywhere else.
  const analysed = useBeat(820);

  return (
    <Frame crumb="Browse projects" avatar="MB">
      <div className="shrink-0">
        <Kicker icon={Compass}>Browse</Kicker>
        <p
          className="mt-1.5 font-ui font-semibold uppercase text-[18px] sm:text-[21px] leading-[0.95] tracking-[-0.018em]"
          style={{ color: C.ink }}
        >
          Open tender rounds
        </p>
        <p className="mt-1.5 text-[9.5px] sm:text-[10px] leading-[1.5]" style={{ color: C.muted }}>
          12 projects live across Australia. 3 more running privately. 1 filter applied.
        </p>
      </div>

      <FilterBar />

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-2">
          {ROUNDS.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.05 + i * 0.08, ease: EASE }}
            >
              <DocketRow d={d} analysed={i === 0 && analysed} />
            </motion.div>
          ))}
        </div>
        <ListFade />
      </div>
    </Frame>
  );
}

/** The GET form, ruled top and bottom, carrying the applied type. */
function FilterBar() {
  return (
    <div
      className="shrink-0 grid items-center gap-2 border-y py-2"
      style={{
        borderColor: C.line,
        gridTemplateColumns: "minmax(0,1.4fr) minmax(0,116px) auto",
      }}
    >
      <span
        className="flex items-center h-7 px-2 rounded-[3px] border text-[10px] truncate"
        style={{ borderColor: C.line2, background: C.paper, color: C.faint }}
      >
        Search by title
      </span>
      <span
        className="flex items-center justify-between gap-1 h-7 px-2 rounded-[3px] border text-[10px]"
        style={{ borderColor: C.tealLine, background: C.tealWash, color: C.tealInk }}
      >
        <span className="truncate">Single dwelling</span>
        <ChevronDown className="size-3 shrink-0" strokeWidth={2.2} />
      </span>
      <span
        className="inline-flex items-center justify-center h-7 px-3.5 rounded-md text-[10.5px] font-semibold tracking-[0.04em]"
        style={{ background: C.teal, color: C.onTeal, boxShadow: `0 0 0 1px ${C.tealLine}` }}
      >
        Apply
      </span>
    </div>
  );
}

/** One docket: the tinted band with the drawn cover and the budget, the
 *  body, and the state rail. Three panels, one round per row. */
function DocketRow({ d, analysed }: { d: Docket; analysed?: boolean }) {
  const left = Math.max(0, d.spots - d.taken);

  return (
    <div
      className="flex rounded-xl border overflow-hidden"
      style={{ borderColor: C.line, background: C.paper, boxShadow: ELEV }}
    >
      {/* the band — the type's paper with the ink drawing multiplied on */}
      <div className="relative shrink-0 w-[80px] sm:w-[98px] border-r overflow-hidden" style={{ borderColor: C.line }}>
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom right, ${alpha(C.teal, 0.22)}, ${alpha(C.blue, 0.12)})`,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={d.cover}
          alt=""
          className="absolute inset-0 size-full object-cover mix-blend-multiply"
          style={{ objectPosition: "center 42%" }}
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[36px]"
          style={{
            background: `linear-gradient(to top, ${alpha(C.paper, 0.94)} 40%, ${alpha(C.paper, 0.5)}, transparent)`,
          }}
        />
        <span
          className="absolute top-1 left-1 inline-flex items-center gap-[3px] px-[3px] py-[1px] rounded-[3px] border text-[6px] sm:text-[6.5px] tracking-[0.06em] uppercase font-semibold whitespace-nowrap"
          style={{ borderColor: C.line, background: alpha(C.paper, 0.8), color: C.ink }}
        >
          <Home className="size-[8px]" style={{ color: C.tealInk }} strokeWidth={2.2} />
          Single dwelling
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
      <div className="min-w-0 flex-1 px-2 py-1.5 flex flex-col justify-center gap-1">
        <p className="font-ui font-semibold text-[10.5px] sm:text-[11.5px] leading-[1.3] truncate" style={{ color: C.ink }}>
          {d.title}
        </p>
        <p className="flex items-center gap-1 text-[9px] min-w-0" style={{ color: C.muted }}>
          <MapPin className="size-[10px] shrink-0" style={{ color: C.dim }} />
          <span className="truncate">{d.where}</span>
        </p>
        <div className="flex items-center gap-1 overflow-hidden">
          {d.specs.map(([v, l]) => (
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
        </div>
        {analysed ? (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.38, ease: EASE }}
          >
            <p className="flex items-center gap-1 pt-[2px] text-[8.5px] min-w-0" style={{ color: C.tealInk }}>
              <BookOpenCheck className="size-[10px] shrink-0" />
              <span className="truncate">
                9 tender documents analysed · 211 pages read · 242 scope items identified
              </span>
            </p>
          </motion.div>
        ) : null}
      </div>

      {/* the state rail — the dots first, the fee after */}
      <div
        className="shrink-0 w-[86px] sm:w-[100px] border-l px-1.5 py-1.5 overflow-hidden flex flex-col items-end justify-center gap-1"
        style={{ borderColor: C.line }}
      >
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
          $149 to enter
        </span>
      </div>
    </div>
  );
}

/* ══ 2 · The project ════════════════════════════════════════════════ */

/** The pre-unlock fact sheet, now read with the address on it. */
const FACTS: Array<[string, string]> = [
  ["Type", "Single dwelling"],
  ["Storeys", "3"],
  ["Bedrooms", "4"],
  ["Bathrooms", "4"],
  ["Land size", "600 to 800 m²"],
  ["Budget", "$1.5m to $2m"],
];

/** The register with its real filenames. Nine on the round; the three
 *  a builder opens first are the ones on screen. */
const DOCS: Array<[string, string, string]> = [
  ["Architectural plans", "Architectural Drawings Rev D.pdf", "8.4 MB"],
  ["Structural engineering", "Structural Drawings Rev C.pdf", "5.7 MB"],
  ["Civil engineering", "Civil and Stormwater Design.pdf", "3.1 MB"],
];

function ProjectScreen() {
  // The event: the round's own bar arrives at the foot of the page.
  const bar = useBeat(700);

  return (
    <Frame
      crumb={PROJECT}
      avatar="MB"
      // The round's own bar is fixed to the foot of the real page, so it
      // is pinned here too: on a short frame it stays legible while the
      // register behind it clips, which is what the app does.
      overlay={
        bar ? (
          <motion.div
            className="absolute inset-x-0 bottom-0 z-20 border-t px-3 py-1.5 flex items-center justify-between gap-2"
            style={{ borderColor: C.tealLine, background: C.paper }}
            initial={{ y: 22, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div className="min-w-0 flex items-center gap-2">
              <span
                className="shrink-0 inline-flex size-6 items-center justify-center rounded-md border"
                style={{ borderColor: C.tealLine, background: C.tealMuted, color: C.tealInk }}
              >
                <FileText className="size-3" />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold leading-tight" style={{ color: C.ink }}>
                  Ready to tender on this project?
                </p>
                <p className="mt-[1px] text-[8.5px] leading-tight truncate" style={{ color: C.dim }}>
                  Twelve short modules, about thirty minutes.
                </p>
              </div>
            </div>
            <TealBtn>Start your tender</TealBtn>
          </motion.div>
        ) : null
      }
    >
      <div className="shrink-0">
        <span
          className="inline-flex items-center gap-1.5 text-[8.5px] tracking-[0.22em] uppercase font-semibold"
          style={{ color: C.tealInk }}
        >
          <Unlock className="size-[10px]" />
          You hold a spot
        </span>
        <p
          className="mt-1 font-ui font-semibold uppercase text-[16px] sm:text-[19px] leading-[0.95] tracking-[-0.018em]"
          style={{ color: C.ink }}
        >
          {PROJECT}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[10px] min-w-0" style={{ color: C.muted }}>
          <MapPin className="size-3 shrink-0" style={{ color: C.tealInk }} />
          <span className="truncate font-ui font-medium" style={{ color: C.ink }}>
            18 Miller Street, Pascoe Vale VIC 3044
          </span>
        </p>
      </div>

      <Ruled label="Key details" icon={Home}>
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
          {FACTS.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <p className="text-[7.5px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>
                {k}
              </p>
              <p className="mt-0.5 font-ui font-semibold text-[11px] leading-tight truncate" style={{ color: C.ink }}>
                {v}
              </p>
            </div>
          ))}
        </div>
      </Ruled>

      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
        <Ruled label="Documents · 9" icon={FileText}>
          <div className="mb-1.5">
            <span
              className="inline-flex items-center gap-1.5 h-6 px-2 rounded-sm border text-[9.5px] font-medium"
              style={{ borderColor: C.tealLine, background: C.tealMuted, color: C.tealInk }}
            >
              <Download className="size-3" />
              Download all
              <span style={{ color: C.dim }}>· 9</span>
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {DOCS.map(([cat, name, size], i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: 0.06 + i * 0.07, ease: EASE }}
              >
                <p className="text-[7.5px] tracking-[0.18em] uppercase mb-1" style={{ color: C.dim }}>
                  {cat}
                </p>
                <div
                  className="flex items-center justify-between gap-2 px-2 py-1 rounded-sm border"
                  style={{ borderColor: C.line, background: C.wash }}
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
              </motion.div>
            ))}
          </div>
        </Ruled>
        <ListFade />
      </div>

      {/* The app keeps a pb-32 spacer under its fixed bar; the mini
          keeps its own so the register never runs beneath it. */}
      <div aria-hidden className="shrink-0" style={{ height: 40 }} />
    </Frame>
  );
}

/** A ruled section: teal label, then a hairline to the right edge. */
function Ruled({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-0 shrink-0">
      <header className="flex items-center gap-2">
        <Icon className="size-3 shrink-0" style={{ color: C.tealInk }} strokeWidth={2.2} />
        <h3 className="text-[8.5px] tracking-[0.2em] uppercase font-semibold shrink-0" style={{ color: C.tealInk }}>
          {label}
        </h3>
        <span aria-hidden className="h-px flex-1" style={{ background: C.line }} />
      </header>
      <div className="pt-2">{children}</div>
    </section>
  );
}

/* ══ 3 · The scope ══════════════════════════════════════════════════ */

/** Four of the round's twenty nine divisions. Footings is open because
 *  it is the one the builder walks two screens later. */
const DIVISIONS: Array<{ key: string; label: string; count: string }> = [
  { key: "footings", label: "Footings and ground floor structure", count: "7 items" },
  { key: "concrete", label: "Concrete, formwork and reinforcement", count: "9 items" },
  { key: "steel", label: "Structural steel and framing", count: "12 items" },
  { key: "roofing", label: "Roofing, gutters and downpipes", count: "10 items" },
];

function ScopeScreen() {
  return (
    <Frame crumb="Scope of works" avatar="MB">
      <div className="shrink-0">
        <Kicker icon={Layers}>Scope of works</Kicker>
        {/* The stats band on the real page: no boxes, centred figures
            over quiet labels, ruled above and below. */}
        <div className="mt-2 grid grid-cols-3 border-y py-2.5" style={{ borderColor: C.line }}>
          {[
            ["Scope items", 228],
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
        <p className="mt-2 text-[9.5px] leading-[1.5]" style={{ color: C.muted }}>
          Every item below goes into your tender. When you tender, you mark what your price does with each one.
        </p>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-1.5">
          {DIVISIONS.map((d, i) => (
            <motion.div
              key={d.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.05 + i * 0.06, ease: EASE }}
            >
              <Division label={d.label} count={d.count} open={d.key === "footings"}>
                <ScopeLine
                  label="Waffle pod slab"
                  plain="A concrete slab poured over foam pods that sits on top of the ground, the most common modern house slab."
                  cite="Structural S02, page 4, Rev B"
                />
                <ScopeLine
                  label="Piers and screw piles"
                  plain="Deep supports drilled or screwed down to solid ground where the surface soil cannot carry the home."
                  cite="Geotechnical Report, page 11"
                />
              </Division>
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
 * result. Ease out cubic, so it decelerates onto the real total.
 */
function CountUp({ to }: { to: number }) {
  const reduced = useReducedMotion();
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (reduced) return;
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
  }, [to, reduced]);
  return <>{reduced ? to : n}</>;
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

function TenderScreen() {
  // The event: one line is settled in a single tap. The chip fills, the
  // card takes the teal wash and drops its lift, and the header counter
  // and the track move on the same frame, exactly as the deck does it.
  const marked = useBeat(880);
  const answered = marked ? 19 : 18;

  return (
    <Frame crumb="Tender · the schedule" avatar="MB">
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
        <h2 className="mt-1 font-ui font-semibold tracking-[-0.02em] text-[13px] sm:text-[15px] leading-[1.25]" style={{ color: C.ink }}>
          Footings and ground floor structure
        </h2>
        <p className="mt-1 text-[9.5px] leading-[1.5]" style={{ color: C.muted }}>
          3 lines from the client&rsquo;s documents. Mark what your price does with each one.
        </p>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-1.5">
          {LINES.map((line, i) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.05 + i * 0.07, ease: EASE }}
            >
              <Card
                tone={i === 0 && marked ? "accent" : "plain"}
                className="px-2.5 py-2 transition-[background-color,border-color,box-shadow] duration-300"
              >
                <p className="text-[10.5px] font-ui font-semibold leading-[1.35]" style={{ color: C.ink }}>
                  {line.label}
                </p>
                <p className="mt-0.5 text-[9px] leading-[1.45] line-clamp-2" style={{ color: C.muted }}>
                  {line.plain}
                </p>
                <p className="mt-0.5 text-[8.5px] truncate" style={{ color: C.dim }}>
                  {line.cite}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {MARKS.map((m) => (
                    <Mark
                      key={m.key}
                      label={m.label}
                      tone={m.tone}
                      on={i === 0 && marked && m.key === "included"}
                    />
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
        <ListFade />
      </div>
    </Frame>
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

function SubmitScreen() {
  // The event: the two-step submit resolves and the tender seals. It is
  // the one thing on this screen that cannot be undone by editing, so
  // the control is replaced rather than merely ticked.
  const sealed = useBeat(1750);

  return (
    <Frame
      crumb="Tender submission"
      avatar="MB"
      right={
        <span className="inline-flex items-center gap-1 text-[9.5px]" style={{ color: C.dim }}>
          <Check className="size-2.5" strokeWidth={3} style={{ color: C.tealInk }} />
          Saved
        </span>
      }
      // The deck's footer controls are ruled off at the foot of the
      // page, and sealing is the whole point of this screen, so the
      // control keeps its place at every frame height.
      overlay={
        <div
          className="absolute inset-x-0 bottom-0 z-20 border-t px-3 py-1.5 h-[42px] flex items-center"
          style={{ borderColor: C.line, background: C.canvas }}
        >
          {sealed ? (
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: EASE }}
            >
              <span
                className="inline-flex size-6 items-center justify-center rounded-full"
                style={{ background: C.teal, color: C.onTeal }}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-ui font-semibold leading-tight" style={{ color: C.ink }}>
                  Tender submitted
                </p>
                <p className="text-[8.5px] leading-tight truncate" style={{ color: C.dim }}>
                  Sealed and verifiable. Send it anywhere.
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center gap-3">
              <TealBtn>
                Submit tender
                <ArrowRight className="size-3" />
              </TealBtn>
              <span className="text-[9.5px]" style={{ color: C.dim }}>
                Save and exit
              </span>
            </div>
          )}
        </div>
      }
    >
      <div className="shrink-0">
        <Track pct={100} />
        <div className="mt-1.5">
          <Kicker>Review and submit</Kicker>
        </div>
        <p className="mt-0.5 text-[12px] font-ui font-semibold leading-tight tracking-[-0.015em]" style={{ color: C.ink }}>
          Your tender is ready. It reads well.
        </p>
      </div>

      {/* The cover is the document object, not a section. The app prints
          it on white; the kit has no white, so it is the paper with the
          2px ink rule and a lift, which is what makes it read as a page
          rather than another card. */}
      <div
        className="shrink-0 rounded-[4px] px-3 py-1.5"
        style={{ background: C.paper, boxShadow: ELEV }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-ui font-bold text-[10px] tracking-[-0.01em]" style={{ color: C.ink }}>
            BuilderHQ
          </span>
          <span className="text-[6.5px] uppercase font-semibold tracking-[0.28em]" style={{ color: C.dim }}>
            Tender submission
          </span>
        </div>
        <div className="mt-1 h-[2px]" style={{ background: TONE.ink.text }} />
        <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <p className="font-ui text-[11.5px] leading-[1.15] truncate" style={{ color: C.ink }}>
              {PROJECT}
            </p>
            <p className="mt-0.5 text-[8px] leading-tight truncate" style={{ color: C.muted }}>
              {US}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[6.5px] leading-tight uppercase font-semibold tracking-[0.18em]" style={{ color: C.dim }}>
              Price ex GST
            </p>
            <p className="font-ui font-semibold text-[14px] leading-none tabular-nums" style={{ color: C.ink }}>
              $685,000
            </p>
            <p className="text-[8px] leading-tight tabular-nums" style={{ color: C.muted }}>
              $753,500 inc GST
            </p>
          </div>
        </div>
        <div className="mt-1 pt-1 border-t flex items-center justify-end" style={{ borderColor: C.line }}>
          <span className="inline-flex items-center gap-1 text-[8.5px] leading-none font-semibold" style={{ color: C.tealInk }}>
            Read the full document
            <ArrowRight className="size-2.5" />
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="border-t" style={{ borderColor: C.line }}>
          {MODULES.map(([n, title, count]) => (
            <div key={n} className="flex items-center gap-2 py-[2px] border-b" style={{ borderColor: C.line }}>
              <span className="w-3.5 shrink-0 font-mono text-[8px] tabular-nums" style={{ color: C.dim }}>
                {n}
              </span>
              <span className="min-w-0 shrink truncate text-[9.5px]" style={{ color: C.ink }}>
                {title}
              </span>
              <span
                aria-hidden
                className="flex-1 min-w-[10px] border-b border-dotted translate-y-[3px]"
                style={{ borderColor: C.line2 }}
              />
              <span className="shrink-0 text-[8.5px] tabular-nums" style={{ color: C.dim }}>
                {count}
              </span>
              <span
                className="size-[12px] shrink-0 rounded-full inline-flex items-center justify-center"
                style={{ background: C.teal, color: C.onTeal }}
              >
                <Check className="size-[8px]" strokeWidth={3.5} />
              </span>
            </div>
          ))}
        </div>
        <ListFade />
      </div>

      {/* The ledger must not run beneath the pinned control. */}
      <div aria-hidden className="shrink-0" style={{ height: 40 }} />
    </Frame>
  );
}

/* ══ 6 · Won ════════════════════════════════════════════════════════ */

function WonScreen() {
  // The event: the client's band arrives under the decision. It is the
  // whole commercial argument in one rule, so it lands on its own.
  const client = useBeat(760);

  return (
    <Frame crumb="Your tender" avatar="MB">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <Kicker>Tender</Kicker>
          <Pill>
            <Sparkles className="size-2.5" />
            Awarded
          </Pill>
        </div>
        <p
          className="mt-2 font-ui font-semibold uppercase text-[17px] sm:text-[20px] leading-[0.95] tracking-[-0.018em]"
          style={{ color: C.ink }}
        >
          {PROJECT}
        </p>
        <p className="mt-1.5 text-[10px] tabular-nums truncate" style={{ color: C.muted }}>
          {US} · $753,500 inc GST
        </p>
        <p className="mt-2 text-[10.5px] leading-[1.6] max-w-[52ch]" style={{ color: C.muted }}>
          The owner went with you. Well earned. Reach out, agree the contract, and take it from here.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {client ? (
          <motion.div
            className="border-y py-2.5"
            style={{ borderColor: C.tealLine }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.44, ease: EASE }}
          >
            <p className="text-[8.5px] tracking-[0.16em] uppercase font-semibold" style={{ color: C.tealInk }}>
              Your client
            </p>
            <p className="mt-1.5 text-[10.5px] leading-[1.6] max-w-[52ch]" style={{ color: C.ink }}>
              Agree the contract and insurances directly. Your conversation stays in Messages.
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: C.tealInk }}>
              <Check className="size-3 shrink-0" strokeWidth={3} />
              No commission on what you win
            </p>
          </motion.div>
        ) : null}
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <TealBtn>
          <Download className="size-3" />
          Tender document (PDF)
        </TealBtn>
        <span className="text-[9.5px] truncate" style={{ color: C.dim }}>
          Sealed and verifiable. Send it anywhere.
        </span>
      </div>
    </Frame>
  );
}

/* ══ The journey ════════════════════════════════════════════════════ */

/**
 * Six steps, 19.4 seconds. The holds are budgeted against reading load:
 * the register and the schedule carry the most to read and hold longest,
 * the outcome is one sentence and holds least.
 */
export const BUILDER_JOURNEY: HeroStep[] = [
  { key: "browse", label: "Browse", hold: 3400, Screen: BrowseScreen },
  { key: "project", label: "The project", hold: 3200, Screen: ProjectScreen },
  { key: "scope", label: "The scope", hold: 3400, Screen: ScopeScreen },
  { key: "tender", label: "Your tender", hold: 3400, Screen: TenderScreen },
  { key: "submit", label: "Submit", hold: 3200, Screen: SubmitScreen },
  { key: "won", label: "Won", hold: 2800, Screen: WonScreen },
];
