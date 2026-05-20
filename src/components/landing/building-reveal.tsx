"use client";

/**
 * BuildingReveal — Hero centrepiece.
 *
 * An always-visible isometric house with a 14-second cinematic
 * overlay loop. The building itself is rendered statically so
 * there is never a blank state: every visitor lands on a complete
 * scene from frame one. On top of that base we cycle three
 * "moments" via pure CSS keyframes:
 *
 *   01 Drafting   Dimension callouts, ground grid, a sweeping
 *                 measurement line travel across the building.
 *   02 Building   A bright construction sweep washes upward,
 *                 wall edges pulse, roof ridge catches light.
 *   03 Complete   Windows glow warm, the title-block fades in,
 *                 the whole scene breathes.
 *
 * Implementation
 * ──────────────
 * · The SVG is pure static markup. Animations are CSS keyframes
 *   attached via className and class-scoped `animation-delay`s.
 * · No Motion path interpolation, no JS-driven RAF, no useEffect
 *   timers. The browser handles everything, which means the
 *   animation cannot get stuck in a `opacity: 0` initial state on
 *   any production build — there is no JS in the rendering path.
 * · Sized through the `--cube-size` CSS variable so the hero
 *   layout stays interchangeable with the other variants.
 */

// ── Isometric geometry ────────────────────────────────────────────
// 30° standard isometric, viewBox 360 × 320. World axes:
//   X = +right/forward, Y = +back/forward, Z = +up.

const A = { x: 180, y: 250 }; // floor — front
const B = { x: 290, y: 190 }; // floor — right
const C = { x: 180, y: 130 }; // floor — back
const D = { x: 70, y: 190 }; //  floor — left

const WALL_H = 58;
const A_top = { x: A.x, y: A.y - WALL_H };
const B_top = { x: B.x, y: B.y - WALL_H };
const C_top = { x: C.x, y: C.y - WALL_H };
const D_top = { x: D.x, y: D.y - WALL_H };

// Hip-roof apex sits above the centre of the building top.
const ROOF_RISE = 32;
const PEAK = { x: 180, y: C_top.y - ROOF_RISE };

// Floor midpoints — used by the interior wall cross.
const midAB = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
const midBC = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
const midCD = { x: (C.x + D.x) / 2, y: (C.y + D.y) / 2 };
const midDA = { x: (D.x + A.x) / 2, y: (D.y + A.y) / 2 };

const quad = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number },
) =>
  `M ${p1.x},${p1.y} L ${p2.x},${p2.y} L ${p3.x},${p3.y} L ${p4.x},${p4.y} Z`;

const FRONT_WALL = quad(A, B, B_top, A_top);
const RIGHT_WALL = quad(B, C, C_top, B_top);
const LEFT_WALL = quad(D, A, A_top, D_top);

const ROOF_FRONT = `M ${A_top.x},${A_top.y} L ${B_top.x},${B_top.y} L ${PEAK.x},${PEAK.y} Z`;
const ROOF_RIGHT = `M ${B_top.x},${B_top.y} L ${C_top.x},${C_top.y} L ${PEAK.x},${PEAK.y} Z`;
const ROOF_LEFT = `M ${D_top.x},${D_top.y} L ${A_top.x},${A_top.y} L ${PEAK.x},${PEAK.y} Z`;

// Window placement on the front and right walls in (u, v) space.
function lerp(p: { x: number; y: number }, q: { x: number; y: number }, t: number) {
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}
function wallPoint(
  bl: { x: number; y: number },
  br: { x: number; y: number },
  tl: { x: number; y: number },
  tr: { x: number; y: number },
  u: number,
  v: number,
) {
  return lerp(lerp(bl, br, u), lerp(tl, tr, u), v);
}

const WINDOWS: Array<{
  wall: "front" | "right";
  u: number;
  v: number;
  w: number;
  h: number;
  kind: "window" | "door";
}> = [
  { wall: "front", u: 0.12, v: 0.28, w: 0.18, h: 0.42, kind: "window" },
  { wall: "front", u: 0.66, v: 0.28, w: 0.18, h: 0.42, kind: "window" },
  { wall: "right", u: 0.18, v: 0.28, w: 0.20, h: 0.42, kind: "window" },
  { wall: "right", u: 0.62, v: 0.05, w: 0.16, h: 0.62, kind: "door" },
];

