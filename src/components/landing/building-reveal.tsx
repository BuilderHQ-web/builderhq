"use client";

import { motion } from "motion/react";

/**
 * BuildingReveal — Hero centrepiece animation.
 *
 * A continuous 14-second cinematic loop, rendered entirely in SVG
 * with motion-library path interpolation. The story:
 *
 *   Phase 1  · Drafting   (0.0s –  4.5s)   The floor plan draws
 *                                          itself. Outer walls
 *                                          first, interior walls,
 *                                          dimension labels.
 *   Phase 2  · Building   (4.5s –  7.7s)   Walls extrude up from
 *                                          the lines. Roof drops on.
 *   Phase 3  · Complete   (7.7s – 13.5s)   Windows light up. The
 *                                          building holds in view.
 *   Phase 4  · Reset      (13.5s – 14s)    Fade. Loop.
 *
 * Implementation notes
 * ────────────────────
 *   · Pure SVG + Motion. No CSS 3D, no WebGL, no Three.js.
 *   · Walls extrude by animating the `d` attribute through Motion's
 *     path interpolation — initial path has top corners collapsed
 *     onto the bottom corners (zero height), final path has them at
 *     proper top positions. Motion interpolates the strings frame
 *     by frame.
 *   · Every animated element uses a 14s duration with a per-element
 *     `times` array so they all loop in sync without any external
 *     clock or interval timer.
 *   · Isometric projection at 30° (the architectural standard) —
 *     all geometry computed up-front as constants for predictable
 *     rendering.
 *   · Sized through the `--cube-size` CSS variable inherited from
 *     wherever it's mounted — same approach as HeroCube so the
 *     hero layout is interchangeable.
 */

// ── Isometric geometry ────────────────────────────────────────────
// Reference axes: X = +right/forward, Y = +back/forward, Z = +up.
// Projection: 30° standard isometric. Each world unit projects to
// (x_screen, y_screen) = (X*cos30 - Y*cos30, -X*sin30 - Y*sin30 - Z).

// Floor (Z=0) corners — viewBox is 360 wide, 320 tall.
const A = { x: 180, y: 250 }; // front
const B = { x: 290, y: 190 }; // right
const C = { x: 180, y: 130 }; // back
const D = { x: 70, y: 190 }; //  left

// Wall top (Z=3.6 → 58 px up in screen space).
const WALL_H = 58;
const A_top = { x: A.x, y: A.y - WALL_H };
const B_top = { x: B.x, y: B.y - WALL_H };
const C_top = { x: C.x, y: C.y - WALL_H };
const D_top = { x: D.x, y: D.y - WALL_H };

// Roof apex sits above the centre of the building top.
const ROOF_RISE = 32;
const peak = { x: 180, y: A_top.y - ROOF_RISE - 60 };
// Wait — peak should be centred over the building. Re-derive:
// centre of building top = average of all 4 top corners.
// (180+290+180+70)/4 = 180, (192+132+72+132)/4 = 132
const PEAK = { x: 180, y: 132 - ROOF_RISE };

// Floor-plan helpers — midpoints of each outer edge, used for the
// interior wall cross (two diagonals forming four rooms).
const midAB = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
const midBC = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
const midCD = { x: (C.x + D.x) / 2, y: (C.y + D.y) / 2 };
const midDA = { x: (D.x + A.x) / 2, y: (D.y + A.y) / 2 };

/** Linearly interpolate between two points. */
function lerp(p: { x: number; y: number }, q: { x: number; y: number }, t: number) {
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}

/**
 * Position a point on a wall plane given (u, v) where u is the
 * normalised distance along the wall from bottom-left to bottom-right
 * and v is the normalised height from bottom to top.
 */
function wallPoint(
  bl: { x: number; y: number },
  br: { x: number; y: number },
  tl: { x: number; y: number },
  tr: { x: number; y: number },
  u: number,
  v: number,
) {
  const bottom = lerp(bl, br, u);
  const top = lerp(tl, tr, u);
  return lerp(bottom, top, v);
}

// Build a quadrilateral path from 4 corners.
const quad = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number },
) =>
  `M ${p1.x},${p1.y} L ${p2.x},${p2.y} L ${p3.x},${p3.y} L ${p4.x},${p4.y} Z`;

