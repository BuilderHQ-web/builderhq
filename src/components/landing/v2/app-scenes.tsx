"use client";

/**
 * App scenes: faithful, reduced-scale reproductions of screens the
 * BuilderHQ product actually ships, one per spine step per lens. Dark
 * product UI on the light deck cards is deliberate (a real screenshot
 * sitting on a clean card), and the app is teal, so every scene stays
 * teal regardless of the card's role hue.
 *
 * Every label, count, division name, price and status below is lifted
 * from the running app:
 *
 *   owner pack review      · the register, the stats band, the chapter
 *                            nav, the provisional sum cards, the rail
 *   owner evaluation       · the round strip, the tender cards, the six
 *                            published dimensions, the flag counts
 *   builder browse         · the marketplace docket
 *   builder project        · the scope stats band, the division browser
 *   builder tender deck    · the schedule marks, the instrument contents
 *
 * Project data is the example round the app seeds: Pascoe Vale VIC,
 * nine documents, 211 pages, 242 items identified, 228 tenderable
 * across 29 trades, three builders on a three spot round.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  Bookmark,
  Building,
  Check,
  ChevronDown,
  FileText,
  Files,
  Home,
  Landmark,
  Layers,
  Lock,
  Mail,
  MapPin,
  Rocket,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import type { Role } from "./content";
import { LoopToast } from "./mocks";
import { SceneCursor, useSceneScript } from "./scene-motion";

/* Real product palette (teal app on dark chrome). */
const INK = "#e9f1f9";
const MUT = "#93a6b7";
const DIM = "#617483";
const LINE = "rgba(120,180,255,0.10)";
const CARD = "rgba(255,255,255,0.03)";
const TEAL = "#00d4c8";
const TEALS = "#7ef5ed";
const AMBER = "#ffb547";
const RUST = "#f0a19a";
const STONE = "#a9b3bd";

/* ── Primitives ─────────────────────────────────────────────────── */

function Frame({
  crumb,
  avatar = "WG",
  children,
  toast,
}: {
  crumb: string;
  avatar?: string;
  children: React.ReactNode;
  toast?: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#0a1119" }}>
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b shrink-0" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo height={16} />
          <span className="text-[11.5px] truncate" style={{ color: DIM }}>/ {crumb}</span>
        </div>
        <span className="size-[26px] rounded-full text-[9.5px] font-bold inline-flex items-center justify-center" style={{ background: "rgba(0,212,200,0.16)", color: TEALS }}>
          {avatar}
        </span>
      </div>
      <div className="relative flex-1 p-4 sm:p-5 overflow-hidden flex flex-col justify-center gap-2.5">
        {children}
      </div>
      {toast}
    </div>
  );
}

function Card({ children, className = "", accent = false }: { children: React.ReactNode; className?: string; accent?: boolean }) {
  return (
    <div
      className={"rounded-lg border " + className}
      style={{
        borderColor: accent ? "rgba(0,212,200,0.30)" : LINE,
        background: accent ? "rgba(0,212,200,0.06)" : CARD,
      }}
    >
      {children}
    </div>
  );
}

function Tile({ v, l, tone }: { v: string; l: string; tone?: "teal" | "amber" }) {
  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: LINE, background: CARD }}>
      <p className="font-ui font-semibold text-[17px] leading-none tabular-nums" style={{ color: tone === "amber" ? AMBER : tone === "teal" ? TEALS : INK }}>
        {v}
      </p>
      <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.1em]" style={{ color: DIM }}>{l}</p>
    </div>
  );
}

function Avatar({ txt }: { txt: string }) {
  return (
    <span className="size-8 shrink-0 rounded-lg text-[10.5px] font-bold inline-flex items-center justify-center" style={{ background: "rgba(120,180,255,0.10)", color: MUT }}>
      {txt}
    </span>
  );
}

function Badge({ children, tone = "teal" }: { children: React.ReactNode; tone?: "teal" | "line" | "amber" }) {
  const s =
    tone === "amber"
      ? { border: "rgba(255,181,71,0.4)", bg: "rgba(255,181,71,0.10)", color: AMBER }
      : tone === "line"
        ? { border: LINE, bg: "transparent", color: MUT }
        : { border: "rgba(0,212,200,0.4)", bg: "rgba(0,212,200,0.12)", color: TEALS };
  return (
    <span className="inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-[3px] text-[9px] tracking-[0.08em] uppercase font-bold whitespace-nowrap" style={{ borderColor: s.border, background: s.bg, color: s.color }}>
      {children}
    </span>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <span className="block h-[4px] w-full rounded-full overflow-hidden" style={{ background: "rgba(120,180,255,0.10)" }}>
      <span className="block h-full rounded-full" style={{ width: pct + "%", background: `linear-gradient(90deg, ${TEAL}, ${TEALS})` }} />
    </span>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] tracking-[0.18em] uppercase font-semibold" style={{ color: DIM }}>
      {children}
    </p>
  );
}

function TealBtn({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full text-[11.5px] font-bold" style={{ background: TEAL, color: "#03121a" }}>
      {children}
    </span>
  );
}

