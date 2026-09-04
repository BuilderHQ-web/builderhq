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

import { Fragment } from "react";
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
  /** A note under the chart, as the diverging and figures shapes carry.
   *  Bars went without one until an edition needed to say what the axis
   *  was doing. */
  footnote?: string;
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
  /**
   * A second, muted series on the same axes. Used where the story is
   * the divergence between two measures rather than one line's
   * movement: the accent line is the headline, this one the measure
   * that did not follow it.
   */
  second?: {
    label: string;
    points: [BriefBarDatum, BriefBarDatum];
  };
  /** Shaded horizontal band, e.g. a target range. */
  band?: { from: number; to: number; label: string };
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

/** Figure row — where the story is the contrast between two or three
 *  headline numbers, not their scale. A bar chart would imply they are
 *  measures of the same thing; these are not. Issue 005 onward. */
export interface BriefFiguresSpec {
  kind: "figures";
  title: string;
  desc: string;
  valueHeading: string;
  figures: BriefBarDatum[];
  footnote?: string;
}

/** Diverging bars — read against a zero line so a fall reads as a fall.
 *  BriefBars scales from zero and cannot carry negative values.
 *  Issue 005 onward. */
export interface BriefDivergingSpec {
  kind: "diverging";
  title: string;
  desc: string;
  valueHeading: string;
  bars: BriefBarDatum[];
  /** Label for the zero rule, e.g. "no change". */
  zeroLabel?: string;
  footnote?: string;
}

/** Relation — one headline figure, the single condition that moves it,
 *  and the practical steps beneath. For findings whose story is a cause
 *  rather than a distribution. Issue 005 onward. */
export interface BriefRelationSpec {
  kind: "relation";
  title: string;
  desc: string;
  valueHeading: string;
  headline: { display: string; label: string };
  driver: { condition: string; effect: string };
  steps?: string[];
}

/** Two-column comparison — two definitions of the same thing set side
 *  by side, row by row. For arguments where the story is a distinction,
 *  not a distribution. Issue 006 onward (zoned vs feasible capacity). */
export interface BriefCompareSpec {
  kind: "compare";
  title: string;
  desc: string;
  /** Row labels down the left margin. */
  rowLabels: string[];
  /** The muted column. */
  left: { heading: string; cells: string[] };
  /** The accent column — the one the argument lands on. */
  right: { heading: string; cells: string[] };
  footnote?: string;
}

export type BriefChartSpec =
  | BriefBarsSpec
  | BriefSlopeSpec
  | BriefStripSpec
  | BriefFiguresSpec
  | BriefDivergingSpec
  | BriefRelationSpec
  | BriefCompareSpec;

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
      {/* Bars is the original shape, from Issue 002, and it predates the
          visible caption every later shape carries. The titles were
          always written to be read; they were simply never shown. */}
      <figcaption className="text-[12.5px] font-ui font-semibold text-text">
        {spec.title}
      </figcaption>
      <div aria-hidden className="mt-4 flex flex-col gap-3.5">
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
      {spec.footnote ? (
        <p className="mt-3 text-[12px] leading-[1.5] text-text-muted">
          {spec.footnote}
        </p>
      ) : null}
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
  const second = spec.second;
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
            {spec.band ? (
              <rect
                x="0"
                width="100"
                y={y(spec.band.to)}
                height={Math.abs(y(spec.band.from) - y(spec.band.to))}
                fill={CONTEXT_FILL}
                fillOpacity="0.08"
              />
            ) : null}
            {second ? (
              <line
                x1={X_A}
                x2={X_B}
                y1={y(second.points[0].value)}
                y2={y(second.points[1].value)}
                stroke={CONTEXT_FILL}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
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

          {second
            ? (
                [
                  [X_A, second.points[0]],
                  [X_B, second.points[1]],
                ] as const
              ).map(([x, p]) => (
                <span
                  key={`s-${p.label}`}
                  className="absolute size-[9px] rounded-full ring-[2.5px] ring-white"
                  style={{
                    left: `${x}%`,
                    top: `${y(p.value)}%`,
                    transform: "translate(-50%, -50%)",
                    background: CONTEXT_FILL,
                  }}
                />
              ))
            : null}
          {second ? (
            <span
              className="absolute text-[12px] font-semibold text-text-dim tabular-nums"
              style={{
                ...MONO,
                left: `${X_B}%`,
                top: `${y(second.points[1].value)}%`,
                transform: "translate(-50%, 12px)",
              }}
            >
              {second.points[1].display}
            </span>
          ) : null}

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
        {second ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10.5px] text-text-dim" style={MONO}>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2.5px] w-4 rounded-full" style={{ background: ACCENT_FILL }} />
              {spec.valueHeading}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 rounded-full" style={{ background: CONTEXT_FILL }} />
              {second.label}
            </span>
            {spec.band ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-[9px] w-4 rounded-[2px]" style={{ background: CONTEXT_FILL, opacity: 0.16 }} />
                {spec.band.label}
              </span>
            ) : null}
          </div>
        ) : null}
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

