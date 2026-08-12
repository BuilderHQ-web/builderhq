/**
 * Plan marks — the drafted vignette on every project band.
 *
 * The cover band's third life. Photographs were retired, then the ink
 * drawings; the ghosted icon that remained read as clip art. What a
 * tendering platform can honestly put on a project card is the thing
 * the whole product is built on: the drawing set. So each type renders
 * a small drafted vignette in real drawing notation, derived from the
 * project's own facts:
 *
 *   · single dwelling — front elevation, one storey band per floor
 *   · multi dwelling  — repeated bays behind a parapet, one per
 *                       dwelling, party walls between
 *   · renovation      — a plan fragment with door-swing arcs; the work
 *                       under change is dashed (internal walls, or an
 *                       opening cut through the external wall)
 *   · extension       — the existing volume solid, the added volume
 *                       dashed, and only the added volume dimensioned
 *
 * Dashed-for-proposed and the door-swing arc are the two conventions
 * anyone who has held a drawing recognises at a glance; nobody else's
 * cards look like this because nobody else's product is the documents.
 *
 * All strokes are hairlines via vector-effect, so the vignette stays
 * crisp from the 124px dashboard band to the 248px marketplace card.
 * Ink is currentColor at low opacity: graphite on the type's paper
 * tint, never a sticker. Server-safe, no hooks.
 */

import type { CoverFacts } from "./project-cover";

/* ── shared drafting furniture ───────────────────────────────────── */

const HAIR = { vectorEffect: "non-scaling-stroke" } as const;

/** Ink weights: primary line work, secondary detail, drafting
 *  furniture, and dashed proposed work. */
const W = { line: 0.42, detail: 0.3, furn: 0.24, dash: 0.36 } as const;

/** A dimension string: extension lines down from two corners, the
 *  dimension line between them, 45° ticks at the ends. No figures —
 *  at band size numerals read as noise, and the ticks alone say
 *  "measured". */
function Dim({ x1, x2, y, drop = 8 }: { x1: number; x2: number; y: number; drop?: number }) {
  return (
    <g stroke="currentColor" strokeWidth={1} opacity={W.furn}>
      <line x1={x1} y1={y - drop} x2={x1} y2={y + 2} {...HAIR} />
      <line x1={x2} y1={y - drop} x2={x2} y2={y + 2} {...HAIR} />
      <line x1={x1 - 3} y1={y} x2={x2 + 3} y2={y} {...HAIR} />
      <line x1={x1 - 2} y1={y + 2} x2={x1 + 2} y2={y - 2} {...HAIR} />
      <line x1={x2 - 2} y1={y + 2} x2={x2 + 2} y2={y - 2} {...HAIR} />
    </g>
  );
}

/** The ground, drawn past both edges of the sheet so every crop of the
 *  band still reads as a fragment of a larger drawing. */
function Ground({ y }: { y: number }) {
  return (
    <line
      x1={-12}
      y1={y}
      x2={172}
      y2={y}
      stroke="currentColor"
      strokeWidth={1}
      opacity={W.line}
      {...HAIR}
    />
  );
}

/* ── the four vignettes ──────────────────────────────────────────── */

/** Front elevation, storeys stacked by the project's floor count. */
function SingleDwelling({ floors }: { floors: number }) {
  const n = Math.min(3, Math.max(1, floors));
  const STOREY = 13;
  const gY = 66; // ground
  const top = gY - n * STOREY;
  const L = 56;
  const R = 104;
  const apexY = top - 11;

  return (
    <g stroke="currentColor" fill="none" strokeWidth={1}>
      <Ground y={gY} />
      {/* walls and gable */}
      <g opacity={W.line}>
        <path d={`M ${L} ${gY} V ${top} L ${(L + R) / 2} ${apexY} L ${R} ${top} V ${gY}`} {...HAIR} />
        {/* eaves carried a touch past the walls */}
        <line x1={L - 5} y1={top} x2={L} y2={top} {...HAIR} />
        <line x1={R} y1={top} x2={R + 5} y2={top} {...HAIR} />
      </g>
      {/* storey separation lines */}
      <g opacity={W.furn}>
        {Array.from({ length: n - 1 }, (_, i) => (
          <line key={i} x1={L} y1={gY - (i + 1) * STOREY} x2={R} y2={gY - (i + 1) * STOREY} {...HAIR} />
        ))}
      </g>
      {/* door on the ground storey, windows above */}
      <g opacity={W.detail}>
        <rect x={76} y={gY - 11} width={8} height={11} {...HAIR} />
        <rect x={62} y={gY - 10} width={8} height={6} {...HAIR} />
        <rect x={90} y={gY - 10} width={8} height={6} {...HAIR} />
        {Array.from({ length: n - 1 }, (_, i) => {
          const wy = gY - (i + 2) * STOREY + 4;
          return (
            <g key={i}>
              <rect x={62} y={wy} width={8} height={6} {...HAIR} />
              <rect x={76} y={wy} width={8} height={6} {...HAIR} />
              <rect x={90} y={wy} width={8} height={6} {...HAIR} />
            </g>
          );
        })}
      </g>
      <Dim x1={L} x2={R} y={76} />
    </g>
  );
}