function windowPath(w: (typeof WINDOWS)[number]) {
  const corners =
    w.wall === "front" ? [A, B, A_top, B_top] : ([B, C, B_top, C_top] as const);
  const bl = wallPoint(corners[0], corners[1], corners[2], corners[3], w.u, w.v);
  const br = wallPoint(corners[0], corners[1], corners[2], corners[3], w.u + w.w, w.v);
  const tr = wallPoint(
    corners[0],
    corners[1],
    corners[2],
    corners[3],
    w.u + w.w,
    w.v + w.h,
  );
  const tl = wallPoint(corners[0], corners[1], corners[2], corners[3], w.u, w.v + w.h);
  return quad(bl, br, tr, tl);
}

// ── Component ─────────────────────────────────────────────────────

export function BuildingReveal() {
  return (
    <div
      className="building-reveal relative mx-auto [--cube-size:260px] sm:[--cube-size:320px] lg:[--cube-size:440px]"
      style={{
        width: "var(--cube-size)",
        height: "calc(var(--cube-size) * 0.92)",
      }}
    >
      <BuildingRevealStyles />

      {/* Ambient halo behind the scene. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-12 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.20) 0%, rgba(0,212,200,0.06) 32%, transparent 65%)",
        }}
      />

      <PhaseIndicator />

      <svg
        viewBox="0 0 360 320"
        className="relative block w-full h-full bhq-float"
        fill="none"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="bhq-wallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(10,34,50,0.96)" />
            <stop offset="1" stopColor="rgba(4,14,24,0.99)" />
          </linearGradient>
          <linearGradient id="bhq-wallGradLeft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(6,22,36,0.97)" />
            <stop offset="1" stopColor="rgba(3,10,18,0.99)" />
          </linearGradient>
          <linearGradient id="bhq-roofGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(14,46,66,0.98)" />
            <stop offset="1" stopColor="rgba(8,28,44,0.99)" />
          </linearGradient>
          <linearGradient id="bhq-roofGradDark" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(6,22,36,0.98)" />
            <stop offset="1" stopColor="rgba(4,14,24,0.99)" />
          </linearGradient>
          <radialGradient id="bhq-shadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(0,0,0,0.7)" />
            <stop offset="0.4" stopColor="rgba(0,0,0,0.25)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="bhq-windowGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,224,150,1)" />
            <stop offset="1" stopColor="rgba(255,184,90,0.9)" />
          </linearGradient>
          <linearGradient id="bhq-sweep" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="rgba(126,245,237,0)" />
            <stop offset="0.5" stopColor="rgba(126,245,237,0.55)" />
            <stop offset="1" stopColor="rgba(126,245,237,0)" />
          </linearGradient>
          {/* Clip the construction sweep to the building footprint so
              the glowing band visually fills the volume. */}
          <clipPath id="bhq-building-clip">
            <path
              d={`M ${D.x},${D.y} L ${A.x},${A.y} L ${B.x},${B.y} L ${PEAK.x},${PEAK.y} L ${D_top.x},${D_top.y} Z`}
            />
          </clipPath>
        </defs>

        {/* Soft floor shadow. */}
        <ellipse
          cx={180}
          cy={252}
          rx={130}
          ry={15}
          fill="url(#bhq-shadow)"
          opacity={0.55}
        />

        {/* Faint ground grid — drafting moment fades it in. */}
        <GroundGrid />

        {/* Foundation outline — a dashed parallelogram around the
            footprint, sitting beneath the building. Always visible. */}
        <Foundation />

        {/* ── Static building (always visible) ──────────────────── */}
        {/* Walls — drawn back-to-front so the front wall sits on top. */}
        <path
          d={LEFT_WALL}
          fill="url(#bhq-wallGradLeft)"
          stroke="rgba(126,245,237,0.50)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d={RIGHT_WALL}
          fill="url(#bhq-wallGrad)"
          stroke="rgba(126,245,237,0.55)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d={FRONT_WALL}
          fill="url(#bhq-wallGrad)"
          stroke="rgba(126,245,237,0.70)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Roof — left/right back faces first, front face on top. */}
        <path
          d={ROOF_LEFT}
          fill="url(#bhq-roofGradDark)"
          stroke="rgba(126,245,237,0.55)"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d={ROOF_RIGHT}
          fill="url(#bhq-roofGrad)"
          stroke="rgba(126,245,237,0.65)"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d={ROOF_FRONT}
          fill="url(#bhq-roofGrad)"
          stroke="rgba(126,245,237,0.80)"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Peak ridge accent line. */}
        <line
          x1={PEAK.x}
          y1={PEAK.y}
          x2={(A_top.x + B_top.x) / 2}
          y2={(A_top.y + B_top.y) / 2}
          stroke="rgba(126,245,237,0.85)"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Vertical corner edge accents. */}
        <CornerEdges />

        {/* Static windows — always visible, then a CSS pulse lights
            them up during the Complete phase. */}
        {WINDOWS.map((w, i) => (
          <g key={i} className={`bhq-window bhq-window-${i}`}>
            <path
              d={windowPath(w)}
              fill="url(#bhq-windowGlow)"
              stroke="rgba(255,220,140,0.55)"
              strokeWidth="0.7"
              className="bhq-window-glass"
            />
            <path
              d={windowPath(w)}
              fill="rgba(255,200,120,0.30)"
              className="bhq-window-aura"
              style={{ filter: "blur(3px)" }}
            />
          </g>
        ))}

        {/* ── Drafting overlay ──────────────────────────────────── */}
        {/* Floor-plan trace lines on the building's footprint. They
            "redraw" themselves on each loop via stroke-dashoffset. */}
        <FloorPlanTrace />

        {/* Dimension callouts along the front and right edges. */}
        <Dimension from={A} to={B} offset={26} text="10 m" delay={0} />
        <Dimension from={B} to={C} offset={26} text="12 m" delay={0.18} />

        {/* Construction sweep — a glowing band that rises from the
            foundation to the roof apex during the Building moment. */}
        <g clipPath="url(#bhq-building-clip)" className="bhq-sweep">
          <rect
            x={50}
            y={A.y - 14}
            width={260}
            height={26}
            fill="url(#bhq-sweep)"
          />
        </g>

        {/* Scan dot — a single bright dot that traces the floor-plan
            perimeter during the Drafting moment, like a CAD cursor
            placing points. SVG-native <animateMotion> handles the
            path traversal so the dot lands exactly on the polygon. */}
        <g className="bhq-scan-dot">
          <circle r={6} fill="rgba(126,245,237,0.45)" />
          <circle r={3} fill="rgba(126,245,237,1)" />
          <animateMotion
            dur="14s"
            repeatCount="indefinite"
            keyTimes="0; 0.04; 0.28; 1"
            keyPoints="0; 0; 1; 1"
            calcMode="linear"
            path={`M ${A.x},${A.y} L ${B.x},${B.y} L ${C.x},${C.y} L ${D.x},${D.y} L ${A.x},${A.y}`}
          />
        </g>

        {/* Title block — bottom-right, fades in during Complete. */}
        <TitleBlock />
      </svg>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

