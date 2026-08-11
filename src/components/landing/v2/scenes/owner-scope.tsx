"use client";

/**
 * Homeowner · step two — the plans become one list.
 *
 * The scope register the owner reads and approves, at
 * /owner/projects/[slug]/scope. The claim beside this card is that
 * every item is written from the documents in plain English and tied to
 * the page it came from, so that is precisely what the pointer does:
 * opens a division nobody has looked at, reads the citation under a
 * line, scrolls the register on and opens another.
 *
 * Nothing is faked over a still. `open` is component state, and the
 * division genuinely expands.
 */

import * as React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, Division, Frame, ListFade, Pill, ScopeLine, useCompact } from "./kit";

type S = { open: string | null; hot: string | null; cite: boolean; shift: number };

const RESTING: S = { open: "earthworks", hot: null, cite: false, shift: 0 };

/** Fourteen of the register's thirty one divisions. Enough that the
 *  list reads as a real register rather than a sample of one, and
 *  enough that the scroll beat has somewhere to go. */
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

/** The lines behind the divisions the pointer opens. Two of them carry a
 *  gap, because the register says what the documents do not answer as
 *  plainly as it says what they do. The gap wording is the product's
 *  own, from scope/advice.ts. */
const LINES: Record<string, Array<{ label: string; plain: string; cite: string; gap?: string }>> = {
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
      cite: "Not found in your documents",
      gap: "No site classification on file, so every builder must assume the ground conditions.",
    },
  ],
  joinery: [
    {
      label: "Kitchen cabinetry and benchtops",
      plain: "The cupboards, drawers and benches that make up the kitchen, built and installed.",
      cite: "Architectural A21, page 3, Rev D",
      gap: "Cabinetry appears on the architectural drawings only, with no joinery elevations to price from.",
    },
    {
      label: "Wardrobes and built in storage",
      plain: "The fitted robes and storage joinery through the bedrooms and hallway.",
      cite: "Architectural A22, page 1, Rev D",
    },
  ],
};

export function OwnerScopeScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  // On the portrait stage the register viewport is ~271px and every
  // plain sentence wraps to two lines, so joinery sits ~220px lower in
  // the column than it does on the wide stage. The scroll beat has to
  // travel further for the opened division to land inside the fold.
  const compact = useCompact();

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
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
      { set: { shift: compact ? -650 : -430 } },
      { wait: 520 },
      { move: "div-joinery" },
      { set: { hot: "joinery" } },
      { click: true },
      { set: { open: "joinery", hot: null } },
      { wait: 1900 },
      { cursor: "hide" },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame crumb="Scope of works">
        <div className="flex items-center justify-between shrink-0">
          <p className="text-[13px] font-semibold" style={{ color: C.ink }}>Scope of works</p>
          <Pill><Check className="size-2.5" strokeWidth={3} /> Approved</Pill>
        </div>
        <p className="text-[10.5px] leading-snug shrink-0" style={{ color: C.muted }}>
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
                    gap={l.gap}
                  />
                ))}
              </Division>
            ))}
          </motion.div>
          <ListFade />
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}