/** Figure row — two or three headline numbers side by side, where the
 *  story is the contrast between them rather than a scale. Issue 005
 *  onward (demand holding while conversion weakens). */
export function BriefFigures({ spec }: { spec: BriefFiguresSpec }) {
  return (
    <figure aria-label={`Chart: ${spec.title}. ${spec.desc}`}>
      <figcaption className="text-[12.5px] font-ui font-semibold text-text">
        {spec.title}
      </figcaption>
      <div
        aria-hidden
        className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-[#101820]/[0.08] sm:grid-cols-3"
      >
        {spec.figures.map((f) => (
          <div key={f.label} className="bg-white px-4 py-4">
            <p
              className={`text-[26px] leading-none tracking-[-0.02em] ${
                f.accent ? "font-semibold text-accent-light" : "text-text"
              }`}
              style={MONO}
            >
              {f.display}
            </p>
            <p className="mt-2 text-[11.5px] leading-[1.35] text-text-muted">
              {f.label}
            </p>
          </div>
        ))}
      </div>
      {spec.footnote ? (
        <p className="mt-3 text-[12px] leading-[1.5] text-text-muted">
          {spec.footnote}
        </p>
      ) : null}
      <SrTable
        caption={`${spec.title}. ${spec.desc}`}
        valueHeading={spec.valueHeading}
        rows={spec.figures}
      />
    </figure>
  );
}

/** Diverging bars — values read against a zero line, so a fall reads as
 *  a fall. BriefBars scales from zero and cannot carry negatives.
 *  Issue 005 onward (monthly change in dwelling values). */
export function BriefDiverging({ spec }: { spec: BriefDivergingSpec }) {
  const values = spec.bars.map((b) => b.value);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1;
  const pct = (v: number) => ((v - lo) / span) * 100;
  const zero = pct(0);

  return (
    <figure aria-label={`Chart: ${spec.title}. ${spec.desc}`}>
      <figcaption className="text-[12.5px] font-ui font-semibold text-text">
        {spec.title}
      </figcaption>
      <div aria-hidden className="mt-4 flex flex-col gap-3.5">
        {spec.bars.map((b) => {
          const v = pct(b.value);
          const left = Math.min(zero, v);
          const width = Math.max(Math.abs(v - zero), 0.75);
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
              <div className="relative mt-1.5 h-[9px] rounded-full bg-[#101820]/[0.05]">
                <span
                  className="absolute inset-y-[-3px] w-px"
                  style={{ left: `${zero}%`, background: CONTEXT_FILL, opacity: 0.5 }}
                />
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: b.accent ? ACCENT_FILL : CONTEXT_FILL,
                    opacity: b.accent ? 1 : 0.55,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-text-dim" style={MONO}>
        <span className="inline-block h-3 w-px" style={{ background: CONTEXT_FILL, opacity: 0.5 }} />
        {spec.zeroLabel ?? "zero"}
      </p>
      {spec.footnote ? (
        <p className="mt-2 text-[12px] leading-[1.5] text-text-muted">{spec.footnote}</p>
      ) : null}
      <SrTable
        caption={`${spec.title}. ${spec.desc}`}
        valueHeading={spec.valueHeading}
        rows={spec.bars}
      />
    </figure>
  );
}

/** Relation — one headline figure, the single condition that moves it,
 *  and the practical steps beneath. For findings where the story is a
 *  cause and not a distribution. Issue 005 onward. */
export function BriefRelation({ spec }: { spec: BriefRelationSpec }) {
  return (
    <figure aria-label={`Chart: ${spec.title}. ${spec.desc}`}>
      <figcaption className="text-[12.5px] font-ui font-semibold text-text">
        {spec.title}
      </figcaption>
      <div aria-hidden className="mt-4">
        <div className="rounded-lg border border-[#101820]/[0.08] px-4 py-4">
          <p
            className="text-[30px] leading-none tracking-[-0.02em] font-semibold text-accent-light"
            style={MONO}
          >
            {spec.headline.display}
          </p>
          <p className="mt-2 text-[12px] leading-[1.4] text-text-muted">
            {spec.headline.label}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 pl-4 pt-3">
          <span
            aria-hidden
            className="h-4 w-px"
            style={{ background: CONTEXT_FILL, opacity: 0.4 }}
          />
          <p className="text-[12.5px] leading-[1.45] text-text">
            {spec.driver.condition}{" "}
            <span className="font-semibold text-accent-light" style={MONO}>
              {spec.driver.effect}
            </span>
          </p>
        </div>
        {spec.steps?.length ? (
          <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-2 border-t border-[#101820]/[0.08] pt-3.5">
            {spec.steps.map((s) => (
              <li
                key={s}
                className="rounded-full border border-[#101820]/[0.1] px-3 py-1 text-[11.5px] text-text-muted"
              >
                {s}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <SrTable
        caption={`${spec.title}. ${spec.desc}`}
        valueHeading={spec.valueHeading}
        rows={[
          { label: spec.headline.label, display: spec.headline.display },
          { label: spec.driver.condition, display: spec.driver.effect },
        ]}
      />
    </figure>
  );
}

export function BriefCompare({ spec }: { spec: BriefCompareSpec }) {
  return (
    <figure aria-label={`Comparison: ${spec.title}. ${spec.desc}`}>
      <figcaption className="text-[12.5px] font-ui font-semibold text-text">
        {spec.title}
      </figcaption>
      <div
        aria-hidden
        className="mt-4 overflow-hidden rounded-lg border border-[#101820]/[0.08]"
      >
        <div className="grid grid-cols-[minmax(88px,0.8fr)_1fr_1fr] gap-px bg-[#101820]/[0.08]">
          <div className="bg-white px-3 py-3" />
          <div className="bg-white px-3 py-3">
            <p className="text-[11px] tracking-[0.14em] uppercase font-ui font-semibold text-text-muted">
              {spec.left.heading}
            </p>
          </div>
          <div className="bg-white px-3 py-3">
            <p className="text-[11px] tracking-[0.14em] uppercase font-ui font-semibold text-accent-light">
              {spec.right.heading}
            </p>
          </div>
          {spec.rowLabels.map((label, i) => (
            <Fragment key={label}>
              <div className="bg-white px-3 py-3.5">
                <p className="text-[11px] leading-[1.4] font-ui font-semibold text-text-dim">
                  {label}
                </p>
              </div>
              <div className="bg-white px-3 py-3.5">
                <p className="text-[12.5px] leading-[1.5] text-text-muted">
                  {spec.left.cells[i]}
                </p>
              </div>
              <div className="bg-white px-3 py-3.5">
                <p className="text-[12.5px] leading-[1.5] text-text">
                  {spec.right.cells[i]}
                </p>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      {spec.footnote ? (
        <p className="mt-3 text-[12px] leading-[1.5] text-text-muted">
          {spec.footnote}
        </p>
      ) : null}
      <SrTable
        caption={spec.title}
        valueHeading={spec.right.heading}
        rows={spec.rowLabels.map((label, i) => ({
          label: `${label}: ${spec.left.heading}`,
          display: `${spec.left.cells[i]} / ${spec.right.heading}: ${spec.right.cells[i]}`,
        }))}
      />
    </figure>
  );
}

export function BriefChart({ spec }: { spec: BriefChartSpec }) {
  if (spec.kind === "bars") return <BriefBars spec={spec} />;
  if (spec.kind === "slope") return <BriefSlope spec={spec} />;
  if (spec.kind === "figures") return <BriefFigures spec={spec} />;
  if (spec.kind === "diverging") return <BriefDiverging spec={spec} />;
  if (spec.kind === "relation") return <BriefRelation spec={spec} />;
  if (spec.kind === "compare") return <BriefCompare spec={spec} />;
  return <BriefStrip spec={spec} />;
}