/** A register row: standard name, the consultant's filename, kind, pages. */
function DocRow({ name, file, kind, pages }: { name: string; file: string; kind?: string; pages: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2" style={{ borderColor: LINE, background: CARD }}>
      <FileText className="size-3.5 shrink-0" style={{ color: DIM }} />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium leading-tight truncate" style={{ color: INK }}>{name}</p>
        <p className="text-[9.5px] leading-tight truncate" style={{ color: DIM }}>{file}</p>
      </div>
      {kind ? (
        <span className="hidden sm:inline shrink-0 rounded-full border px-1.5 py-[2px] text-[8.5px] tracking-[0.08em] uppercase" style={{ borderColor: LINE, color: MUT }}>
          {kind}
        </span>
      ) : null}
      <span className="shrink-0 w-[46px] text-right text-[9.5px] tabular-nums" style={{ color: DIM }}>{pages}</span>
    </div>
  );
}

/** One division of the scope of works, collapsed or open.
 *
 *  `cursorKey` marks the header row as a target the scene's timeline can
 *  send the pointer to; `hot` is the hover state a real pointer would
 *  produce, driven by the script rather than by CSS, so it survives the
 *  synthetic cursor having no actual hover. */
function Division({
  label,
  count,
  open,
  cursorKey,
  hot,
  children,
}: {
  label: string;
  count: string;
  open?: boolean;
  cursorKey?: string;
  hot?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border overflow-hidden transition-colors duration-200"
      style={{
        borderColor: hot || open ? "rgba(0,212,200,0.28)" : LINE,
        background: hot ? "rgba(0,212,200,0.05)" : CARD,
      }}
    >
      <div data-cursor={cursorKey} className="flex items-center gap-2.5 px-3 py-[7px]">
        <span className="min-w-0 flex-1 text-[11.5px] font-medium truncate" style={{ color: INK }}>{label}</span>
        <span className="shrink-0 text-[10px] tabular-nums" style={{ color: DIM }}>{count}</span>
        <ChevronDown
          className="size-3 shrink-0 transition-transform duration-[280ms]"
          style={{ color: DIM, transform: open ? "rotate(180deg)" : undefined }}
        />
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t px-3 py-2 flex flex-col gap-2" style={{ borderColor: LINE }}>{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** A scope line: the item, its plain sentence, its citation. */
function ScopeLine({
  label,
  plain,
  cite,
  citeKey,
  citeHot,
  right,
}: {
  label: string;
  plain: string;
  cite?: string;
  citeKey?: string;
  citeHot?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium leading-tight" style={{ color: INK }}>{label}</p>
        <p className="mt-0.5 text-[10px] leading-[1.45] line-clamp-2" style={{ color: MUT }}>{plain}</p>
        {cite ? (
          <p
            data-cursor={citeKey}
            className="mt-0.5 inline-block max-w-full truncate rounded px-1 -mx-1 text-[9px] transition-colors duration-200"
            style={
              citeHot
                ? { color: "#03121a", background: TEALS, fontWeight: 600 }
                : { color: DIM }
            }
          >
            {cite}
          </p>
        ) : null}
      </div>
      {right ? <span className="shrink-0 pt-0.5">{right}</span> : null}
    </div>
  );
}

/** The four marks a builder can put on a line, plus the carry chip. */
function Mark({ label, on, tone = "teal" }: { label: string; on?: boolean; tone?: "teal" | "rust" | "stone" }) {
  const bg = tone === "rust" ? RUST : tone === "stone" ? STONE : TEAL;
  return (
    <span
      className="inline-flex items-center h-[22px] px-2 rounded-full border text-[9.5px] whitespace-nowrap"
      style={
        on
          ? { borderColor: "transparent", background: bg, color: "#03121a", fontWeight: 700 }
          : { borderColor: LINE, background: "transparent", color: MUT }
      }
    >
      {label}
    </span>
  );
}

/** The marketplace docket, miniaturised: band, body, round state. */
function ProjectDocket() {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: LINE, background: CARD }}>
      <div className="relative h-[62px] overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(126,245,237,0.16), rgba(0,212,200,0.10))" }}>
        <div aria-hidden className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(142,252,244,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.10) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <Home aria-hidden className="absolute -right-3 -bottom-5 size-[84px]" strokeWidth={0.8} style={{ color: "rgba(120,180,255,0.16)" }} />
        <span className="absolute top-1.5 left-2.5 inline-flex items-center gap-1 px-1.5 py-[2px] rounded-[3px] border text-[8.5px] tracking-[0.14em] uppercase font-semibold" style={{ borderColor: "rgba(0,212,200,0.32)", background: "rgba(3,9,15,0.62)", color: TEALS }}>
          <Home className="size-2.5" /> Single dwelling
        </span>
        <span className="absolute top-1.5 right-2.5 inline-flex size-5 items-center justify-center rounded-[4px] border" style={{ borderColor: LINE, background: "rgba(3,9,15,0.62)", color: DIM }}>
          <Bookmark className="size-3" />
        </span>
        <div className="absolute left-2.5 bottom-1.5">
          <p className="text-[7.5px] leading-none tracking-[0.18em] uppercase font-semibold" style={{ color: MUT }}>Project budget</p>
          <p className="mt-1 font-ui font-semibold text-[15px] leading-none tabular-nums" style={{ color: INK }}>$500k to $1m</p>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-[12.5px] font-semibold leading-tight truncate" style={{ color: INK }}>Double-storey home with basement</p>
        <p className="mt-1 flex items-center gap-1 text-[10.5px]" style={{ color: MUT }}>
          <MapPin className="size-3" style={{ color: DIM }} /> Pascoe Vale, VIC
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {[["4", "beds"], ["4", "baths"], ["3", "storeys"], ["600-800", "Land m²"]].map(([v, l]) => (
            <span key={l} className="inline-flex items-center gap-1 h-[20px] px-1.5 rounded-[4px] border" style={{ borderColor: LINE }}>
              <span className="text-[10.5px] font-semibold leading-none tabular-nums" style={{ color: INK }}>{v}</span>
              <span className="text-[7.5px] tracking-[0.12em] uppercase" style={{ color: DIM }}>{l}</span>
            </span>
          ))}
        </div>
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px]" style={{ color: TEALS }}>
          <BookOpenCheck className="size-3 shrink-0" />
          <span className="truncate">
            9 tender documents analysed
            <span style={{ color: MUT }}> · 211 pages read · 242 scope items identified</span>
          </span>
        </p>
      </div>
      <div className="flex items-center justify-between border-t px-3 py-1.5" style={{ borderColor: LINE }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center gap-[3px]" aria-hidden>
            <i className="size-1.5 rounded-full" style={{ background: TEAL }} />
            <i className="size-1.5 rounded-full" style={{ background: "rgba(120,180,255,0.22)" }} />
            <i className="size-1.5 rounded-full" style={{ background: "rgba(120,180,255,0.22)" }} />
          </span>
          <span className="text-[10.5px]" style={{ color: MUT }}>2 of 3 spots open</span>
        </span>
        <span className="text-[10.5px] tabular-nums" style={{ color: DIM }}>$149 to enter</span>
      </div>
    </div>
  );
}

