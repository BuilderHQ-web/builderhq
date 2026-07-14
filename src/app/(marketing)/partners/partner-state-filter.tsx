"use client";

/**
 * The register's state layer — a tappable tile map of Australia.
 *
 * Instead of a dropdown, the states sit as small tiles arranged the way
 * the country actually sits, each carrying its live partner count.
 * States we have not reached yet render dimmed and dashed: the map is
 * honest about where the network is today and where it is heading next.
 * Tapping a tile filters both register sections; tapping it again (or
 * "All states") clears it.
 *
 * The rows themselves stay server-rendered: PartnersRegister passes each
 * row in as a ReactNode alongside its state code, so no partner data —
 * and no unpublished draft — ever reaches the client bundle. This file
 * only ever sees state strings and finished markup.
 */

import {
  Fragment,
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

const STATE_NAMES: Record<string, string> = {
  WA: "Western Australia",
  NT: "Northern Territory",
  SA: "South Australia",
  QLD: "Queensland",
  NSW: "New South Wales",
  ACT: "the ACT",
  VIC: "Victoria",
  TAS: "Tasmania",
};

/**
 * The map geometry — a stylised, low-poly Australia drawn on a simple
 * plate carrée projection: x = (lon − 112) × 9.5, y = (−lat − 9) × 10.
 * Internal borders are the real ones (129°E, 138°E, 141°E, 26°S, 29°S,
 * a simplified Murray); the coastline is a hand-simplified polygon, so
 * neighbouring states share identical border coordinates and tile
 * together seamlessly. The ACT is a callout circle at its true position
 * (it would be two pixels as a polygon).
 */
type StateShape = {
  code: string;
  d?: string;
  circle?: { cx: number; cy: number; r: number };
  /** Abbreviation anchor; the count sits 12 units below. */
  label: { x: number; y: number };
  /** Callout label beside the shape (ACT) — left-anchored, ink-on-page. */
  labelOutside?: boolean;
};

const STATE_SHAPES: StateShape[] = [
  {
    code: "WA",
    d: "M162 56 L141 48 L97 90 L63 113 L20 129 L13 169 L25 198 L35 229 L29 254 L56 261 L94 249 L162 227 Z",
    label: { x: 88, y: 158 },
  },
  {
    code: "NT",
    d: "M162 56 L179 34 L234 31 L238 66 L247 74 L247 170 L162 170 Z",
    label: { x: 204, y: 108 },
  },
  {
    code: "SA",
    d: "M162 170 L276 170 L276 291 L264 281 L252 266 L243 261 L245 245 L224 259 L185 229 L162 227 Z",
    label: { x: 216, y: 216 },
  },
  {
    code: "QLD",
    d: "M247 74 L261 86 L278 75 L284 35 L290 17 L316 59 L326 99 L353 122 L369 145 L391 163 L395 192 L352 200 L276 200 L276 170 L247 170 Z",
    label: { x: 313, y: 136 },
  },
  {
    code: "NSW",
    d: "M395 192 L373 249 L368 261 L361 285 L344 276 L338 269 L313 269 L297 258 L276 250 L276 200 L352 200 Z",
    label: { x: 326, y: 231 },
  },
  {
    code: "VIC",
    d: "M276 250 L297 258 L313 269 L338 269 L344 276 L361 285 L333 297 L327 301 L313 293 L299 298 L281 294 L276 291 Z",
    label: { x: 311, y: 280 },
  },
  {
    code: "TAS",
    d: "M311 317 L345 319 L342 342 L332 346 L315 334 Z",
    label: { x: 329, y: 330 },
  },
  {
    code: "ACT",
    circle: { cx: 350, cy: 257, r: 9 },
    label: { x: 364, y: 254 },
    labelOutside: true,
  },
];

const LIFT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const StateFilterContext = createContext<{
  selected: string | null;
  setSelected: (s: string | null) => void;
}>({ selected: null, setSelected: () => {} });

export function StateFilterProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null);
  const value = useMemo(() => ({ selected, setSelected }), [selected]);
  return (
    <StateFilterContext.Provider value={value}>
      {children}
    </StateFilterContext.Provider>
  );
}

