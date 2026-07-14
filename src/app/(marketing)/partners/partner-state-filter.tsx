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

/* The tile map: states placed on a 4-column grid the way they sit on the
 * continent — WA west, NT/QLD north, VIC/TAS stacked in the south east. */
const STATE_TILES: Array<{ code: string; col: number; row: number }> = [
  { code: "NT", col: 2, row: 1 },
  { code: "QLD", col: 3, row: 1 },
  { code: "WA", col: 1, row: 2 },
  { code: "SA", col: 2, row: 2 },
  { code: "NSW", col: 3, row: 2 },
  { code: "ACT", col: 4, row: 2 },
  { code: "VIC", col: 3, row: 3 },
  { code: "TAS", col: 3, row: 4 },
];

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
  const reached = STATE_TILES.filter((t) => (counts[t.code] ?? 0) > 0).length;

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

      <div
        role="group"
        aria-label="Filter partners by state"
        className="grid grid-cols-4 gap-1.5"
      >
        {STATE_TILES.map((t) => {
          const count = counts[t.code] ?? 0;
          const has = count > 0;
          const on = selected === t.code;
          return (
            <button
              key={t.code}
              type="button"
              disabled={!has}
              aria-pressed={on}
              aria-label={
                has
                  ? `${STATE_NAMES[t.code] ?? t.code}, ${count} ${count === 1 ? "partner" : "partners"}`
                  : `${STATE_NAMES[t.code] ?? t.code}, partners coming soon`
              }
              onClick={() => setSelected(on ? null : t.code)}
              style={{ gridColumn: t.col, gridRow: t.row }}
              className={cn(
                "flex h-11 w-12 flex-col items-center justify-center rounded-[10px] border leading-none transition-all duration-200",
                on
                  ? "border-[#18222c] bg-[#18222c] text-white card-elev"
                  : has
                    ? "border-border-subtle bg-white text-text card-elev hover:-translate-y-0.5 hover:border-accent-light/50"
                    : "cursor-default border-dashed border-border-subtle/80 bg-transparent text-text-faint",
              )}
            >
              <span className="text-[10px] font-ui font-semibold tracking-[0.1em]">
                {t.code}
              </span>
              {has ? (
                <span
                  className={cn(
                    "mt-1 text-[10.5px] tabular-nums",
                    on ? "text-white/65" : "text-text-dim",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
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