/** Faint isometric ground grid behind the building. Pure static SVG. */
function GroundGrid() {
  const lines: React.ReactElement[] = [];
  const gridSize = 9;
  const step = 22;
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
        stroke="rgba(126,245,237,0.07)"
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />,
    );
  }
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
        stroke="rgba(126,245,237,0.07)"
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />,
    );
  }
  return (
    <g
      className="bhq-grid"
      style={{
        mask: "radial-gradient(ellipse at 50% 65%, black 30%, transparent 70%)",
        WebkitMask:
          "radial-gradient(ellipse at 50% 65%, black 30%, transparent 70%)",
      }}
    >
      {lines}
    </g>
  );
}

/** Dashed foundation parallelogram around the footprint. */
function Foundation() {
  const center = { x: 180, y: 190 };
  const scale = 1.14;
  const expand = (p: { x: number; y: number }) => ({
    x: center.x + (p.x - center.x) * scale,
    y: center.y + (p.y - center.y) * scale,
  });
  return (
    <path
      d={quad(expand(A), expand(B), expand(C), expand(D))}
      fill="rgba(0,212,200,0.04)"
      stroke="rgba(126,245,237,0.22)"
      strokeWidth="0.6"
      strokeDasharray="3 5"
    />
  );
}

/** Vertical accent edges where walls meet. */
function CornerEdges() {
  const edges = [
    { from: A, to: A_top },
    { from: B, to: B_top },
    { from: D, to: D_top },
  ];
  return (
    <g>
      {edges.map((e, i) => (
        <line
          key={`edge-${i}`}
          x1={e.from.x}
          y1={e.from.y}
          x2={e.to.x}
          y2={e.to.y}
          stroke="rgba(126,245,237,0.85)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

/**
 * Floor-plan trace lines drawn on the building's footprint. They use
 * stroke-dasharray + animated stroke-dashoffset (pure CSS) so they
 * appear to "redraw" on each loop. Always visible (subtle teal) when
 * not actively drawing.
 */
function FloorPlanTrace() {
  return (
    <g className="bhq-trace">
      {/* Interior wall cross — two diagonals between mid-edge points. */}
      <line
        x1={midAB.x}
        y1={midAB.y}
        x2={midCD.x}
        y2={midCD.y}
        stroke="rgba(126,245,237,0.55)"
        strokeWidth="1.1"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        className="bhq-trace-line bhq-trace-1"
      />
      <line
        x1={midDA.x}
        y1={midDA.y}
        x2={midBC.x}
        y2={midBC.y}
        stroke="rgba(126,245,237,0.55)"
        strokeWidth="1.1"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        className="bhq-trace-line bhq-trace-2"
      />
    </g>
  );
}

function Dimension({
  from,
  to,
  offset,
  text,
  delay,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  offset: number;
  text: string;
  delay: number;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const px = dy / len;
  const py = -dx / len;
  const ox = -px * offset;
  const oy = -py * offset;
  const f = { x: from.x + ox, y: from.y + oy };
  const tt = { x: to.x + ox, y: to.y + oy };
  const tickHalf = 3.5;
  const mx = (f.x + tt.x) / 2;
  const my = (f.y + tt.y) / 2;
  const tox = -px * 8;
  const toy = -py * 8;
  let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;

  return (
    <g className="bhq-dim" style={{ animationDelay: `${delay}s` }}>
      <line
        x1={from.x}
        y1={from.y}
        x2={f.x}
        y2={f.y}
        stroke="rgba(126,245,237,0.35)"
        strokeWidth="0.6"
      />
      <line
        x1={to.x}
        y1={to.y}
        x2={tt.x}
        y2={tt.y}
        stroke="rgba(126,245,237,0.35)"
        strokeWidth="0.6"
      />
      <line
        x1={f.x}
        y1={f.y}
        x2={tt.x}
        y2={tt.y}
        stroke="rgba(126,245,237,0.55)"
        strokeWidth="0.9"
      />
      <line
        x1={f.x - py * tickHalf}
        y1={f.y + px * tickHalf}
        x2={f.x + py * tickHalf}
        y2={f.y - px * tickHalf}
        stroke="rgba(126,245,237,0.7)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1={tt.x - py * tickHalf}
        y1={tt.y + px * tickHalf}
        x2={tt.x + py * tickHalf}
        y2={tt.y - px * tickHalf}
        stroke="rgba(126,245,237,0.7)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <text
        x={mx + tox}
        y={my + toy}
        fill="rgba(126,245,237,0.9)"
        fontSize="9"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing="0.06em"
        transform={`rotate(${angleDeg} ${mx + tox} ${my + toy})`}
      >
        {text}
      </text>
    </g>
  );
}

/** Architectural title block — bottom-right, fades in during Complete. */
function TitleBlock() {
  return (
    <g className="bhq-title">
      <rect
        x={232}
        y={278}
        width={120}
        height={34}
        rx={2}
        fill="rgba(6,18,30,0.85)"
        stroke="rgba(126,245,237,0.25)"
        strokeWidth="0.6"
      />
      <line
        x1={236}
        y1={282}
        x2={348}
        y2={282}
        stroke="rgba(126,245,237,0.5)"
        strokeWidth="0.4"
      />
      <text
        x={238}
        y={293}
        fill="rgba(126,245,237,0.85)"
        fontSize="7.5"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.18em"
        style={{ textTransform: "uppercase" }}
      >
        45 Sydney Rd
      </text>
      <text
        x={238}
        y={302}
        fill="rgba(238,246,255,0.6)"
        fontSize="6.5"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.10em"
      >
        Brunswick · VIC
      </text>
      <text
        x={238}
        y={310}
        fill="rgba(126,245,237,0.55)"
        fontSize="6"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.10em"
      >
        Scale 1:100
      </text>
      <text
        x={348}
        y={310}
        fill="rgba(126,245,237,0.7)"
        fontSize="6"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.18em"
        textAnchor="end"
        style={{ textTransform: "uppercase" }}
      >
        Built
      </text>
    </g>
  );
}

/**
 * The phase chip in the top-left of the animation area. Three labels
 * cycle through every 14 seconds, synchronised with the SVG overlays.
 * Pure CSS animation-delay — no JS state.
 */
function PhaseIndicator() {
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
        <span className="relative min-w-[6rem] h-3 text-[9.5px] tracking-[0.18em] uppercase text-text-muted font-semibold">
          <span className="absolute inset-0 whitespace-nowrap bhq-phase bhq-phase-1">
            01 · Drafting
          </span>
          <span className="absolute inset-0 whitespace-nowrap bhq-phase bhq-phase-2">
            02 · Building
          </span>
          <span className="absolute inset-0 whitespace-nowrap bhq-phase bhq-phase-3">
            03 · Complete
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * All animation keyframes live in one inlined <style> block so the
 * component is self-contained and styles cannot be tree-shaken away
 * by an over-aggressive CSS prune. The whole timeline is 14 seconds.
 *
 *   Drafting   0.0s –  4.5s
 *   Building   4.5s –  8.0s
 *   Complete   8.0s – 12.5s
 *   Settle    12.5s – 14.0s
 */
function BuildingRevealStyles() {
  return (
    <style>{`
      .building-reveal .bhq-float {
        animation: bhq-float 7s ease-in-out infinite;
        transform-origin: 50% 70%;
      }
      @keyframes bhq-float {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-4px); }
      }

      /* Ground grid — gently breathes through the loop. */
      .building-reveal .bhq-grid {
        animation: bhq-grid 14s ease-in-out infinite;
      }
      @keyframes bhq-grid {
        0%, 100% { opacity: 0.55; }
        45%      { opacity: 0.55; }
        58%      { opacity: 0.25; }
        85%      { opacity: 0.40; }
      }

      /* Interior wall trace — redraws itself on the Drafting beat. */
      .building-reveal .bhq-trace-line {
        animation: bhq-trace 14s ease-in-out infinite;
      }
      .building-reveal .bhq-trace-2 { animation-delay: 0.4s; }
      @keyframes bhq-trace {
        0%   { stroke-dashoffset: 1; opacity: 0; }
        2%   { stroke-dashoffset: 1; opacity: 1; }
        18%  { stroke-dashoffset: 0; opacity: 1; }
        96%  { stroke-dashoffset: 0; opacity: 1; }
        100% { stroke-dashoffset: 1; opacity: 0; }
      }

      /* Dimension callouts — fade in during Drafting, fade out at
         the start of the Building beat. */
      .building-reveal .bhq-dim {
        opacity: 0;
        animation: bhq-dim 14s ease-in-out infinite;
      }
      @keyframes bhq-dim {
        0%   { opacity: 0; }
        15%  { opacity: 0; }
        22%  { opacity: 1; }
        45%  { opacity: 1; }
        52%  { opacity: 0; }
        100% { opacity: 0; }
      }

      /* Construction sweep — clipped to the building footprint, the
         band rises from foundation height to roof apex, then fades. */
      .building-reveal .bhq-sweep {
        opacity: 0;
        animation: bhq-sweep 14s ease-in-out infinite;
        transform-box: fill-box;
        transform-origin: center;
      }
      @keyframes bhq-sweep {
        0%   { opacity: 0; transform: translateY(0); }
        30%  { opacity: 0; transform: translateY(0); }
        34%  { opacity: 1; transform: translateY(0); }
        52%  { opacity: 1; transform: translateY(-145px); }
        58%  { opacity: 0; transform: translateY(-160px); }
        100% { opacity: 0; transform: translateY(-160px); }
      }

      /* Scan dot — visibility envelope. Position is handled by the
         <animateMotion> child element inside the group, so this
         keyframe only controls when the dot fades in and out. */
      .building-reveal .bhq-scan-dot {
        opacity: 0;
        animation: bhq-scan 14s ease-in-out infinite;
      }
      @keyframes bhq-scan {
        0%   { opacity: 0; }
        4%   { opacity: 1; }
        28%  { opacity: 1; }
        32%  { opacity: 0; }
        100% { opacity: 0; }
      }

      /* Windows — always faintly visible, then a warm pulse during
         the Complete beat. Two breaths give the lights a "lived-in"
         feel before the loop resets. */
      .building-reveal .bhq-window {
        opacity: 0.18;
        animation: bhq-window 14s ease-in-out infinite;
      }
      .building-reveal .bhq-window-0 { animation-delay: 0s; }
      .building-reveal .bhq-window-1 { animation-delay: 0.12s; }
      .building-reveal .bhq-window-2 { animation-delay: 0.24s; }
      .building-reveal .bhq-window-3 { animation-delay: 0.06s; }
      @keyframes bhq-window {
        0%   { opacity: 0.10; }
        55%  { opacity: 0.10; }
        62%  { opacity: 1; }
        70%  { opacity: 0.72; }
        76%  { opacity: 1; }
        84%  { opacity: 0.72; }
        90%  { opacity: 1; }
        96%  { opacity: 0.6; }
        100% { opacity: 0.10; }
      }

      /* Title block — fades in mid-Complete, lingers until the
         loop reset. */
      .building-reveal .bhq-title {
        opacity: 0;
        animation: bhq-title 14s ease-in-out infinite;
      }
      @keyframes bhq-title {
        0%   { opacity: 0; }
        66%  { opacity: 0; }
        72%  { opacity: 1; }
        94%  { opacity: 1; }
        98%  { opacity: 0; }
        100% { opacity: 0; }
      }

      /* Phase chip labels — three labels share the same min-width
         box. Each fades in for its window then out so only one is
         visible at a time. */
      .building-reveal .bhq-phase {
        opacity: 0;
        animation: bhq-phase 14s ease-in-out infinite;
      }
      .building-reveal .bhq-phase-1 { animation-delay: 0s; }
      .building-reveal .bhq-phase-2 { animation-delay: 4.5s; }
      .building-reveal .bhq-phase-3 { animation-delay: 8s; }
      @keyframes bhq-phase {
        0%   { opacity: 0; }
        3%   { opacity: 1; }
        28%  { opacity: 1; }
        32%  { opacity: 0; }
        100% { opacity: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .building-reveal .bhq-float,
        .building-reveal .bhq-grid,
        .building-reveal .bhq-trace-line,
        .building-reveal .bhq-dim,
        .building-reveal .bhq-sweep,
        .building-reveal .bhq-scan-dot,
        .building-reveal .bhq-window,
        .building-reveal .bhq-title,
        .building-reveal .bhq-phase {
          animation: none;
        }
        .building-reveal .bhq-trace-line { stroke-dashoffset: 0; opacity: 1; }
        .building-reveal .bhq-dim,
        .building-reveal .bhq-title { opacity: 1; }
        .building-reveal .bhq-window { opacity: 1; }
        .building-reveal .bhq-phase-1 { opacity: 1; }
      }
    `}</style>
  );
}