/** A quieter docket for the rounds below the fold on browse. */
function DocketMini({ Icon, title, sub, price }: { Icon: typeof Layers; title: string; sub: string; price: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD }}>
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md" style={{ background: "rgba(0,212,200,0.10)", color: TEALS }}>
        <Icon className="size-3" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold leading-none truncate" style={{ color: INK }}>{title}</p>
        <p className="mt-1 text-[9px] leading-none truncate" style={{ color: DIM }}>{sub}</p>
      </div>
      <span className="shrink-0 text-[10px] tabular-nums" style={{ color: MUT }}>{price}</span>
    </div>
  );
}

/** A builder on the round: identity, then the checks. */
function BuilderRow({
  txt,
  name,
  sub,
  licence,
  right,
  state,
}: {
  txt: string;
  name: string;
  sub: string;
  licence: string;
  right?: React.ReactNode;
  state?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5" style={{ borderColor: LINE, background: CARD }}>
      <Avatar txt={txt} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: INK }}>{name}</p>
        <p className="text-[9.5px] leading-tight truncate" style={{ color: DIM }}>{sub}</p>
        <span className="mt-1 flex items-center gap-1.5">
          <Chip label="ABN" />
          <Chip label={licence} />
          {state ? <span className="text-[9px]" style={{ color: DIM }}>{state}</span> : null}
        </span>
      </div>
      {right ? <span className="shrink-0">{right}</span> : null}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-[1px] text-[8.5px] tracking-[0.06em] uppercase" style={{ borderColor: "rgba(0,212,200,0.32)", color: TEALS }}>
      <ShieldCheck className="size-2.5" /> {label}
    </span>
  );
}

/** One tender in the evaluation: the number, the read, the flags. */
function TenderRow({
  txt,
  name,
  price,
  sub,
  score,
}: {
  txt: string;
  name: string;
  price: string;
  sub: string;
  score: number;
}) {
  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: LINE, background: CARD }}>
      <div className="flex items-center gap-2.5">
        <Avatar txt={txt} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: INK }}>{name}</p>
          <p className="text-[9.5px] leading-tight truncate" style={{ color: DIM }}>{sub}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-ui font-semibold text-[12.5px] tabular-nums leading-none" style={{ color: INK }}>{price}</p>
          <p className="text-[8.5px] mt-0.5 uppercase tracking-[0.1em]" style={{ color: DIM }}>inc GST</p>
        </div>
        <span className="shrink-0 w-7 text-right font-ui font-semibold text-[14px] tabular-nums" style={{ color: TEALS }}>{score}</span>
      </div>
      <div className="mt-1.5"><Bar pct={score} /></div>
    </div>
  );
}

/* ── AppScene router ────────────────────────────────────────────── */

