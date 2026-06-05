"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
} from "motion/react";

/**
 * BlueprintBuild — the hero showpiece.
 *
 * An architectural drawing of a home that DRAWS ITSELF in blueprint-teal
 * lines, then BUILDS: glazing fills in, windows warm to life, dimension
 * lines tick in, a grounding shadow lands. Plans → built, the product
 * promise made literal.
 *
 * Geometry is projected from real 3D coordinates by `iso()` (so every
 * line is mathematically consistent — no hand-typed coordinates to drift),
 * rendered as self-drawing SVG paths, and choreographed with motion/react.
 * Honors prefers-reduced-motion (shows the finished build instantly) and
 * stays GPU-cheap (~40 nodes, one breathing bloom, pointer-spring tilt).
 */

// ── isometric projection (true 30°) ──────────────────────────────────────
const COS = Math.cos(Math.PI / 6); // 0.866
const SIN = Math.sin(Math.PI / 6); // 0.5
const S = 70; // unit scale
const CX = 285; // viewBox centre x (tuned so the house fits 600×600)
const CY = 300;

type P3 = readonly [number, number, number]; // [x, y(height), z]
function iso(x: number, y: number, z: number): [number, number] {
  return [(x - z) * COS * S + CX, (x + z) * SIN * S - y * S + CY];
}
const pt = (p: P3) => iso(p[0], p[1], p[2]);
const poly = (pts: P3[]) =>
  "M " +
  pts.map((p) => pt(p).map((n) => n.toFixed(1)).join(" ")).join(" L ") +
  " Z";
const line = (a: P3, b: P3) => {
  const [ax, ay] = pt(a);
  const [bx, by] = pt(b);
  return `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)}`;
};

// ── the house (3D unit coordinates) ──────────────────────────────────────
const W = 3.4; // width  (x)
const H = 2.3; // height (y)
const D = 2.9; // depth  (z)

// footprint (ground, y=0) + the two visible walls + the flat roof
const FOOTPRINT = poly([
  [0, 0, 0],
  [W, 0, 0],
  [W, 0, D],
  [0, 0, D],
]);
const WALL_RIGHT = poly([
  [W, 0, 0],
  [W, 0, D],
  [W, H, D],
  [W, H, 0],
]);
const WALL_FRONT = poly([
  [0, 0, D],
  [W, 0, D],
  [W, H, D],
  [0, H, D],
]);
const ROOF = poly([
  [-0.12, H, -0.12],
  [W + 0.12, H, -0.12],
  [W + 0.12, H, D + 0.12],
  [-0.12, H, D + 0.12],
]);
// prominent corner edges
const EDGES: string[] = [
  line([W, 0, 0], [W, H, 0]), // right-back vertical
  line([W, 0, D], [W, H, D]), // near corner (the hero edge)
  line([0, 0, D], [0, H, D]), // left vertical
  line([W, H, 0], [W, H, D]), // roof eave right
  line([0, H, D], [W, H, D]), // roof eave front
];

// front-wall glazing (z = D) + door
type Rect = { x: number; y: number; w: number; h: number };
const FRONT_WINDOWS: Rect[] = [
  { x: 0.35, y: 1.3, w: 0.62, h: 0.62 }, // upper row
  { x: 1.39, y: 1.3, w: 0.62, h: 0.62 },
  { x: 2.43, y: 1.3, w: 0.62, h: 0.62 },
  { x: 0.35, y: 0.42, w: 0.62, h: 0.62 }, // lower flanks
  { x: 2.43, y: 0.42, w: 0.62, h: 0.62 },
];
const DOOR: Rect = { x: 1.45, y: 0, w: 0.5, h: 1.18 };
const frontQuad = (r: Rect) =>
  poly([
    [r.x, r.y, D],
    [r.x + r.w, r.y, D],
    [r.x + r.w, r.y + r.h, D],
    [r.x, r.y + r.h, D],
  ]);

// right-wall glazing (x = W), varying in depth z
const RIGHT_WINDOWS: Rect[] = [
  { x: 0.45, y: 0.55, w: 0.78, h: 0.55 }, // x=z-start, w=depth
  { x: 1.66, y: 0.55, w: 0.78, h: 0.55 },
  { x: 0.45, y: 1.35, w: 0.78, h: 0.55 },
  { x: 1.66, y: 1.35, w: 0.78, h: 0.55 },
];
const rightQuad = (r: Rect) =>
  poly([
    [W, r.y, r.x],
    [W, r.y, r.x + r.w],
    [W, r.y + r.h, r.x + r.w],
    [W, r.y + r.h, r.x],
  ]);

// dimension lines (computed off real corners)
const [nearBx, nearBy] = iso(W, 0, D); // near corner foot
const [nearTx, nearTy] = iso(W, H, D); // near corner top
const [flx, fly] = iso(0, 0, D); // front-left foot