/** A parapet block of repeated dwellings, party walls between. */
function MultiDwelling({ dwellings }: { dwellings: number }) {
  const n = Math.min(4, Math.max(2, dwellings));
  const BAY = 26;
  const gY = 66; // one ground line across the whole card family
  const top = 32;
  const L = 80 - (n * BAY) / 2;
  const R = 80 + (n * BAY) / 2;

  return (
    <g stroke="currentColor" fill="none" strokeWidth={1}>
      <Ground y={gY} />
      <g opacity={W.line}>
        <rect x={L} y={top} width={n * BAY} height={gY - top} {...HAIR} />
        {/* parapet coping */}
        <line x1={L} y1={top + 3} x2={R} y2={top + 3} {...HAIR} />
      </g>
      {/* party walls */}
      <g opacity={W.line}>
        {Array.from({ length: n - 1 }, (_, i) => (
          <line key={i} x1={L + (i + 1) * BAY} y1={top + 3} x2={L + (i + 1) * BAY} y2={gY} {...HAIR} />
        ))}
      </g>
      {/* each bay: door, and a window per storey */}
      <g opacity={W.detail}>
        {Array.from({ length: n }, (_, i) => {
          const bx = L + i * BAY;
          return (
            <g key={i}>
              <rect x={bx + 5} y={gY - 10} width={6} height={10} {...HAIR} />
              <rect x={bx + 15} y={gY - 9} width={7} height={5} {...HAIR} />
              <rect x={bx + 6} y={top + 8} width={7} height={5} {...HAIR} />
              <rect x={bx + 15} y={top + 8} width={7} height={5} {...HAIR} />
            </g>
          );
        })}
      </g>
      <Dim x1={L} x2={R} y={76} />
    </g>
  );
}

/** A plan fragment. Double-line external walls, a door swung on its
 *  arc, and the work under change dashed: internal walls for an
 *  internal scope, an opening cut through the external wall for a
 *  structural one. */
function Renovation({ structural }: { structural: boolean }) {
  const L = 48;
  const R = 114;
  const T = 24;
  const B = 62;

  return (
    <g stroke="currentColor" fill="none" strokeWidth={1}>
      {/* external walls, double line, with the door opening left in
          the bottom wall */}
      <g opacity={W.line}>
        <path d={`M 74 ${B} H ${L} V ${T} H ${R} V ${B} H 88`} {...HAIR} />
        <path d={`M 74 ${B - 2.5} H ${L + 2.5} V ${T + 2.5} H ${R - 2.5} V ${B - 2.5} H 88`} {...HAIR} />
      </g>
      {/* the door leaf and its swing — the glyph that says "plan" */}
      <g opacity={W.detail}>
        <line x1={74} y1={B} x2={74} y2={B - 13} {...HAIR} />
        <path d={`M 74 ${B - 13} A 13 13 0 0 1 87 ${B}`} strokeDasharray="1.6 2.2" {...HAIR} />
      </g>
      {structural ? (
        // structural: a length of the external wall dashed for removal,
        // stub ticks marking the new opening
        <g opacity={W.dash}>
          <line x1={62} y1={T} x2={96} y2={T} stroke="#fbf9f4" strokeWidth={4} {...HAIR} />
          <line x1={62} y1={T + 1.2} x2={96} y2={T + 1.2} strokeDasharray="3.2 2.4" {...HAIR} />
          <line x1={62} y1={T - 3} x2={62} y2={T + 5.5} {...HAIR} />
          <line x1={96} y1={T - 3} x2={96} y2={T + 5.5} {...HAIR} />
        </g>
      ) : (
        // internal: the partition under change dashed, with its own
        // small door swing
        <g opacity={W.dash}>
          <line x1={84} y1={T + 2.5} x2={84} y2={44} strokeDasharray="3.2 2.4" {...HAIR} />
          <line x1={84} y1={52} x2={84} y2={B - 2.5} strokeDasharray="3.2 2.4" {...HAIR} />
          <path d={`M 84 52 A 8 8 0 0 1 76 44`} strokeDasharray="1.4 2" opacity={0.8} {...HAIR} />
        </g>
      )}
      <Dim x1={L} x2={R} y={74} drop={6} />
    </g>
  );
}