// ── Pre-computed paths ────────────────────────────────────────────

// Collapsed walls (top corners at bottom positions, zero height).
const FRONT_WALL_COLLAPSED = quad(A, B, B, A);
const FRONT_WALL_FULL = quad(A, B, B_top, A_top);

const RIGHT_WALL_COLLAPSED = quad(B, C, C, B);
const RIGHT_WALL_FULL = quad(B, C, C_top, B_top);

const LEFT_WALL_COLLAPSED = quad(D, A, A, D);
const LEFT_WALL_FULL = quad(D, A, A_top, D_top);

// Roof faces (hip roof, all triangles meeting at peak).
const ROOF_FRONT = `M ${A_top.x},${A_top.y} L ${B_top.x},${B_top.y} L ${PEAK.x},${PEAK.y} Z`;
const ROOF_RIGHT = `M ${B_top.x},${B_top.y} L ${C_top.x},${C_top.y} L ${PEAK.x},${PEAK.y} Z`;
const ROOF_LEFT = `M ${D_top.x},${D_top.y} L ${A_top.x},${A_top.y} L ${PEAK.x},${PEAK.y} Z`;

// Window positions on the front and right walls, in (u, v) space.
const WINDOWS: Array<{
  wall: "front" | "right";
  u: number; // along wall, 0 to 1
  v: number; // up wall, 0 to 1 (bottom-left of window)
  w: number; // width as fraction of wall length
  h: number; // height as fraction of wall height
}> = [
  { wall: "front", u: 0.12, v: 0.28, w: 0.18, h: 0.42 },
  { wall: "front", u: 0.66, v: 0.28, w: 0.18, h: 0.42 },
  { wall: "right", u: 0.18, v: 0.28, w: 0.20, h: 0.42 },
  { wall: "right", u: 0.62, v: 0.05, w: 0.16, h: 0.55 }, // door
];

function windowPath(w: (typeof WINDOWS)[number]) {
  const corners =
    w.wall === "front"
      ? [A, B, A_top, B_top]
      : ([B, C, B_top, C_top] as const);
  const bl = wallPoint(corners[0], corners[1], corners[2], corners[3], w.u, w.v);
  const br = wallPoint(
    corners[0],
    corners[1],
    corners[2],
    corners[3],
    w.u + w.w,
    w.v,
  );
  const tr = wallPoint(
    corners[0],
    corners[1],
    corners[2],
    corners[3],
    w.u + w.w,
    w.v + w.h,
  );
  const tl = wallPoint(
    corners[0],
    corners[1],
    corners[2],
    corners[3],
    w.u,
    w.v + w.h,
  );
  return quad(bl, br, tr, tl);
}

// ── Animation timings ─────────────────────────────────────────────
// All values are fractions of the 14s loop. Keep these in one block
// so the timeline is easy to read end to end.

const LOOP = 14;
const t = (s: number) => s / LOOP;

// ── Component ─────────────────────────────────────────────────────

