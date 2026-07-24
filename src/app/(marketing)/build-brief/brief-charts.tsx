/**
 * The Build Brief · in-code charts.
 *
 * Server components, no client JS, no images. Two shapes cover the
 * publication's needs:
 *
 *   BriefBars  — horizontal comparison bars (shares, counts)
 *   BriefSlope — two labelled points joined by a line, against a
 *                dashed reference (season-to-season shifts)
 *
 * Accessibility: the visual layer is aria-hidden; every chart carries
 * a visually-hidden table with the same data, and the wrapping figure
 * is labelled. Colours come from the design tokens so the charts stay
 * themeable: the emphasis series uses the deep teal text accent
 * (--color-accent-light, 5.0:1 on the white card, so it also clears
 * the 3:1 non-text minimum), context series use the muted ink dim
 * token (3.9:1).
 */

import type { CSSProperties } from "react";

export interface BriefBarDatum {
  label: string;
  /** Numeric value for scale. */
  value: number;
  /** Exact display string — never derived, never rounded. */
  display: string;
  accent?: boolean;
}

export interface BriefBarsSpec {
  kind: "bars";
  /** Concise chart title, also the sr-only table caption. */
  title: string;
  /** One-line description of what the chart shows. */
  desc: string;
  /** Column heading for the value column of the sr-only table. */
  valueHeading: string;
  /** Scale maximum; defaults to the largest value (axis starts at 0). */
  max?: number;
  bars: BriefBarDatum[];
}

export interface BriefSlopeSpec {
  kind: "slope";
  title: string;
  desc: string;
  valueHeading: string;
  points: [BriefBarDatum, BriefBarDatum];
  reference: { value: number; display: string; label: string };
  /** Y-domain padding around the data, in value units. */
  domain: [number, number];
}

export interface BriefStripStage {
  label: string;
  /** Accent stages carry the teal treatment (e.g. off-site work). */
  accent?: boolean;
}

/** Process strip — an ordered sequence of stages, not a data chart.
 *  Issue 003 onward (prefabrication build sequence). */
export interface BriefStripSpec {
  kind: "strip";
  title: string;
  desc: string;
  stages: BriefStripStage[];
  /** Bracket under a contiguous run of stages, 0-based inclusive. */
  callout?: { from: number; to: number; label: string; sub?: string };
  /** What the two colours mean, e.g. off-site vs on site. */
  legend?: { accent: string; context: string };
}

export type BriefChartSpec = BriefBarsSpec | BriefSlopeSpec | BriefStripSpec;

const MONO: CSSProperties = { fontFamily: "var(--font-jetbrains-mono)" };

const ACCENT_FILL = "var(--color-accent-light)";
const CONTEXT_FILL = "var(--color-text-dim)";

/** Visually-hidden data table — the screen-reader form of a chart.
 *  The sr-only clip lives on a wrapping div: table layout treats a
 *  1px width as a minimum and would otherwise lay out at full content
 *  width, scrolling the page sideways. */
