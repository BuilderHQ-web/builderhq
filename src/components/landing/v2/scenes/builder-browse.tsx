"use client";

/**
 * Builder · step one — real projects, ready to price.
 *
 * A reproduction of /builder/browse and the first screen a builder sees
 * once they click through to a project at /builder/projects/[slug]. Two
 * things about the real register are worth a visitor's attention and
 * both are reproduced rather than described:
 *
 *   · The register is a stack of full-width dockets, not a tile grid.
 *     Type, suburb, budget and how many spots remain all read from the
 *     row, before a builder has spent anything.
 *   · Pre-unlock, the filenames on the project genuinely read
 *     "Document 1", "Document 4". That substitution happens on the
 *     server, because consultants name their files after the street
 *     address and a blur is not a wall. The blur on top is cosmetic.
 *
 * Three beats: the pointer sets the type filter and applies it, the
 * register re-settles to the filtered rounds, and the top project opens
 * on its pre-unlock preview with the real $149 spot price.
 */

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpenCheck,
  Bookmark,
  Building,
  ChevronDown,
  Compass,
  CreditCard,
  Download,
  FileText,
  Home,
  Layers,
  Lock,
  MapPin,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, TONE, ELEV, Frame, Kicker, TealBtn, ListFade } from "./kit";

type Phase = "browse" | "detail";
/** `picked` is the type select carrying a value; `filtered` is the
 *  register having been re-queried. They are separate because the app's
 *  filter bar is a GET form: choosing does nothing until Apply. */
type S = { phase: Phase; picked: boolean; filtered: boolean; hot: "" | "type" | "apply" | "top" };

const RESTING: S = { phase: "browse", picked: false, filtered: false, hot: "" };

/* ── The register's data, in the app's own shapes ─────────────────── */

type Kind = "single_dwelling" | "multi_dwelling" | "renovation" | "extension";

/** Type name and mark, from the card's TYPE_META. Note "Multi dwelling"
 *  is unhyphenated on the card even though the filter hyphenates it. */
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

/** A hex from the palette at one of the app's own alphas. Written as a
 *  helper so the cover tints stay provably the palette rather than a
 *  second set of colours living down here. */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** The paper the drawn cover is multiplied onto, per type. */
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
  cover: string;
  specs: Array<[string, string]>;
  spots: number;
  taken: number;
  /** The analysed pack line, only on rounds whose documents were read. */
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
    cover: "/project-covers/ext-ground.webp",
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
    cover: "/project-covers/reno-internal.webp",
    specs: [["4", "beds"], ["2", "baths"], ["1", "storey"]],
    spots: 3,
    taken: 0,
  },
  {
    id: "pascoe",
    kind: "single_dwelling",
    title: "Single dwelling · Pascoe Vale, VIC",
    where: "Pascoe Vale, VIC",
    budget: "$1.5m to $2m",
    cover: "/project-covers/single-3.webp",
    specs: [["4", "beds"], ["4", "baths"], ["3", "storeys"], ["600-800", "Land m²"]],
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
    cover: "/project-covers/multi-4.webp",
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
    cover: "/project-covers/single-2.webp",
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
    cover: "/project-covers/single-1.webp",
    specs: [["3", "beds"], ["2", "baths"], ["1", "storey"], ["400-600", "Land m²"]],
    spots: 3,
    taken: 1,
  },
];

/** The masked document register. The numbers come from the raw upload
 *  order while the rows are grouped by category, so they are out of
 *  sequence within a group on purpose. */
const DOCS: Array<[string, Array<[string, string]>]> = [
  ["Architectural plans", [["Document 1", "8.4 MB"], ["Document 4", "3.1 MB"]]],
  ["Structural engineering", [["Document 2", "5.7 MB"]]],
];

/** The pre-unlock fact sheet for the round the pointer opens. */
const FACTS: Array<[string, string]> = [
  ["Type", "Single dwelling"],
  ["Storeys", "3"],
  ["Bedrooms", "4"],
  ["Bathrooms", "4"],
  ["Land size", "600 to 800 m²"],
  ["Budget", "$1.5m to $2m"],
];