/**
 * `active` is true only for the card the visitor is actually reading.
 * The deck pins four cards at one offset, so a scene must be told; it
 * cannot work this out from its own visibility.
 */
export function AppScene({
  role,
  step,
  active = false,
}: {
  role: Role;
  step: number;
  active?: boolean;
}) {
  if (role === "homeowner") return <HomeownerScene step={step} active={active} />;
  if (role === "builder") return <BuilderScene step={step} />;
  return <ArchitectScene step={step} />;
}

/* ── Scope of works · the demonstrated scene ─────────────────────────
   The one scene that is driven rather than drawn. The claim beside it
   is that the list is written in plain English and tied to the page it
   came from, so that is precisely what the pointer does: opens a
   division nobody has looked at, reads the citation under a line,
   scrolls the register and opens another. Every state below is real
   component state; nothing is faked over a still.
   ─────────────────────────────────────────────────────────────────── */

type ScopeState = { open: string | null; hot: string | null; cite: boolean; shift: number };

const SCOPE_RESTING: ScopeState = { open: "earthworks", hot: null, cite: false, shift: 0 };

/** Seven of the register's thirty one divisions: enough that the list
 *  runs past the viewport, so the scroll beat has somewhere to go. */
const DIVISIONS: Array<{ key: string; label: string; count: string }> = [
  { key: "prelim", label: "Preliminaries and site establishment", count: "14 items" },
  { key: "approvals", label: "Approvals, certification and compliance", count: "11 items" },
  { key: "earthworks", label: "Earthworks and excavation", count: "8 items" },
  { key: "footings", label: "Footings and ground floor structure", count: "7 items" },
  { key: "retaining", label: "Retaining walls and ground structures", count: "4 items" },
  { key: "concrete", label: "Concrete, formwork and reinforcement", count: "9 items" },
  { key: "steel", label: "Structural steel and framing", count: "12 items" },
];

const LINES: Record<string, Array<{ label: string; plain: string; cite: string }>> = {
  earthworks: [
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
  ],
  approvals: [
    {
      label: "Building permit and mandatory inspections",
      plain: "The permit itself, and the inspections a surveyor must sign off as the build passes each stage.",
      cite: "Specification A1.2, page 7, Rev C",
    },
    {
      label: "Soil classification and site report",
      plain: "The report that says what the ground is made of, which decides how the footings are built.",
      cite: "Geotechnical Report, page 3",
    },
  ],
  footings: [
    {
      label: "Bored piers to engineer's schedule",
      plain: "The concrete columns drilled down to stable ground so the slab does not move with the soil.",
      cite: "Structural S04, page 1, Rev B",
    },
    {
      label: "Waffle raft slab and edge beams",
      plain: "The ground floor slab and the thickened edges that carry the walls above it.",
      cite: "Structural S05, page 2, Rev B",
    },
  ],
};

function ScopeOfWorksScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<ScopeState>({
    enabled: active,
    resting: SCOPE_RESTING,
    rootRef: root,
    script: [
      // Beat one: open a division nobody has looked at.
      { move: "div-approvals" },
      { set: { hot: "approvals" } },
      { click: true },
      { set: { open: "approvals", hot: null } },
      { wait: 620 },
      // Beat two: read where the line came from.
      { move: "cite-approvals" },
      { set: { cite: true } },
      { wait: 1250 },
      { set: { cite: false } },
      // Beat three: scroll the register on and open another.
      { set: { shift: -96 } },
      { wait: 520 },
      { move: "div-footings" },
      { set: { hot: "footings" } },
      { click: true },
      { set: { open: "footings", hot: null } },
      { wait: 1450 },
      { cursor: "hide" },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame crumb="Scope of works" avatar="AV">
        <div className="flex items-center justify-between shrink-0">
          <p className="text-[13px] font-semibold" style={{ color: INK }}>Scope of works</p>
          <Badge><Check className="size-2.5" strokeWidth={3} /> Approved</Badge>
        </div>
        <p className="text-[10.5px] leading-snug shrink-0" style={{ color: MUT }}>
          242 items of work, built from your documents. Every builder prices this same list.
        </p>

        {/* The register, clipped, so the scroll beat reads as a list
            being scrolled rather than a card changing height. */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <motion.div
            className="flex flex-col gap-1.5"
            animate={{ y: state.shift }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            {DIVISIONS.map((d) => (
              <Division
                key={d.key}
                label={d.label}
                count={d.count}
                cursorKey={`div-${d.key}`}
                hot={state.hot === d.key}
                open={state.open === d.key}
              >
                {(LINES[d.key] ?? []).map((l, i) => (
                  <ScopeLine
                    key={l.label}
                    label={l.label}
                    plain={l.plain}
                    cite={l.cite}
                    citeKey={i === 0 ? `cite-${d.key}` : undefined}
                    citeHot={i === 0 && state.cite && state.open === d.key}
                  />
                ))}
              </Division>
            ))}
          </motion.div>

          {/* The register keeps going; say so rather than ending on a
              hard edge mid-row. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
            style={{ background: "linear-gradient(180deg, rgba(10,17,25,0), #0a1119)" }}
          />
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/* ── Homeowner: read → scope → round → evaluation ────────────────── */

function HomeownerScene({ step, active }: { step: number; active: boolean }) {
  if (step === 0)
    return (
      <Frame crumb="Pascoe Vale · the pack" avatar="AV">
        <div className="flex items-center justify-between">
          <Kicker>What we read</Kicker>
          <Badge tone="line">Scope Standard v1.2.0</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Tile v="9" l="Documents read" />
          <Tile v="211" l="Pages read" />
          <Tile v="242" l="Items evidenced" tone="teal" />
        </div>
        <DocRow name="Architectural Plans" file="Architectural Drawings Rev D.pdf" pages="64 pages" />
        <DocRow name="Structural Engineering" file="Structural Drawings Rev C.pdf" pages="38 pages" />
        <DocRow name="Project Specifications" file="Project Specifications.pdf" pages="47 pages" />
        <DocRow name="Geotechnical Report" file="Geotechnical Report.pdf" pages="18 pages" />
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="inline-flex items-center gap-1.5 text-[10.5px]" style={{ color: MUT }}>
            <ShieldCheck className="size-3.5 shrink-0" style={{ color: TEALS }} />
            Checked line by line by a person
          </span>
          <Badge><BadgeCheck className="size-2.5" /> Scope of works ready</Badge>
        </div>
      </Frame>
    );

  if (step === 1) return <ScopeOfWorksScene active={active} />;

  if (step === 2)
    return (
      <Frame
        crumb="Your round · builders"
        avatar="AV"
        toast={<LoopToast icon={<Sparkles className="size-3.5" />} text="Brightwater Homes took the last spot" accent={TEAL} delay={1.8} />}
      >
        <div className="flex items-center justify-between">
          <Kicker>Builders on your round</Kicker>
          <span className="text-[10px] tabular-nums" style={{ color: DIM }}>3 of 3 spots taken</span>
        </div>
        <BuilderRow
          txt="CB"
          name="Corten Build Co."
          sub="6 years in operation · Melbourne, VIC"
          licence="CB-L 88231"
          right={<span className="text-[9.5px] tabular-nums" style={{ color: MUT }}>228 items marked</span>}
        />
        <BuilderRow
          txt="MB"
          name="Meridian Building Co"
          sub="14 years in operation · Brunswick, VIC"
          licence="CDB-U 51102"
          right={<span className="text-[9.5px] tabular-nums" style={{ color: MUT }}>228 items marked</span>}
        />
        <BuilderRow
          txt="BH"
          name="Brightwater Homes"
          sub="22 years in operation · Ivanhoe, VIC"
          licence="CDB-U 22540"
          right={<span className="text-[9.5px] tabular-nums" style={{ color: MUT }}>228 items marked</span>}
        />
        {/* Short: the hero floats a notification chip over this scene's
            bottom-right corner, so the line must clear it. */}
        <p className="text-[10px] leading-snug px-0.5 max-w-[62%]" style={{ color: DIM }}>
          Teal marks are checked against the registers.
        </p>
      </Frame>
    );

  return (
    <Frame crumb="Tenders · before you decide" avatar="AV">
      <div className="grid grid-cols-3 gap-2">
        <Tile v="3" l="Tenders received" />
        <Tile v="$712,800" l="Lowest inc GST" tone="teal" />
        <Tile v="2" l="Significant flags" tone="amber" />
      </div>
      <TenderRow txt="CB" name="Corten Build Co." price="$712,800" sub="36 weeks · 2 significant flags · 6 worth attention" score={53} />
      <TenderRow txt="MB" name="Meridian Building Co" price="$753,500" sub="34 weeks · no significant flags · 3 worth attention" score={77} />
      <TenderRow txt="BH" name="Brightwater Homes" price="$800,800" sub="30 weeks · no significant flags · 2 worth attention" score={89} />
      <div>
        <Kicker>Six published weights, applied to every tender</Kicker>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
          {[
            ["Price firmness", "25"],
            ["Credentials and capacity", "15"],
            ["Scope coverage", "25"],
            ["Delivery and aftercare", "12"],
            ["Preparation", "15"],
            ["Programme confidence", "8"],
          ].map(([l, w]) => (
            <span key={l} className="flex items-baseline gap-2 min-w-0">
              <span className="text-[10px] truncate" style={{ color: MUT }}>{l}</span>
              <span className="ml-auto text-[10px] tabular-nums font-semibold" style={{ color: INK }}>{w}</span>
            </span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ── Builder: browse → scope → schedule → submitted ──────────────── */

function BuilderScene({ step }: { step: number }) {
  if (step === 0)
    return (
      <Frame
        crumb="Browse projects"
        toast={<LoopToast icon={<Sparkles className="size-3.5" />} text="New round in Pascoe Vale, VIC" accent={TEAL} delay={1.8} />}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {["Single dwelling", "VIC", "$500k to $1m"].map((c) => (
            <span key={c} className="rounded-md border px-2 py-[2px] text-[10px]" style={{ borderColor: "rgba(0,212,200,0.28)", background: "rgba(0,212,200,0.06)", color: TEALS }}>{c}</span>
          ))}
          <span className="rounded-md border px-2 py-[2px] text-[10px]" style={{ borderColor: LINE, color: DIM }}>+ Postcode</span>
        </div>
        <ProjectDocket />
        <DocketMini Icon={Layers} title="Rear extension, Northcote" sub="Extension · $500k to $1m · 2 of 3 spots open" price="$99 to enter" />
        <DocketMini Icon={Wrench} title="Kitchen and bathroom renovation, Coburg" sub="Renovation · Under $500k · 3 of 3 spots open" price="$49 to enter" />
        <DocketMini Icon={Building} title="Four townhouses, Reservoir" sub="Multi dwelling · $2m to $3m · 1 spot left" price="$199 to enter" />
      </Frame>
    );

  if (step === 1)
    return (
      <Frame crumb="Pascoe Vale · scope of works">
        <div className="grid grid-cols-3 border-y py-3" style={{ borderColor: LINE }}>
          {[
            ["228", "Scope items"],
            ["29", "Trades"],
            ["7 · $569,801", "Provisional sums"],
          ].map(([v, l], i) => (
            <div key={l} className={"px-2 text-center min-w-0 " + (i ? "border-l" : "")} style={{ borderColor: LINE }}>
              <p className="font-ui font-semibold text-[15px] leading-none tabular-nums truncate" style={{ color: INK }}>{v}</p>
              <p className="mt-1.5 text-[8px] tracking-[0.16em] uppercase font-semibold" style={{ color: DIM }}>{l}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Kicker>Identified scope of works, line by line</Kicker>
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[10px]" style={{ borderColor: LINE, color: DIM }}>
            <Search className="size-3" /> Find an item
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Division label="Preliminaries and site establishment" count="14 items" />
          <Division label="Footings and ground floor structure" count="7 items" open>
            <ScopeLine
              label="Waffle pod slab"
              plain="A concrete slab poured over foam pods that sits on top of the ground, the most common modern house slab."
              cite="Structural S02, page 4, Rev B"
            />
            <ScopeLine
              label="Piers and screw piles"
              plain="Deep supports drilled down to solid ground where the surface soil cannot carry the home."
              cite="Geotechnical Report, page 11"
              right={
                <span className="inline-flex items-center gap-1 text-[9.5px] font-medium whitespace-nowrap" style={{ color: AMBER }}>
                  <Landmark className="size-2.5" /> $24,000 provisional sum
                </span>
              }
            />
          </Division>
          <Division label="Retaining walls and ground structures" count="4 items" />
        </div>
      </Frame>
    );

  if (step === 2)
    return (
      <Frame crumb="Tender · the schedule">
        <div>
          <p className="text-[8.5px] tracking-[0.2em] uppercase font-semibold tabular-nums">
            <span style={{ color: TEALS }}>5.1</span>
            <span style={{ color: DIM }}> · The tender schedule · 5 of 29</span>
          </p>
          <p className="mt-1.5 text-[14px] font-semibold leading-tight" style={{ color: INK }}>
            Footings and ground floor structure
          </p>
          <p className="mt-1 text-[10.5px] leading-snug" style={{ color: MUT }}>
            7 items from the client&rsquo;s documents. Mark what your price does with each one.
          </p>
        </div>
        <div className="rounded-lg border px-3 py-2" style={{ borderColor: "rgba(0,212,200,0.28)", background: "rgba(0,212,200,0.04)" }}>
          <p className="text-[11px] font-semibold leading-tight" style={{ color: INK }}>Waffle pod slab</p>
          <p className="mt-0.5 text-[9.5px]" style={{ color: DIM }}>Structural S02, page 4, Rev B</p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Mark label="Included" on />
            <Mark label="Provisional sum" />
            <Mark label="Excluded" />
            <Mark label="N/A" />
          </div>
        </div>
        <div className="rounded-lg border px-3 py-2" style={{ borderColor: "rgba(0,212,200,0.28)", background: "rgba(0,212,200,0.04)" }}>
          <p className="text-[11px] font-semibold leading-tight" style={{ color: INK }}>Piers and screw piles</p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Mark label="Included" />
            <Mark label="Provisional sum" on />
            <Mark label="Excluded" />
            <Mark label="N/A" />
          </div>
          <p className="mt-2 text-[9.5px]" style={{ color: MUT }}>Provisional sum in your price for this line</p>
          <span className="mt-1 inline-flex items-center h-7 px-2.5 rounded-md border text-[11px] tabular-nums" style={{ borderColor: LINE, background: "rgba(255,255,255,0.02)", color: INK }}>
            $24,000
          </span>
        </div>
        <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: LINE, background: CARD }}>
          <p className="text-[11px] font-semibold leading-tight" style={{ color: INK }}>Termite management system</p>
          <p className="mt-0.5 text-[9.5px]" style={{ color: AMBER }}>The client&rsquo;s schedule carries $3,800 for this line.</p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Mark label="Carry $3,800" on />
            <Mark label="Included" />
            <Mark label="My own figure" />
            <Mark label="Excluded" tone="rust" />
            <Mark label="N/A" tone="stone" />
          </div>
        </div>
      </Frame>
    );

  return (
    <Frame crumb="Tender · submitted">
      <Card accent className="px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold leading-tight" style={{ color: INK }}>Tender submitted</p>
            <p className="mt-0.5 text-[10px] truncate" style={{ color: MUT }}>Signed by Sam Wheeler, Director · 63 of 63 answered</p>
          </div>
          <span className="shrink-0 font-ui font-semibold text-[11.5px] tabular-nums" style={{ color: TEALS }}>BHQ-7A4C21E9</span>
        </div>
      </Card>
      <Kicker>Contents</Kicker>
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: LINE, background: CARD }}>
        {[
          ["01", "Eligibility", "6/6"],
          ["02", "Project understanding", "5/5"],
          ["03", "Company credentials", "9/9"],
          ["04", "Commercial submission", "8/8"],
          ["05", "What’s included", "4/4"],
          ["06", "What’s not included", "3/3"],
          ["07", "Provisional sums and prime costs", "4/4"],
          ["08", "Programme", "7/7"],
          ["09", "Delivery", "8/8"],
          ["10", "Builder commentary", "3/3"],
          ["11", "Sign-off", "6/6"],
        ].map(([n, t, p], i) => (
          <div key={n} className={"flex items-center gap-2.5 px-3 py-[3px] " + (i ? "border-t" : "")} style={{ borderColor: LINE }}>
            <span className="w-4 shrink-0 font-mono text-[9px] tabular-nums" style={{ color: DIM }}>{n}</span>
            <span className="min-w-0 flex-1 text-[10.5px] truncate" style={{ color: INK }}>{t}</span>
            <span className="shrink-0 text-[9.5px] tabular-nums" style={{ color: DIM }}>{p}</span>
            <Check className="size-3 shrink-0" strokeWidth={3} style={{ color: TEALS }} />
          </div>
        ))}
      </div>
      <p className="inline-flex items-center gap-1.5 text-[10px] px-0.5" style={{ color: DIM }}>
        <ScrollText className="size-3" /> The reference prints on every page and verifies online.
      </p>
    </Frame>
  );
}

/* ── Architect: the set → the pack → the round → the evaluation ──── */

function ArchitectScene({ step }: { step: number }) {
  if (step === 0)
    return (
      <Frame crumb="Studio North · Pascoe Vale" avatar="SN">
        <div className="flex items-center justify-between">
          <Kicker>What we read · Scope Standard v1.2.0</Kicker>
          <Badge tone="line">Issued for tender</Badge>
        </div>
        <DocRow name="Architectural Plans" file="Architectural Drawings Rev D.pdf" kind="Architectural" pages="64 pages" />
        <DocRow name="Structural Engineering" file="Structural Drawings Rev C.pdf" kind="Structural" pages="38 pages" />
        <DocRow name="Civil Engineering" file="Civil and Stormwater Design.pdf" kind="Civil" pages="16 pages" />
        <DocRow name="Project Specifications" file="Project Specifications.pdf" kind="Specification" pages="47 pages" />
        <DocRow name="Land Survey" file="Feature and Level Survey.pdf" kind="Survey" pages="4 pages" />
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="inline-flex items-center gap-1.5 text-[10px]" style={{ color: DIM }}>
            <Files className="size-3" /> Geotechnical, energy, planning and window schedule follow
          </span>
          <span className="shrink-0 text-[10px] tabular-nums" style={{ color: MUT }}>211 pages</span>
        </div>
      </Frame>
    );

  if (step === 1)
    return (
      <Frame crumb="Pack review · Pascoe Vale" avatar="SN">
        <div className="grid grid-cols-5 border-y" style={{ borderColor: LINE }}>
          {[
            ["01", "The pack"],
            ["02", "Scope of works"],
            ["03", "Documents"],
            ["04", "Provisional sums"],
            ["05", "Your brief"],
          ].map(([n, t], i) => {
            const active = i === 3;
            return (
              <span key={n} className="relative min-w-0 px-1.5 py-2">
                <span className="block font-mono text-[8px]" style={{ color: active ? TEALS : DIM }}>{n}</span>
                <span className="mt-0.5 block text-[8.5px] truncate" style={{ color: active ? INK : MUT }}>{t}</span>
                <span aria-hidden className="absolute inset-x-0 -bottom-px h-[2px]" style={{ background: active ? TEAL : "transparent" }} />
              </span>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-semibold" style={{ color: INK }}>Provisional sums</p>
          <Badge><Check className="size-2.5" strokeWidth={3} /> 3 of 3 answered</Badge>
        </div>
        <PackDecision
          title="Joinery and cabinetry"
          covers="Kitchen, vanities, robes, laundry and built-in cabinetry."
          state="Budget set: $28,000"
        />
        <PackDecision
          title="Floor coverings"
          covers="Floorboards, carpet, engineered timber and laminate to the areas the drawings show."
          state="Builders will price these"
        />
        <PackDecision
          title="Tile selections"
          covers="The tiles themselves; laying is priced by the builders."
          state="Budget set: $9,000"
        />
        <div className="flex items-center justify-between gap-2 border-t pt-2.5" style={{ borderColor: LINE }}>
          <span className="inline-flex items-center gap-1.5 text-[10px] min-w-0" style={{ color: TEALS }}>
            <Check className="size-3 shrink-0" strokeWidth={3} />
            <span className="truncate">Every question answered.</span>
          </span>
          <TealBtn><Rocket className="size-3" /> Approve and go live</TealBtn>
        </div>
      </Frame>
    );

  if (step === 2)
    return (
      <Frame crumb="Round · invited builders" avatar="SN">
        <div className="flex items-center justify-between">
          <Kicker>Invited builders</Kicker>
          <span className="text-[10px] tabular-nums" style={{ color: DIM }}>2 invited · 3 spots in the round</span>
        </div>
        <BuilderRow
          txt="MB"
          name="Meridian Building Co"
          sub="14 years in operation · Brunswick, VIC"
          licence="CDB-U 51102"
          right={<Badge><Check className="size-2.5" strokeWidth={3} /> Joined</Badge>}
        />
        <BuilderRow
          txt="BH"
          name="Brightwater Homes"
          sub="22 years in operation · Ivanhoe, VIC"
          licence="CDB-U 22540"
          right={<Badge tone="line"><Mail className="size-2.5" /> Invited</Badge>}
        />
        <div className="flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-2.5" style={{ borderColor: LINE }}>
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(120,180,255,0.06)", color: DIM }}>
            <Lock className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-medium leading-tight" style={{ color: MUT }}>1 spot open to the network</p>
            <p className="text-[9.5px] leading-tight truncate" style={{ color: DIM }}>Verified builders across VIC can take it</p>
          </div>
          <Badge tone="amber">Open</Badge>
        </div>
        <p className="text-[10px] leading-snug px-0.5" style={{ color: DIM }}>
          These builders join free. Remaining spots open to the network.
        </p>
      </Frame>
    );

  return (
    <Frame crumb="Tender evaluation" avatar="SN">
      <div>
        <p className="inline-flex items-center gap-1.5 text-[8.5px] tracking-[0.22em] uppercase font-semibold" style={{ color: TEALS }}>
          <Files className="size-3" /> The tender evaluation
        </p>
        <p className="mt-1.5 text-[14px] font-semibold leading-tight truncate" style={{ color: INK }}>
          Double-storey home with basement
        </p>
        <p className="mt-1 text-[10px]" style={{ color: DIM }}>
          Prepared by <span style={{ color: MUT }}>Studio North Architecture</span> with BuilderHQ
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Tile v="3" l="Tenders received" />
        <Tile v="$712,800" l="Lowest inc GST" tone="teal" />
        <Tile v="30 to 36 wks" l="Build period" />
        <Tile v="2" l="Significant flags" tone="amber" />
      </div>
      <div className="flex flex-col gap-1.5">
        {[
          ["CB", "Corten Build Co.", "$712,800", 53],
          ["MB", "Meridian Building Co", "$753,500", 77],
          ["BH", "Brightwater Homes", "$800,800", 89],
        ].map(([t, n, p, s]) => (
          <div key={t as string} className="flex items-center gap-2.5">
            <span className="w-7 shrink-0 text-[9px] font-bold" style={{ color: MUT }}>{t as string}</span>
            <span className="w-[104px] shrink-0 text-[10.5px] truncate" style={{ color: INK }}>{n as string}</span>
            <span className="flex-1"><Bar pct={s as number} /></span>
            <span className="shrink-0 text-[10px] tabular-nums" style={{ color: MUT }}>{p as string}</span>
            <span className="w-6 shrink-0 text-right font-ui font-semibold text-[12px] tabular-nums" style={{ color: TEALS }}>{s as number}</span>
          </div>
        ))}
      </div>
      <p className="inline-flex items-center gap-1.5 text-[10px] px-0.5" style={{ color: DIM }}>
        <ArrowUpRight className="size-3" /> Every score shows its working, line by line.
      </p>
    </Frame>
  );
}

/** One client decision on the pack: what it covers, what was decided. */
function PackDecision({ title, covers, state }: { title: string; covers: string; state: string }) {
  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: LINE, background: CARD }}>
      <div className="flex items-start justify-between gap-2.5">
        <p className="text-[11.5px] font-semibold leading-tight min-w-0" style={{ color: INK }}>{title}</p>
        <span className="shrink-0 inline-flex items-center gap-1 text-[9.5px] font-semibold whitespace-nowrap" style={{ color: TEALS }}>
          <Check className="size-2.5" strokeWidth={3} /> {state}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] leading-[1.45] line-clamp-1" style={{ color: MUT }}>{covers}</p>
    </div>
  );
}