export function AustraliaStateMap({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const { selected, setSelected } = useContext(StateFilterContext);
  const reached = STATE_SHAPES.filter((s) => (counts[s.code] ?? 0) > 0).length;

  return (
    <div className="flex flex-col items-start gap-3">
      <div>
        <p className="text-[10.5px] tracking-[0.24em] uppercase font-ui font-semibold text-text-dim">
          Across Australia
        </p>
        <p className="mt-1 text-[12px] leading-snug text-text-muted">
          {selected ? (
            <>
              Showing {STATE_NAMES[selected] ?? selected} only
              <span aria-hidden className="mx-1.5 text-text-faint">·</span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="font-medium text-text underline decoration-[#101820]/25 underline-offset-2 hover:text-accent-light transition-colors"
              >
                All states
              </button>
            </>
          ) : (
            <>
              {reached} {reached === 1 ? "state" : "states"} and growing
              <span aria-hidden className="mx-1.5 text-text-faint">·</span>
              tap a state to filter
            </>
          )}
        </p>
      </div>

      <svg
        role="group"
        aria-label="Filter partners by state"
        viewBox="-8 6 416 350"
        className="w-full max-w-[352px] select-none"
      >
        {/* Selected state renders last so its lift shadow sits over its
            neighbours rather than sliding underneath them. */}
        {[...STATE_SHAPES]
          .sort((a, b) =>
            (a.code === selected ? 1 : 0) - (b.code === selected ? 1 : 0),
          )
          .map((s) => (
            <StateShapeG
              key={s.code}
              shape={s}
              count={counts[s.code] ?? 0}
              on={selected === s.code}
              onToggle={() =>
                setSelected(selected === s.code ? null : s.code)
              }
            />
          ))}
      </svg>
    </div>
  );
}

function StateShapeG({
  shape,
  count,
  on,
  onToggle,
}: {
  shape: StateShape;
  count: number;
  on: boolean;
  onToggle: () => void;
}) {
  const has = count > 0;
  const name = STATE_NAMES[shape.code] ?? shape.code;

  const fill = on ? "#18222c" : has ? "#ffffff" : "rgba(24,34,44,0.03)";
  const stroke = on
    ? "#18222c"
    : has
      ? "rgba(24,34,44,0.28)"
      : "rgba(24,34,44,0.16)";
  const inkOnShape = on ? "rgba(255,255,255,0.95)" : has ? "#18222c" : "rgba(24,34,44,0.34)";
  const dimOnShape = on ? "rgba(255,255,255,0.62)" : "rgba(24,34,44,0.52)";

  return (
    <g
      role="button"
      tabIndex={has ? 0 : -1}
      aria-pressed={on}
      aria-disabled={!has}
      aria-label={
        has
          ? `${name}, ${count} ${count === 1 ? "partner" : "partners"}`
          : `${name}, partners coming soon`
      }
      onClick={has ? onToggle : undefined}
      onKeyDown={
        has
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
              }
            }
          : undefined
      }
      className={cn(
        "outline-none",
        has ? "cursor-pointer" : "cursor-default",
        has && !on && "hover:opacity-[0.92]",
      )}
      style={{
        transform: on ? "translateY(-4px)" : "translateY(0)",
        filter: on
          ? "drop-shadow(0 10px 14px rgba(13,21,30,0.22))"
          : "drop-shadow(0 1px 0 rgba(13,21,30,0.04))",
        transition: `transform 420ms ${LIFT_EASE}, filter 420ms ${LIFT_EASE}, opacity 200ms ease`,
      }}
    >
      {shape.d ? (
        <path
          d={shape.d}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.1}
          strokeLinejoin="round"
          strokeDasharray={has ? undefined : "3 3.5"}
          style={{ transition: "fill 250ms ease, stroke 250ms ease" }}
        />
      ) : null}
      {shape.circle ? (
        <>
          {/* Generous invisible hit area — the visible dot alone would be
              a cruel tap target on a phone. */}
          <circle
            cx={shape.circle.cx}
            cy={shape.circle.cy}
            r={shape.circle.r + 8}
            fill="transparent"
            stroke="none"
          />
          <circle
            cx={shape.circle.cx}
            cy={shape.circle.cy}
            r={shape.circle.r}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.1}
            strokeDasharray={has ? undefined : "3 3.5"}
            style={{ transition: "fill 250ms ease, stroke 250ms ease" }}
          />
        </>
      ) : null}

      {shape.labelOutside ? (
        <>
          <text
            x={shape.label.x}
            y={shape.label.y}
            fontSize={11.5}
            fontWeight={600}
            letterSpacing={0.8}
            fill={has ? "#18222c" : "rgba(24,34,44,0.34)"}
            className="font-ui"
          >
            {shape.code}
          </text>
          {has ? (
            <text
              x={shape.label.x}
              y={shape.label.y + 12}
              fontSize={10.5}
              fill="rgba(24,34,44,0.52)"
              className="tabular-nums"
            >
              {count}
            </text>
          ) : null}
        </>
      ) : (
        <>
          <text
            x={shape.label.x}
            y={shape.label.y}
            textAnchor="middle"
            fontSize={12.5}
            fontWeight={600}
            letterSpacing={1}
            fill={inkOnShape}
            className="font-ui pointer-events-none"
          >
            {shape.code}
          </text>
          {has ? (
            <text
              x={shape.label.x}
              y={shape.label.y + 13}
              textAnchor="middle"
              fontSize={11}
              fill={dimOnShape}
              className="tabular-nums pointer-events-none"
            >
              {count}
            </text>
          ) : null}
        </>
      )}
    </g>
  );
}

export function StateFilteredRows({
  items,
  emptyLabel,
}: {
  items: Array<{ key: string; state: string; node: ReactNode }>;
  emptyLabel: string;
}) {
  const { selected, setSelected } = useContext(StateFilterContext);
  const visible = selected ? items.filter((i) => i.state === selected) : items;

  if (visible.length === 0 && selected) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-2/50 px-6 py-9 text-center">
        <p className="text-[13.5px] leading-[1.6] text-text-muted">
          No {emptyLabel} in {STATE_NAMES[selected] ?? selected} yet. We are
          actively growing the register there.
        </p>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="mt-3 text-[13px] font-ui font-medium text-text underline decoration-[#101820]/25 underline-offset-2 hover:text-accent-light transition-colors"
        >
          Show all states
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {visible.map((i) => (
        <Fragment key={i.key}>{i.node}</Fragment>
      ))}
    </div>
  );
}

/** The live count beside a section header — follows the state selection. */
export function SectionCount({ states }: { states: string[] }) {
  const { selected } = useContext(StateFilterContext);
  const n = selected
    ? states.filter((s) => s === selected).length
    : states.length;
  return <>{n}</>;
}