function SrTable({
  caption,
  valueHeading,
  rows,
}: {
  caption: string;
  valueHeading: string;
  rows: Array<{ label: string; display: string }>;
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Series</th>
            <th scope="col">{valueHeading}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BriefBars({ spec }: { spec: BriefBarsSpec }) {
  const max = spec.max ?? Math.max(...spec.bars.map((b) => b.value));
  return (
    <figure aria-label={`Chart: ${spec.title}. ${spec.desc}`}>
      <div aria-hidden className="flex flex-col gap-3.5">
        {spec.bars.map((b) => {
          const pct = Math.max((b.value / max) * 100, 0.75);
          return (
            <div key={b.label}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[12px] leading-[1.4] text-text-muted">
                  {b.label}
                </span>
                <span
                  className={`text-[12.5px] tabular-nums ${
                    b.accent ? "font-semibold text-accent-light" : "text-text"
                  }`}
                  style={MONO}
                >
                  {b.display}
                </span>
              </div>
              <div className="mt-1.5 h-[9px] rounded-full bg-[#101820]/[0.05]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: b.accent ? ACCENT_FILL : CONTEXT_FILL,
                    opacity: b.accent ? 1 : 0.55,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <SrTable
        caption={`${spec.title}. ${spec.desc}`}
        valueHeading={spec.valueHeading}
        rows={spec.bars}
      />
    </figure>
  );
}

export function BriefSlope({ spec }: { spec: BriefSlopeSpec }) {
  const [lo, hi] = spec.domain;
  /** Value → vertical position, % from the top of the plot box. */
  const y = (v: number) => ((hi - v) / (hi - lo)) * 100;
  const [a, b] = spec.points;
  // Endpoints sit inset from the edges so the dots and labels breathe.
  const X_A = 10;
  const X_B = 90;

  return (
    <figure aria-label={`Chart: ${spec.title}. ${spec.desc}`}>
      <div aria-hidden className="select-none">
        <div className="relative h-[150px] sm:h-[170px]">
          {/* line work — vector layer, text lives in HTML */}
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              x2="100"
              y1={y(spec.reference.value)}
              y2={y(spec.reference.value)}
              stroke={CONTEXT_FILL}
              strokeOpacity="0.65"
              strokeWidth="1"
              strokeDasharray="3 3.5"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={X_A}
              x2={X_B}
              y1={y(a.value)}
              y2={y(b.value)}
              stroke={ACCENT_FILL}
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* endpoint dots */}
          {(
            [
              [X_A, a],
              [X_B, b],
            ] as const
          ).map(([x, p]) => (
            <span
              key={p.label}
              className="absolute size-[11px] rounded-full ring-[2.5px] ring-white"
              style={{
                left: `${x}%`,
                top: `${y(p.value)}%`,
                transform: "translate(-50%, -50%)",
                background: ACCENT_FILL,
              }}
            />
          ))}

          {/* endpoint values — both above their dots, clear of the
              reference label on the right */}
          {(
            [
              [X_A, a],
              [X_B, b],
            ] as const
          ).map(([x, p]) => (
            <span
              key={p.label}
              className="absolute text-[13px] font-semibold text-accent-light tabular-nums"
              style={{
                ...MONO,
                left: `${x}%`,
                top: `${y(p.value)}%`,
                transform: "translate(-50%, calc(-100% - 12px))",
              }}
            >
              {p.display}
            </span>
          ))}

          {/* reference label — on the left, under the dashed line,
              clear of the high start of the data line */}
          <span
            className="absolute left-0 text-[10.5px] tracking-[0.08em] text-text-dim"
            style={{
              ...MONO,
              top: `${y(spec.reference.value)}%`,
              transform: "translate(0, 7px)",
            }}
          >
            {spec.reference.label} · {spec.reference.display}
          </span>
        </div>

        {/* x labels */}
        <div className="mt-2.5 flex items-baseline justify-between border-t border-[#101820]/[0.08] pt-2">
          <span className="text-[11px] tracking-[0.1em] uppercase text-text-muted" style={MONO}>
            {a.label}
          </span>
          <span className="text-[11px] tracking-[0.1em] uppercase text-text-muted" style={MONO}>
            {b.label}
          </span>
        </div>
      </div>

      <SrTable
        caption={`${spec.title}. ${spec.desc}`}
        valueHeading={spec.valueHeading}
        rows={[a, b, { label: spec.reference.label, display: spec.reference.display }]}
      />
    </figure>
  );
}

/* ── process strip ───────────────────────────────────────────────────── */

function BriefStrip({ spec }: { spec: BriefStripSpec }) {
  const callout = spec.callout;
  const inBand = (i: number) =>
    !!callout && i >= callout.from && i <= callout.to;
  return (
    <figure aria-label={`${spec.title}. ${spec.desc}`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <span className="text-[12.5px] font-ui font-semibold text-text">
          {spec.title}
        </span>
        {spec.legend ? (
          <span
            className="flex items-center gap-4 text-[10.5px] tracking-[0.06em] text-text-dim"
            style={MONO}
          >
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2 rounded-full"
                style={{ background: ACCENT_FILL }}
              />
              {spec.legend.accent}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2 rounded-full"
                style={{ background: CONTEXT_FILL, opacity: 0.55 }}
              />
              {spec.legend.context}
            </span>
          </span>
        ) : null}
      </figcaption>

      {/* One stage per row — the strip is a sequence, and the chart
          slot is a narrow rail, so it reads top to bottom. The
          callout range carries a soft band so the on-site portion is
          visible at a glance. */}
      <ol className="mt-4">
        {spec.stages.map((s, i) => (
          <li
            key={s.label}
            className={`flex items-center gap-3 px-3 py-[8px] ${
              inBand(i) ? "bg-[#101820]/[0.035]" : ""
            } ${callout && i === callout.from ? "rounded-t-lg" : ""} ${
              callout && i === callout.to ? "rounded-b-lg" : ""
            }`}
          >
            <span
              aria-hidden
              className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold text-white"
              style={{
                ...MONO,
                background: s.accent ? ACCENT_FILL : CONTEXT_FILL,
                opacity: s.accent ? 1 : 0.75,
              }}
            >
              {i + 1}
            </span>
            <span className="min-w-0 text-[12.5px] leading-[1.4] text-text-muted">
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      {callout ? (
        <p className="mt-3.5 border-t border-[#101820]/[0.08] pt-3 text-[12px] leading-[1.5] text-text-muted">
          <span className="font-semibold text-accent-light" style={MONO}>
            {callout.label}
          </span>
          {callout.sub ? <> · {callout.sub}</> : null}
        </p>
      ) : null}
    </figure>
  );
}

export function BriefChart({ spec }: { spec: BriefChartSpec }) {
  if (spec.kind === "bars") return <BriefBars spec={spec} />;
  if (spec.kind === "slope") return <BriefSlope spec={spec} />;
  return <BriefStrip spec={spec} />;
}
