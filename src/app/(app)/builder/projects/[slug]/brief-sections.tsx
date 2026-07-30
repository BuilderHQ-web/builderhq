"use client";

/**
 * The tender-brief sections of the builder's project page — the parts
 * that make it read like a document worth printing rather than a
 * listing. A fact sheet in hairline rules, the scope of works grouped
 * the way a builder actually thinks about a job, and the project's
 * timeline as one line of stations. Everything here is derived from
 * the pack and the listing; nothing is boilerplate.
 */

import {
  CalendarCheck,
  ClipboardCheck,
  Home,
  Layers,
  Paintbrush,
  Plug,
  Trees,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ScopeGroup } from "@/modules/scope/groups";

/* ── the fact sheet ─────────────────────────────────────────────────── */

export interface FactRow {
  k: string;
  v: string | null;
}

/** Hairline-rule fact column, the tender-brief read. Null rows drop. */
export function FactSheet({ rows }: { rows: FactRow[] }) {
  const kept = rows.filter((r): r is { k: string; v: string } => !!r.v);
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-8">
      {kept.map((r) => (
        <div
          key={r.k}
          className="border-t border-border-subtle py-3 first:border-t sm:[&:nth-child(-n+3)]:border-t [&:nth-child(-n+2)]:border-t"
        >
          <dt className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
            {r.k}
          </dt>
          <dd className="mt-1 text-[14px] font-ui font-medium text-text">
            {r.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ── the scope of works, grouped ────────────────────────────────────── */

const GROUP_ICON: Record<string, React.ReactNode> = {
  structure: <Layers className="size-4" />,
  envelope: <Home className="size-4" />,
  fitout: <Paintbrush className="size-4" />,
  services: <Plug className="size-4" />,
  external: <Trees className="size-4" />,
  compliance: <ClipboardCheck className="size-4" />,
};

/**
 * The six-tile scope read. Each tile names the build chapter, counts
 * the pack's lines in it, and lists the divisions actually present on
 * THIS project — derived, never boilerplate.
 */
export function ScopeOfWorks({ groups }: { groups: ScopeGroup[] }) {
  const shown = groups.filter((g) => g.lines > 0);
  if (shown.length === 0) return null;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {shown.map((g) => (
        <div
          key={g.key}
          className="rounded-lg border border-border-subtle bg-surface-1 card-elev px-4 py-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex size-8 items-center justify-center rounded-full border border-border-subtle text-accent-light">
              {GROUP_ICON[g.key]}
            </span>
            <span className="text-[10.5px] font-ui font-semibold text-text-dim tabular-nums">
              {g.lines} line{g.lines === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-2.5 text-[13px] font-ui font-semibold text-text leading-[1.3]">
            {g.title}
          </p>
          <p className="mt-1 text-[11.5px] leading-[1.55] text-text-dim">
            {g.divisions.join(" · ")}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── the timeline ───────────────────────────────────────────────────── */

export interface TimelineStation {
  label: string;
  when: string;
  state: "done" | "now" | "ahead";
}

function monthLabel(s: string | null): string | null {
  if (!s || !/^\d{4}-\d{2}$/.test(s)) return null;
  const [y, m] = s.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildTimeline(args: {
  publishedAt: string | null;
  targetStartMonth: string | null;
  targetCompletionMonth: string | null;
}): TimelineStation[] {
  const out: TimelineStation[] = [];
  if (args.publishedAt) {
    out.push({
      label: "Round opened",
      when: new Date(args.publishedAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      state: "done",
    });
  }
  out.push({ label: "Tendering", when: "Now", state: "now" });
  const start = monthLabel(args.targetStartMonth);
  if (start) {
    out.push({ label: "Target start on site", when: start, state: "ahead" });
  }
  const done = monthLabel(args.targetCompletionMonth);
  if (done) {
    out.push({ label: "Target completion", when: done, state: "ahead" });
  }
  return out;
}

/** One line of stations, the brief's project timeline. */
export function ProjectTimeline({
  stations,
}: {
  stations: TimelineStation[];
}) {
  if (stations.length < 2) return null;
  return (
    <ol className="flex items-start">
      {stations.map((s, i) => (
        <li key={s.label} className="flex-1 min-w-0 relative">
          {i < stations.length - 1 ? (
            <span
              aria-hidden
              className="absolute top-[13px] left-[calc(50%+16px)] right-[calc(-50%+16px)] border-t border-dashed border-border-strong"
            />
          ) : null}
          <div className="flex flex-col items-center text-center px-1">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border",
                s.state === "now"
                  ? "border-transparent bg-accent text-accent-contrast"
                  : s.state === "done"
                    ? "border-border-accent/60 bg-[rgba(0,212,200,0.07)] text-[#0a7d73]"
                    : "border-border-strong bg-surface-1 text-text-dim",
              )}
            >
              <CalendarCheck className="size-3.5" />
            </span>
            <p className="mt-2 text-[10px] tracking-[0.1em] uppercase text-text-dim font-ui font-semibold leading-[1.35]">
              {s.label}
            </p>
            <p
              className={cn(
                "mt-0.5 text-[11.5px] font-ui font-medium",
                s.state === "now" ? "text-[#0a7d73]" : "text-text",
              )}
            >
              {s.when}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