export function BuildingReveal() {
  return (
    <div
      className="relative mx-auto [--cube-size:260px] sm:[--cube-size:320px] lg:[--cube-size:440px]"
      style={{
        width: "var(--cube-size)",
        height: "calc(var(--cube-size) * 0.92)",
      }}
    >
      {/* Ambient halo behind the scene. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-12 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.20) 0%, rgba(0,212,200,0.06) 32%, transparent 65%)",
        }}
      />

      {/* Phase indicator chip — top-left. */}
      <PhaseIndicator />

      <svg
        viewBox="0 0 360 320"
        className="relative w-full h-full"
        fill="none"
        style={{ overflow: "visible" }}
      >
        {/* Soft floor shadow under the building. */}
        <motion.ellipse
          cx={180}
          cy={252}
          rx={120}
          ry={14}
          fill="url(#shadowGrad)"
          initial={false}
          animate={{
            opacity: [0, 0, 0.55, 0.55, 0],
          }}
          transition={{
            duration: LOOP,
            times: [0, t(5.5), t(7.7), t(12.5), t(13.7)],
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Faint isometric ground grid behind the building. Drawn
            once, fades with the scene. */}
        <GroundGrid />

        {/* ── PHASE 1 — Floor plan drawing ─────────────────────── */}
        <FloorPlan />

        {/* ── PHASE 2 — Walls extruding up ─────────────────────── */}
        <Walls />

        {/* ── PHASE 2b — Roof descending ───────────────────────── */}
        <Roof />

        {/* ── PHASE 3 — Windows lighting up ─────────────────────── */}
        <Windows />

        {/* Static SVG defs — gradients used by all layers. */}
        <defs>
          <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(8,30,44,0.95)" />
            <stop offset="1" stopColor="rgba(4,16,28,0.98)" />
          </linearGradient>
          <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(12,40,58,0.96)" />
            <stop offset="1" stopColor="rgba(6,22,36,0.99)" />
          </linearGradient>
          <radialGradient id="shadowGrad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(0,0,0,0.7)" />
            <stop offset="0.4" stopColor="rgba(0,0,0,0.25)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="windowGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,220,140,0.95)" />
            <stop offset="1" stopColor="rgba(255,180,80,0.75)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

/** Faint dotted isometric grid extending around the building. */
function GroundGrid() {
  const lines: React.ReactElement[] = [];
  const gridSize = 10;
  const step = 22;
  // X-axis grid lines (parallel to A-B edge).
  for (let i = -gridSize; i <= gridSize; i++) {
    const x1 = 180 - 110 + i * (step * 0.866);
    const y1 = 190 + 60 + i * (step * 0.5);
    const x2 = x1 + 220 * 0.866;
    const y2 = y1 - 220 * 0.5;
    lines.push(
      <line
        key={`gx-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(126,245,237,0.06)"
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />,
    );
  }
  // Y-axis grid lines.
  for (let i = -gridSize; i <= gridSize; i++) {
    const x1 = 180 + 110 + i * (-step * 0.866);
    const y1 = 190 + 60 + i * (step * 0.5);
    const x2 = x1 - 220 * 0.866;
    const y2 = y1 - 220 * 0.5;
    lines.push(
      <line
        key={`gy-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(126,245,237,0.06)"
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />,
    );
  }
  return (
    <motion.g
      initial={false}
      animate={{ opacity: [0, 0, 0.6, 0.6, 0] }}
      transition={{
        duration: LOOP,
        times: [0, t(0.3), t(2), t(12.8), t(13.7)],
        repeat: Infinity,
        ease: "easeInOut",
      }}
      // Clip to a circle around the building so the grid fades at
      // the edges and doesn't visually compete with the building.
      style={{
        mask: "radial-gradient(ellipse at 50% 65%, black 30%, transparent 70%)",
        WebkitMask:
          "radial-gradient(ellipse at 50% 65%, black 30%, transparent 70%)",
      }}
    >
      {lines}
    </motion.g>
  );
}

/** Phase 1 — the floor plan draws itself line by line. */
function FloorPlan() {
  // Each outer edge as a separate animated line for sequential
  // draw-in via stroke-dashoffset.
  const edges = [
    { from: A, to: B, t0: 0.5, label: "10 m" },
    { from: B, to: C, t0: 0.7, label: "12 m" },
    { from: C, to: D, t0: 0.9, label: "" },
    { from: D, to: A, t0: 1.1, label: "" },
  ];

  return (
    <g>
      {/* Outer floor outline — 4 lines staggered. */}
      {edges.map((e, i) => (
        <motion.line
          key={`out-${i}`}
          x1={e.from.x}
          y1={e.from.y}
          x2={e.to.x}
          y2={e.to.y}
          stroke="rgba(126,245,237,0.65)"
          strokeWidth="1.6"
          strokeLinecap="round"
          initial={false}
          animate={{
            pathLength: [0, 0, 1, 1, 0],
            opacity: [0, 0, 1, 1, 0],
          }}
          transition={{
            duration: LOOP,
            times: [0, t(e.t0), t(e.t0 + 0.5), t(12.8), t(13.7)],
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Interior walls — two diagonals forming a cross. */}
      <motion.line
        x1={midAB.x}
        y1={midAB.y}
        x2={midCD.x}
        y2={midCD.y}
        stroke="rgba(126,245,237,0.5)"
        strokeWidth="1.2"
        strokeLinecap="round"
        initial={false}
        animate={{
          pathLength: [0, 0, 1, 1, 0],
          opacity: [0, 0, 1, 1, 0],
        }}
        transition={{
          duration: LOOP,
          times: [0, t(2.0), t(2.7), t(12.8), t(13.7)],
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.line
        x1={midDA.x}
        y1={midDA.y}
        x2={midBC.x}
        y2={midBC.y}
        stroke="rgba(126,245,237,0.5)"
        strokeWidth="1.2"
        strokeLinecap="round"
        initial={false}
        animate={{
          pathLength: [0, 0, 1, 1, 0],
          opacity: [0, 0, 1, 1, 0],
        }}
        transition={{
          duration: LOOP,
          times: [0, t(2.3), t(3.0), t(12.8), t(13.7)],
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Dimension labels along the front and right edges. */}
      <DimensionLabel
        x={(A.x + B.x) / 2 + 18}
        y={(A.y + B.y) / 2 + 18}
        text="10 m"
        t0={3.2}
        fadeAt={5.5}
      />
      <DimensionLabel
        x={(B.x + C.x) / 2 + 22}
        y={(B.y + C.y) / 2 - 4}
        text="12 m"
        t0={3.4}
        fadeAt={5.5}
      />
      <DimensionLabel
        x={180}
        y={A.y + 30}
        text="Single dwelling"
        t0={3.6}
        fadeAt={5.5}
        accent
      />
    </g>
  );
}

function DimensionLabel({
  x,
  y,
  text,
  t0,
  fadeAt,
  accent,
}: {
  x: number;
  y: number;
  text: string;
  t0: number;
  fadeAt: number;
  accent?: boolean;
}) {
  return (
    <motion.text
      x={x}
      y={y}
      fill={accent ? "rgba(126,245,237,0.85)" : "rgba(126,245,237,0.55)"}
      fontSize={accent ? "9.5" : "8.5"}
      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      textAnchor="middle"
      letterSpacing={accent ? "0.18em" : "0.08em"}
      style={{ textTransform: accent ? "uppercase" : "none" }}
      initial={false}
      animate={{ opacity: [0, 0, 1, 1, 0] }}
      transition={{
        duration: LOOP,
        times: [0, t(t0), t(t0 + 0.4), t(fadeAt), t(fadeAt + 0.6)],
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {text}
    </motion.text>
  );
}

/** Phase 2 — walls extrude upward from the floor lines. */
function Walls() {
  const wallSpec = [
    {
      key: "front",
      collapsed: FRONT_WALL_COLLAPSED,
      full: FRONT_WALL_FULL,
      t0: 5.5,
    },
    {
      key: "right",
      collapsed: RIGHT_WALL_COLLAPSED,
      full: RIGHT_WALL_FULL,
      t0: 5.7,
    },
    {
      key: "left",
      collapsed: LEFT_WALL_COLLAPSED,
      full: LEFT_WALL_FULL,
      t0: 5.9,
    },
  ];

  return (
    <g>
      {wallSpec.map((w) => (
        <motion.path
          key={w.key}
          fill="url(#wallGrad)"
          stroke="rgba(126,245,237,0.55)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          initial={false}
          animate={{
            d: [
              w.collapsed,
              w.collapsed,
              w.full,
              w.full,
              w.collapsed,
            ],
            opacity: [0, 0, 1, 1, 0],
          }}
          transition={{
            duration: LOOP,
            times: [0, t(w.t0), t(w.t0 + 1.0), t(12.8), t(13.7)],
            repeat: Infinity,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </g>
  );
}

/** Phase 2b — three roof faces drop down to land on top of the walls. */
function Roof() {
  return (
    <g>
      {/* Left roof face — drawn first so right + front sit on top. */}
      <motion.path
        d={ROOF_LEFT}
        fill="url(#roofGrad)"
        stroke="rgba(126,245,237,0.6)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        initial={false}
        animate={{
          opacity: [0, 0, 1, 1, 0],
          y: [-16, -16, 0, 0, -16],
        }}
        transition={{
          duration: LOOP,
          times: [0, t(6.7), t(7.6), t(12.8), t(13.7)],
          repeat: Infinity,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      <motion.path
        d={ROOF_RIGHT}
        fill="url(#roofGrad)"
        stroke="rgba(126,245,237,0.7)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        initial={false}
        animate={{
          opacity: [0, 0, 1, 1, 0],
          y: [-16, -16, 0, 0, -16],
        }}
        transition={{
          duration: LOOP,
          times: [0, t(6.7), t(7.7), t(12.8), t(13.7)],
          repeat: Infinity,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      <motion.path
        d={ROOF_FRONT}
        fill="url(#roofGrad)"
        stroke="rgba(126,245,237,0.8)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        initial={false}
        animate={{
          opacity: [0, 0, 1, 1, 0],
          y: [-16, -16, 0, 0, -16],
        }}
        transition={{
          duration: LOOP,
          times: [0, t(6.7), t(7.7), t(12.8), t(13.7)],
          repeat: Infinity,
          ease: [0.22, 1, 0.36, 1],
        }}
      />

      {/* Peak ridge accent line — catches "light". */}
      <motion.line
        x1={PEAK.x}
        y1={PEAK.y}
        x2={(A_top.x + B_top.x) / 2}
        y2={(A_top.y + B_top.y) / 2}
        stroke="rgba(126,245,237,0.85)"
        strokeWidth="1"
        strokeLinecap="round"
        initial={false}
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{
          duration: LOOP,
          times: [0, t(7.4), t(8.0), t(12.8), t(13.7)],
          repeat: Infinity,
        }}
      />
    </g>
  );
}

/** Phase 3 — windows fade in with warm light. */
function Windows() {
  return (
    <g>
      {WINDOWS.map((w, i) => (
        <motion.g key={i}>
          {/* The window glass with warm gradient. */}
          <motion.path
            d={windowPath(w)}
            fill="url(#windowGlow)"
            stroke="rgba(255,220,140,0.4)"
            strokeWidth="0.6"
            initial={false}
            animate={{
              opacity: [0, 0, 1, 1, 0],
            }}
            transition={{
              duration: LOOP,
              times: [0, t(7.7 + i * 0.18), t(8.3 + i * 0.18), t(12.8), t(13.7)],
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          {/* Soft glow behind window for "lit from within" feel. */}
          <motion.path
            d={windowPath(w)}
            fill="rgba(255,200,120,0.18)"
            initial={false}
            animate={{
              opacity: [0, 0, 1, 1, 0],
            }}
            style={{ filter: "blur(3px)" }}
            transition={{
              duration: LOOP,
              times: [0, t(7.7 + i * 0.18), t(8.3 + i * 0.18), t(12.8), t(13.7)],
              repeat: Infinity,
            }}
          />
        </motion.g>
      ))}
    </g>
  );
}

/** Small chip in the corner showing which phase we're in. */
function PhaseIndicator() {
  const phases = [
    { label: "01 · Drafting", at: 0.5, until: 4.5 },
    { label: "02 · Building", at: 4.5, until: 7.7 },
    { label: "03 · Complete", at: 7.7, until: 12.8 },
  ];

  return (
    <div className="absolute top-0 left-0 z-10 pointer-events-none">
      <div
        className="inline-flex items-center gap-2 pl-2.5 pr-3 py-1 rounded-full backdrop-blur-sm border border-[rgba(126,245,237,0.18)] bg-[rgba(6,18,30,0.7)]"
        style={{ fontFamily: "var(--font-geist, system-ui)" }}
      >
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
          <span className="relative size-1.5 rounded-full bg-accent" />
        </span>
        <span className="relative min-w-[5.5rem] h-3 text-[9.5px] tracking-[0.18em] uppercase text-text-muted font-semibold">
          {phases.map((p, i) => (
            <motion.span
              key={i}
              className="absolute inset-0 whitespace-nowrap"
              initial={false}
              animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
              transition={{
                duration: LOOP,
                times: [
                  0,
                  t(p.at),
                  t(p.at + 0.3),
                  t(p.until - 0.3),
                  t(p.until),
                  1,
                ],
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {p.label}
            </motion.span>
          ))}
        </span>
      </div>
    </div>
  );
}