const palette = {
  line: "rgba(140,200,255,0.92)",
  lineSoft: "rgba(140,200,255,0.5)",
  grid: "rgba(120,180,255,0.10)",
  teal: "#00d4c8",
  tealLight: "#7ef5ed",
};

export function BlueprintBuild() {
  const reduce = useReducedMotion();

  // gentle pointer-driven parallax tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(my, { stiffness: 80, damping: 18, mass: 0.6 });
  const rotateY = useSpring(mx, { stiffness: 80, damping: 18, mass: 0.6 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    if (reduce) return;
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    mx.set(nx * 6);
    my.set(ny * -5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  // animation prop helpers — collapse to final state under reduced-motion
  const draw = (delay: number, duration = 0.85) =>
    reduce
      ? { initial: { pathLength: 1, opacity: 1 } }
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: {
            delay,
            duration,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          },
        };
  const fade = (delay: number, to = 1, duration = 0.9) =>
    reduce
      ? { initial: { opacity: to } }
      : {
          initial: { opacity: 0 },
          animate: { opacity: to },
          transition: {
            delay,
            duration,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          },
        };

  const T = {
    paper: 0.15,
    title: 0.4,
    foot: 0.7,
    walls: 1.05,
    roof: 1.7,
    win: 2.05,
    door: 2.45,
    dims: 2.7,
    build: 3.0,
  };

  return (
    <div
      ref={wrapRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative mx-auto [--bp:300px] sm:[--bp:380px] lg:[--bp:480px]"
      style={{ width: "var(--bp)", height: "var(--bp)" }}
    >
      {/* ambient halo */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-12 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.20) 0%, rgba(26,95,212,0.10) 34%, transparent 66%)",
        }}
      />
      {/* breathing bloom behind the build */}
      {!reduce ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "70%",
            height: "70%",
            background:
              "radial-gradient(circle, rgba(0,212,200,0.18), transparent 68%)",
            filter: "blur(8px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.6, 0.9] }}
          transition={{
            opacity: {
              delay: T.build,
              duration: 7,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
          }}
        />
      ) : null}

      <motion.div
        className="absolute inset-0"
        style={{ rotateX, rotateY, transformPerspective: 1100 }}
      >
        <svg viewBox="0 0 600 600" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="bp-glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,212,200,0.16)" />
              <stop offset="100%" stopColor="rgba(26,95,212,0.10)" />
            </linearGradient>
            <linearGradient id="bp-roof" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(18,40,64,0.55)" />
              <stop offset="100%" stopColor="rgba(8,20,36,0.65)" />
            </linearGradient>
            <radialGradient id="bp-win" cx="0.5" cy="0.4" r="0.75">
              <stop offset="0%" stopColor="rgba(168,250,240,0.95)" />
              <stop offset="55%" stopColor="rgba(0,212,200,0.55)" />
              <stop offset="100%" stopColor="rgba(0,212,200,0.12)" />
            </radialGradient>
            <filter id="bp-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── drawing sheet: faint blueprint grid ── */}
          <motion.g {...fade(T.paper, 1, 0.7)}>
            {Array.from({ length: 13 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={48 + i * 42}
                y1={40}
                x2={48 + i * 42}
                y2={560}
                stroke={palette.grid}
                strokeWidth={1}
              />
            ))}
            {Array.from({ length: 13 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1={40}
                y1={40 + i * 42}
                x2={560}
                y2={40 + i * 42}
                stroke={palette.grid}
                strokeWidth={1}
              />
            ))}
          </motion.g>

          {/* ── ground shadow (build) ── */}
          <motion.path
            d={FOOTPRINT}
            fill="rgba(0,0,0,0.45)"
            style={{ filter: "blur(10px)" }}
            {...fade(T.build, 1, 1)}
          />

          {/* ── roof + wall glass fills (build) ── */}
          <motion.path d={ROOF} fill="url(#bp-roof)" {...fade(T.build, 1)} />
          <motion.path
            d={WALL_FRONT}
            fill="url(#bp-glass)"
            {...fade(T.build, 1)}
          />
          <motion.path
            d={WALL_RIGHT}
            fill="url(#bp-glass)"
            {...fade(T.build + 0.1, 0.8)}
          />

          {/* ── lit windows (build) ── */}
          {FRONT_WINDOWS.map((r, i) => (
            <motion.path
              key={`fwl${i}`}
              d={frontQuad(r)}
              fill="url(#bp-win)"
              filter="url(#bp-glow)"
              {...fade(T.build + 0.25 + i * 0.06, 0.9)}
            />
          ))}
          {RIGHT_WINDOWS.map((r, i) => (
            <motion.path
              key={`rwl${i}`}
              d={rightQuad(r)}
              fill="url(#bp-win)"
              filter="url(#bp-glow)"
              {...fade(T.build + 0.3 + i * 0.06, 0.9, 0.85)}
            />
          ))}
          <motion.path
            d={frontQuad(DOOR)}
            fill="rgba(0,212,200,0.10)"
            {...fade(T.build + 0.2, 1)}
          />

          {/* ── structure: self-drawing blueprint lines ── */}
          <g
            stroke={palette.line}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#bp-glow)"
          >
            <motion.path
              d={FOOTPRINT}
              stroke={palette.lineSoft}
              {...draw(T.foot, 0.8)}
            />
            <motion.path d={WALL_RIGHT} {...draw(T.walls, 0.9)} />
            <motion.path d={WALL_FRONT} {...draw(T.walls + 0.15, 0.9)} />
            {EDGES.map((d, i) => (
              <motion.path key={`e${i}`} d={d} {...draw(T.walls + 0.3 + i * 0.05, 0.5)} />
            ))}
            <motion.path d={ROOF} {...draw(T.roof, 0.8)} />
            {FRONT_WINDOWS.map((r, i) => (
              <motion.path
                key={`fw${i}`}
                d={frontQuad(r)}
                strokeWidth={1.2}
                {...draw(T.win + i * 0.05, 0.5)}
              />
            ))}
            {RIGHT_WINDOWS.map((r, i) => (
              <motion.path
                key={`rw${i}`}
                d={rightQuad(r)}
                strokeWidth={1.2}
                {...draw(T.win + 0.1 + i * 0.05, 0.5)}
              />
            ))}
            <motion.path d={frontQuad(DOOR)} strokeWidth={1.3} {...draw(T.door, 0.5)} />
          </g>

          {/* ── dimension lines + annotations (build-ish) ── */}
          <motion.g
            stroke={palette.tealLight}
            strokeWidth={1}
            {...fade(T.dims, 0.85, 0.7)}
          >
            {/* width dim — under the front-left base edge */}
            <line x1={flx} y1={fly + 30} x2={nearBx} y2={nearBy + 30} />
            <line x1={flx} y1={fly + 24} x2={flx} y2={fly + 36} />
            <line x1={nearBx} y1={nearBy + 24} x2={nearBx} y2={nearBy + 36} />
            {/* height dim — beside the near corner */}
            <line x1={nearBx + 32} y1={nearBy} x2={nearTx + 32} y2={nearTy} />
            <line x1={nearBx + 26} y1={nearBy} x2={nearBx + 38} y2={nearBy} />
            <line x1={nearTx + 26} y1={nearTy} x2={nearTx + 38} y2={nearTy} />
          </motion.g>
          <motion.g {...fade(T.dims + 0.1, 1, 0.7)}>
            <text
              x={(flx + nearBx) / 2 - 8}
              y={(fly + nearBy) / 2 + 52}
              fill={palette.tealLight}
              fontSize={13}
              fontFamily="var(--font-mono), monospace"
              textAnchor="middle"
            >
              12.4 m
            </text>
            <text
              x={nearBx + 46}
              y={(nearBy + nearTy) / 2 + 4}
              fill={palette.tealLight}
              fontSize={13}
              fontFamily="var(--font-mono), monospace"
            >
              6.5 m
            </text>
          </motion.g>

          {/* ── north arrow ── */}
          <motion.g {...fade(T.title, 1, 0.7)}>
            <circle
              cx={70}
              cy={78}
              r={16}
              stroke={palette.lineSoft}
              strokeWidth={1.2}
            />
            <path
              d="M70 66 L74 82 L70 78 L66 82 Z"
              fill={palette.tealLight}
              stroke="none"
            />
            <text
              x={70}
              y={104}
              fill={palette.lineSoft}
              fontSize={10}
              fontFamily="var(--font-mono), monospace"
              textAnchor="middle"
              letterSpacing={1}
            >
              N
            </text>
          </motion.g>

          {/* ── title block ── */}
          <motion.g {...fade(T.title, 1, 0.7)}>
            <rect
              x={350}
              y={540}
              width={210}
              height={42}
              rx={3}
              stroke={palette.grid}
              strokeWidth={1}
            />
            <line x1={350} y1={561} x2={560} y2={561} stroke={palette.grid} />
            <line x1={455} y1={561} x2={455} y2={582} stroke={palette.grid} />
            <text
              x={360}
              y={555}
              fill={palette.tealLight}
              fontSize={10}
              fontFamily="var(--font-mono), monospace"
              letterSpacing={2}
            >
              BUILDERHQ · RESIDENTIAL
            </text>
            <text
              x={360}
              y={575}
              fill={palette.lineSoft}
              fontSize={9}
              fontFamily="var(--font-mono), monospace"
              letterSpacing={1}
            >
              SCALE 1:100
            </text>
            <text
              x={465}
              y={575}
              fill={palette.lineSoft}
              fontSize={9}
              fontFamily="var(--font-mono), monospace"
              letterSpacing={1}
            >
              SHEET A-01
            </text>
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
}