export function BuilderBrowseScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 1500,
    script: [
      // The loop restores the register before it restarts, and the
      // browse column only mounts once the project screen has finished
      // leaving. Measure the filter bar after that, not during it.
      { wait: 320 },
      { move: "type" },
      { set: { hot: "type" } },
      { wait: 240 },
      { click: true },
      { set: { picked: true, hot: "" } },
      { wait: 420 },
      { move: "apply" },
      { set: { hot: "apply" } },
      { wait: 180 },
      { click: true },
      { set: { filtered: true, hot: "" } },
      { wait: 1500 },
      { move: "top" },
      { set: { hot: "top" } },
      { wait: 260 },
      { click: true },
      { set: { phase: "detail", hot: "" } },
      { cursor: "hide" },
      { wait: 2400 },
    ],
  });

  const rows = state.filtered ? FILTERED : ALL;
  const detail = state.phase === "detail";

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame
        crumb={detail ? "Single dwelling · Pascoe Vale, VIC" : "Browse projects"}
        overlay={
          <AnimatePresence>
            {detail ? (
              <motion.div
                key="bar"
                className="absolute inset-x-0 bottom-0 z-20 border-t"
                style={{ borderColor: C.line2, background: C.paper }}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              >
                <UnlockBar />
              </motion.div>
            ) : null}
          </AnimatePresence>
        }
      >
        {/* `initial={false}` so the register is simply there on first
            paint. The resting screen has to be finished, not faded in. */}
        <AnimatePresence mode="wait" initial={false}>
          {detail ? (
            <motion.div
              key="detail"
              className="flex-1 min-h-0 flex flex-col gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            >
              <Preview />
            </motion.div>
          ) : (
            <motion.div
              key="browse"
              className="flex-1 min-h-0 flex flex-col gap-2.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <div className="shrink-0">
                <Kicker icon={Compass}>Browse</Kicker>
                <p
                  className="mt-1.5 font-ui font-semibold uppercase text-[21px] leading-[0.95] tracking-[-0.018em]"
                  style={{ color: C.ink }}
                >
                  Open tender rounds
                </p>
                <p className="mt-1.5 text-[10px] leading-[1.5]" style={{ color: C.muted }}>
                  {state.filtered
                    ? "3 projects live across Australia. 3 more running privately. 1 filter applied."
                    : "12 projects live across Australia. 3 more running privately."}
                </p>
              </div>

              <FilterBar picked={state.picked} hot={state.hot} />

              <div className="relative flex-1 min-h-0 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={state.filtered ? "filtered" : "all"}
                    className="flex flex-col gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {rows.map((d, i) => (
                      <motion.div
                        key={d.id}
                        // Only the filtered result re-settles; the
                        // resting register is already on the page.
                        initial={state.filtered ? { opacity: 0, y: 8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.32,
                          delay: Math.min(i * 0.06, 0.24),
                          ease: [0.2, 0.65, 0.3, 0.9],
                        }}
                      >
                        <DocketRow
                          d={d}
                          cursorKey={state.filtered && i === 0 ? "top" : undefined}
                          hot={state.filtered && i === 0 && state.hot === "top"}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
                <ListFade />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/* ── Browse ───────────────────────────────────────────────────────── */

/** The GET form, ruled top and bottom. Three of its six cells fit at
 *  scene scale; the Apply plate stands taller than the fields, as it
 *  does in the app. */
function FilterBar({ picked, hot }: { picked: boolean; hot: S["hot"] }) {
  return (
    <div
      className="shrink-0 grid items-center gap-2 border-y py-2.5"
      style={{
        borderColor: C.line,
        gridTemplateColumns: "minmax(0,1.4fr) minmax(0,124px) auto",
      }}
    >
      <span
        className="flex items-center h-7 px-2 rounded-[3px] border text-[10.5px] truncate"
        style={{ borderColor: C.line2, background: C.paper, color: C.faint }}
      >
        Search by title
      </span>

      <span
        data-cursor="type"
        className="flex items-center justify-between gap-1 h-7 px-2 rounded-[3px] border text-[10.5px] transition-colors duration-200"
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
        className="inline-flex items-center justify-center h-8 px-4 rounded-md text-[11px] font-semibold tracking-[0.04em]"
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

/** One docket: the tinted band with the drawn cover and the budget, the
 *  body, and the state rail. Three panels across, one round per row. */
function DocketRow({ d, cursorKey, hot }: { d: Docket; cursorKey?: string; hot?: boolean }) {
  const meta = TYPE_META[d.kind];
  const left = Math.max(0, d.spots - d.taken);
  const urgent = left === 1;

  return (
    <div
      data-cursor={cursorKey}
      className="flex rounded-xl border overflow-hidden transition-colors duration-200"
      style={{
        borderColor: hot ? C.line3 : C.line,
        background: C.paper,
        boxShadow: ELEV,
      }}
    >
      {/* the band — the type's paper with the ink drawing multiplied on */}
      <div
        className="relative shrink-0 w-[96px] sm:w-[112px] border-r overflow-hidden"
        style={{ borderColor: C.line }}
      >
        <span aria-hidden className="absolute inset-0" style={{ background: TINT[d.kind] }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={d.cover}
          alt=""
          className="absolute inset-0 size-full object-cover mix-blend-multiply"
          style={{ objectPosition: "center 42%" }}
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[46px]"
          style={{
            background: `linear-gradient(to top, ${alpha("#ffffff", 0.92)} 40%, ${alpha("#ffffff", 0.5)}, transparent)`,
          }}
        />
        <span
          className="absolute top-1.5 left-1.5 inline-flex items-center gap-[3px] px-[3px] py-[2px] rounded-[3px] border text-[6.5px] sm:text-[7px] tracking-[0.06em] uppercase font-semibold whitespace-nowrap"
          style={{ borderColor: C.line, background: alpha("#ffffff", 0.75), color: C.ink }}
        >
          <meta.Icon className="size-[8px] sm:size-[9px]" style={{ color: C.tealInk }} strokeWidth={2.2} />
          {meta.label}
        </span>
        <div className="absolute left-1.5 bottom-1.5">
          <p className="text-[6.5px] tracking-[0.18em] uppercase font-semibold" style={{ color: C.muted }}>
            Project budget
          </p>
          <p
            className="mt-[1px] font-ui font-semibold text-[12px] leading-none tracking-[-0.01em] tabular-nums"
            style={{ color: C.ink }}
          >
            {d.budget}
          </p>
        </div>
      </div>

      {/* the body — title, locality, the specification */}
      <div className="min-w-0 flex-1 px-2.5 py-2 flex flex-col justify-center gap-1.5">
        <div className="min-w-0">
          <p className="font-ui font-semibold text-[11.5px] leading-[1.3] truncate" style={{ color: C.ink }}>
            {d.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[9.5px] min-w-0" style={{ color: C.muted }}>
            <MapPin className="size-[11px] shrink-0" style={{ color: C.dim }} />
            <span className="truncate">{d.where}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 overflow-hidden">
          {d.specs.map(([v, l]) => (
            <span
              key={l}
              className="inline-flex items-center gap-1 h-[21px] px-1.5 rounded-md border whitespace-nowrap"
              style={{ borderColor: C.line, background: C.wash }}
            >
              <span className="font-ui font-semibold text-[10px] leading-none tabular-nums" style={{ color: C.ink }}>
                {v}
              </span>
              <span className="text-[7px] tracking-[0.12em] uppercase" style={{ color: C.dim }}>
                {l}
              </span>
            </span>
          ))}
        </div>
        {d.pack ? (
          <p className="flex items-center gap-1 text-[9px] min-w-0" style={{ color: C.tealInk }}>
            <BookOpenCheck className="size-[11px] shrink-0" />
            <span className="truncate">{d.pack}</span>
          </p>
        ) : null}
      </div>

      {/* the state rail — the dots first, the fee after */}
      <div
        className="shrink-0 w-[108px] sm:w-[122px] border-l px-1.5 sm:px-2 py-2 overflow-hidden flex flex-col items-end justify-center gap-1"
        style={{ borderColor: C.line }}
      >
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="inline-flex items-center gap-[2px]">
            {Array.from({ length: d.spots }).map((_, i) => (
              <span
                key={i}
                className="size-[4.5px] rounded-full"
                style={
                  i < d.taken
                    ? urgent
                      ? { background: TONE.warn.text, boxShadow: `0 0 6px ${TONE.warn.border}` }
                      : { background: C.teal, boxShadow: `0 0 6px ${C.tealLine}` }
                    : { background: C.faint, opacity: 0.35 }
                }
              />
            ))}
          </span>
          <span
            className="text-[8px] sm:text-[9px] tabular-nums whitespace-nowrap"
            style={urgent ? { color: TONE.warn.text, fontWeight: 600 } : { color: C.muted }}
          >
            {urgent ? "1 spot left" : `${left} of ${d.spots} spots open`}
          </span>
        </span>
        <span className="text-[8px] sm:text-[9px] tabular-nums" style={{ color: C.dim }}>
          ${PRICE[d.kind]} to enter
        </span>
        <span
          className="inline-flex items-center gap-0.5 text-[8px] sm:text-[9px]"
          style={{ color: C.tealInk, opacity: 0.6 }}
        >
          View
          <ArrowUpRight className="size-[10px]" strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}

/* ── The project, pre-unlock ──────────────────────────────────────── */

function Preview() {
  return (
    <>
      <div className="shrink-0">
        <span className="inline-flex items-center gap-1 text-[9px]" style={{ color: C.dim }}>
          <ArrowLeft className="size-[11px]" />
          Back to browse
        </span>
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className="inline-flex items-center gap-1 text-[8.5px] tracking-[0.22em] uppercase font-semibold"
              style={{ color: C.dim }}
            >
              <Lock className="size-[10px]" />
              Preview
            </span>
            <p
              className="mt-1 font-ui font-semibold uppercase text-[19px] leading-[0.95] tracking-[-0.018em]"
              style={{ color: C.ink }}
            >
              Single dwelling · Pascoe Vale, VIC
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] min-w-0" style={{ color: C.muted }}>
              <MapPin className="size-3 shrink-0" style={{ color: C.tealInk }} />
              <span className="truncate">
                Pascoe Vale, VIC 3044
                <span className="ml-1.5 text-[9px]" style={{ color: C.dim }}>
                  Street address opens with your spot
                </span>
              </span>
            </p>
          </div>
          <span
            className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-[9.5px] tracking-[0.04em]"
            style={{ borderColor: C.line3, color: C.ink }}
          >
            <Bookmark className="size-3" />
            Save
          </span>
        </div>
      </div>

      <Section label="Key details" icon={Home}>
        <div className="grid grid-cols-3 gap-x-3 gap-y-2">
          {FACTS.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <p className="text-[8px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>
                {k}
              </p>
              <p className="mt-0.5 font-ui font-semibold text-[12px] leading-tight truncate" style={{ color: C.ink }}>
                {v}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* The masked register. The rows below carry the server's own
          substitution; the blur is the second, cosmetic layer. */}
      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
        <Section label="Documents · 9" icon={FileText}>
          <div className="relative">
            <div className="flex flex-col gap-2" style={{ filter: "blur(5px)" }} aria-hidden>
              {DOCS.map(([cat, files]) => (
                <div key={cat}>
                  <p className="text-[8px] tracking-[0.18em] uppercase mb-1" style={{ color: C.dim }}>
                    {cat}
                  </p>
                  <div className="flex flex-col gap-1">
                    {files.map(([name, size]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm border"
                        style={{ borderColor: C.line, background: C.wash }}
                      >
                        <div className="min-w-0">
                          <p className="text-[10.5px] font-medium truncate" style={{ color: C.ink }}>
                            {name}
                          </p>
                          <p className="text-[8.5px]" style={{ color: C.dim }}>
                            {size}
                          </p>
                        </div>
                        <span
                          className="shrink-0 inline-flex items-center justify-center size-6 rounded-sm border"
                          style={{ borderColor: C.line, color: C.muted, opacity: 0.4 }}
                        >
                          <Download className="size-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <span aria-hidden className="absolute inset-0" style={{ background: C.canvas, opacity: 0.5 }} />
              <div
                className="relative flex items-center gap-2 rounded-md border px-3 py-2"
                style={{ borderColor: C.tealLine, background: C.paper2, boxShadow: ELEV }}
              >
                <span
                  className="shrink-0 inline-flex size-6 items-center justify-center rounded-md border"
                  style={{ borderColor: C.tealLine, background: C.tealMuted, color: C.tealInk }}
                >
                  <FileText className="size-3" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold" style={{ color: C.ink }}>
                    Unlock to download documents
                  </p>
                  <p className="mt-0.5 text-[9px]" style={{ color: C.dim }}>
                    9 files attached across 9 categories.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>
        <ListFade />
      </div>

      {/* The app keeps a pb-32 spacer under the fixed bar; the mini
          keeps its own so the register never runs beneath it. */}
      <div aria-hidden className="shrink-0" style={{ height: 52 }} />
    </>
  );
}

/** A ruled section: teal label, then a hairline to the right edge. */
function Section({
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
        <h3
          className="text-[9px] tracking-[0.2em] uppercase font-semibold shrink-0"
          style={{ color: C.tealInk }}
        >
          {label}
        </h3>
        <span aria-hidden className="h-px flex-1" style={{ background: C.line }} />
      </header>
      <div className="pt-2.5">{children}</div>
    </section>
  );
}

/** The bar pinned to the foot of the project: what a spot costs and
 *  what it opens. The price is the real one for a single dwelling. */
function UnlockBar() {
  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5">
      <div className="min-w-0 flex items-start gap-2">
        <span
          className="shrink-0 inline-flex size-8 items-center justify-center rounded-md border"
          style={{ borderColor: C.tealLine, background: C.tealWash, color: C.tealInk }}
        >
          <Lock className="size-3.5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[11.5px] font-semibold" style={{ color: C.ink }}>
              Take a spot on this round
            </span>
            <span className="font-ui text-[17px] leading-none tabular-nums" style={{ color: C.tealInk }}>
              $149
            </span>
            <span className="text-[9.5px]" style={{ color: C.dim }}>
              one-off
            </span>
            <span className="text-[9.5px]" style={{ color: C.dim }}>
              · 2 of 3 spots open
            </span>
          </div>
          <p className="mt-0.5 text-[9.5px] truncate" style={{ color: C.dim }}>
            Exact address · owner contact · 9 documents · message the owner
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[9px] truncate" style={{ color: C.dim }}>
            <ShieldCheck className="size-[10px] shrink-0" style={{ color: C.tealInk }} />
            Secure checkout by Stripe · card, Apple Pay and Google Pay
          </p>
        </div>
      </div>
      <TealBtn>
        <CreditCard className="size-3.5" />
        Unlock for $149
      </TealBtn>
    </div>
  );
}