/** Side elevation: the existing volume solid, the addition dashed,
 *  and only the addition dimensioned. A ground addition leaves the
 *  gable alone; an upper-storey addition stands on a flat-topped
 *  existing volume, since that roof is what the work replaces. */
function Extension({ kind }: { kind: "ground" | "first" | "both" }) {
  const gY = 66;
  const dash = "3.2 2.4";
  // existing cottage
  const eL = kind === "ground" ? 44 : 52;
  const eR = eL + 40;
  const eTop = 44;
  const apex = eTop - 11;
  // ground-floor addition to the right
  const aR = eR + 30;
  const upper = kind === "first" || kind === "both";

  return (
    <g stroke="currentColor" fill="none" strokeWidth={1}>
      <Ground y={gY} />
      <g opacity={W.line}>
        {upper ? (
          // flat-topped: the eave line the new storey will stand on
          <path d={`M ${eL - 4} ${eTop} H ${eR + 4} M ${eL} ${gY} V ${eTop} M ${eR} ${eTop} V ${gY}`} {...HAIR} />
        ) : (
          <path d={`M ${eL} ${gY} V ${eTop} L ${(eL + eR) / 2} ${apex} L ${eR} ${eTop} V ${gY}`} {...HAIR} />
        )}
        <rect x={eL + 8} y={gY - 10} width={7} height={6} {...HAIR} />
        <rect x={eL + 24} y={gY - 10} width={7} height={6} {...HAIR} />
      </g>
      {(kind === "ground" || kind === "both") ? (
        <g opacity={W.dash} strokeDasharray={dash}>
          {/* skillion roof falling away from the existing wall */}
          <path d={`M ${eR} ${eTop + 4} L ${aR} ${eTop + 10} V ${gY}`} {...HAIR} />
          <rect x={eR + 8} y={gY - 12} width={9} height={7} strokeDasharray="2 1.8" {...HAIR} />
        </g>
      ) : null}
      {upper ? (
        <g opacity={W.dash} strokeDasharray={dash}>
          {/* the new storey, a gentle skillion falling to the rear */}
          <path d={`M ${eL + 2} ${eTop} V ${eTop - 15} L ${eR - 2} ${eTop - 19} V ${eTop}`} {...HAIR} />
          <rect x={eL + 10} y={eTop - 12} width={7} height={5} strokeDasharray="2 1.8" {...HAIR} />
          <rect x={eL + 24} y={eTop - 12} width={7} height={5} strokeDasharray="2 1.8" {...HAIR} />
        </g>
      ) : null}
      {/* only the added work is measured */}
      {kind === "first" ? (
        <Dim x1={eL + 2} x2={eR - 2} y={76} />
      ) : (
        <Dim x1={eR} x2={aR} y={76} />
      )}
    </g>
  );
}

/* ── the mark ────────────────────────────────────────────────────── */

/**
 * The drafted vignette for a project's facts. Absolute-fills its
 * (relative) parent; `slice` keeps the sheet cropped like a fragment
 * rather than letterboxed like a sticker.
 */
export function PlanMark({ facts }: { facts: CoverFacts }) {
  let art: React.ReactElement;
  switch (facts.type) {
    case "single_dwelling":
      art = <SingleDwelling floors={facts.floors ?? 2} />;
      break;
    case "multi_dwelling":
      art = <MultiDwelling dwellings={facts.dwellingCount ?? 3} />;
      break;
    case "renovation":
      art = (
        <Renovation
          structural={
            facts.renovationScope === "structural" ||
            facts.renovationScope === "full_internal_and_external"
          }
        />
      );
      break;
    case "extension":
      art = (
        <Extension
          kind={
            facts.extensionType === "first_floor"
              ? "first"
              : facts.extensionType === "ground_and_first"
                ? "both"
                : "ground"
          }
        />
      );
      break;
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full text-text"
    >
      {art}
    </svg>
  );
}
