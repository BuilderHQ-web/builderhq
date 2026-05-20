"use client";

/**
 * BuildingReveal — Cinematic 3D-printed dual-occupancy townhouse.
 *
 * A 20-second loop in four acts. Every frame is pure SVG with CSS
 * keyframes driving the animation — no Motion path interpolation,
 * no JS in the rendering path, no WebGL bundle. The browser does
 * the work, so the scene cannot land in an opacity-0 trap on any
 * production build.
 *
 *   Act 1 · Blueprint   ( 0.0s –  4.5s )
 *       A top-down architectural floor plan draws itself. Outer
 *       walls, party wall, interior partitions, dimension lines
 *       with end-caps, room labels. Looks like a real drafting
 *       deliverable, not a cartoon.
 *
 *   Act 2 · Lift         ( 4.5s –  6.0s )
 *       Plan fades out as the isometric foundation slab fades in.
 *       The view rises from floorplan to 30° axonometric.
 *
 *   Act 3 · Construct    ( 6.0s – 13.0s )
 *       Walls extrude floor by floor with a glowing scan-line moving
 *       up each band as it "prints." Three bands: ground floor →
 *       first floor → parapet. Each band's outline draws, then its
 *       fill reveals from bottom-up via clip-path.
 *
 *   Act 4 · Illuminate   (13.0s – 16.0s )
 *       Windows light up with warm interior glow. Landscape (trees,
 *       planter strips) fades in. A project metadata pill labels
 *       the build "DUAL OCCUPANCY · BLACK ROCK VIC."
 *
 *   Act 5 · Dissolve     (16.0s – 19.5s )
 *       Building dematerialises into ~160 particles that drift down
 *       and fade out. Top of the building dissolves first, sweeping
 *       downward. Particles vanish into the floor shadow.
 *
 *   Act 6 · Reset        (19.5s – 20.0s )
 *       Everything's off, scene snaps to phase 1.
 *
 * Sized through `--cube-size` so the hero layout is interchangeable
 * with the other compositions.
 */

// ── Isometric projection ──────────────────────────────────────────
// Standard 30° axonometric, viewer in upper-front-right. World
// axes: +X = right (into picture-plane right), +Y = back (into
// picture-plane left), +Z = up. Each world unit projects to one of:
//   +X →  (cos30,  -sin30) * SCALE
//   +Y →  (-cos30, -sin30) * SCALE
//   +Z →  (0, -1) * SCALE
const COS30 = Math.sqrt(3) / 2;
const SIN30 = 0.5;
const SCALE = 24;
const OX = 200;
const OY = 290;

type Pt = { x: number; y: number };

function iso(x: number, y: number, z: number): Pt {
  return {
    x: OX + (x - y) * COS30 * SCALE,
    y: OY - (x + y) * SIN30 * SCALE - z * SCALE,
  };
}

// Top-down floor plan projection (Act 1). Centred in the viewBox,
// world +Y goes DOWN on screen (architectural convention: the front
// of the house is at the top of the plan).
const PLAN_SCALE = 26;
const PLAN_OX = 200;
const PLAN_OY = 200;

function plan(wx: number, wy: number): Pt {
  return {
    x: PLAN_OX + (wx - W / 2) * PLAN_SCALE,
    y: PLAN_OY + (wy - D / 2) * PLAN_SCALE,
  };
}

// ── Building world dimensions ─────────────────────────────────────
const W = 5.4;
const D = 3.2;
const H_GF = 1.45;
const H_F1 = 1.35;
const H_PARAPET = 0.18;
const H_TOTAL = H_GF + H_F1 + H_PARAPET; // 2.98

// Dual occupancy split — narrow visible gap at the party wall.
const GAP = 0.12;
const UA_R = (W - GAP) / 2; // 2.64
const UB_L = UA_R + GAP; // 2.76

// ── Pre-computed corners ──────────────────────────────────────────
const FP = {
  FL: iso(0, 0, 0),
  FR: iso(W, 0, 0),
  BR: iso(W, D, 0),
  BL: iso(0, D, 0),
};
const GF = {
  FL: iso(0, 0, H_GF),
  FR: iso(W, 0, H_GF),
  BR: iso(W, D, H_GF),
  BL: iso(0, D, H_GF),
};
const F1 = {
  FL: iso(0, 0, H_GF + H_F1),
  FR: iso(W, 0, H_GF + H_F1),
  BR: iso(W, D, H_GF + H_F1),
  BL: iso(0, D, H_GF + H_F1),
};
const PT = {
  FL: iso(0, 0, H_TOTAL),
  FR: iso(W, 0, H_TOTAL),
  BR: iso(W, D, H_TOTAL),
  BL: iso(0, D, H_TOTAL),
};

// Party-wall visible edge on the front face — the seam between
// Unit A and Unit B that defines the dual occupancy silhouette.
const PWA = {
  bottom: iso(UA_R, 0, 0),
  gf: iso(UA_R, 0, H_GF),
  f1: iso(UA_R, 0, H_GF + H_F1),
  top: iso(UA_R, 0, H_TOTAL),
};
const PWB = {
  bottom: iso(UB_L, 0, 0),
  gf: iso(UB_L, 0, H_GF),
  f1: iso(UB_L, 0, H_GF + H_F1),
  top: iso(UB_L, 0, H_TOTAL),
};

// ── Front-face apertures (windows, doors, garage) ─────────────────
type Aperture = {
  x: number;
  z: number;
  w: number;
  h: number;
  kind: "window" | "door" | "garage";
};

const FRONT_APERTURES: Aperture[] = [
  // Unit A — ground floor
  { x: 0.18, z: 0.08, w: 1.30, h: 1.15, kind: "garage" },
  { x: 1.65, z: 0.08, w: 0.50, h: 1.25, kind: "door" },
  // Unit A — first floor (2 picture windows + 1 small bath)
  { x: 0.20, z: H_GF + 0.18, w: 1.05, h: 1.00, kind: "window" },
  { x: 1.40, z: H_GF + 0.18, w: 1.05, h: 1.00, kind: "window" },
  // Unit B mirrored (offset by UB_L)
  { x: UB_L + 0.18, z: 0.08, w: 1.30, h: 1.15, kind: "garage" },
  { x: UB_L + 1.65, z: 0.08, w: 0.50, h: 1.25, kind: "door" },
  { x: UB_L + 0.20, z: H_GF + 0.18, w: 1.05, h: 1.00, kind: "window" },
  { x: UB_L + 1.40, z: H_GF + 0.18, w: 1.05, h: 1.00, kind: "window" },
];

// ── Right-face apertures ──────────────────────────────────────────
type RAperture = { y: number; z: number; w: number; h: number };

const RIGHT_APERTURES: RAperture[] = [
  { y: 0.55, z: 0.55, w: 0.55, h: 0.50 }, // GF utility
  { y: 1.85, z: 0.40, w: 0.65, h: 0.65 }, // GF bath
  { y: 0.55, z: H_GF + 0.45, w: 0.55, h: 0.55 }, // F1
  { y: 1.85, z: H_GF + 0.40, w: 0.65, h: 0.70 }, // F1
];

// ── Helpers ───────────────────────────────────────────────────────
function fmt(p: Pt) {
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}

function quad(p1: Pt, p2: Pt, p3: Pt, p4: Pt) {
  return `M ${fmt(p1)} L ${fmt(p2)} L ${fmt(p3)} L ${fmt(p4)} Z`;
}

function frontAperturePath(a: Aperture) {
  const bl = iso(a.x, 0, a.z);
  const br = iso(a.x + a.w, 0, a.z);
  const tr = iso(a.x + a.w, 0, a.z + a.h);
  const tl = iso(a.x, 0, a.z + a.h);
  return quad(bl, br, tr, tl);
}

function rightAperturePath(a: RAperture) {
  const bl = iso(W, a.y, a.z);
  const br = iso(W, a.y + a.w, a.z);
  const tr = iso(W, a.y + a.w, a.z + a.h);
  const tl = iso(W, a.y, a.z + a.h);
  return quad(bl, br, tr, tl);
}

// ── Particle field for dissolution ────────────────────────────────
// Deterministic pseudo-random so the field doesn't shimmer between
// renders. Particles are distributed across the front, right, and
// top faces of the building, biased so the dissolution sweeps from
// top to bottom: a particle's animation delay is proportional to its
// inverse Z height.
type Particle = {
  x: number;
  y: number;
  delay: number;
  drift: number;
  size: number;
};

const PARTICLES: Particle[] = (() => {
  let seed = 17;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const out: Particle[] = [];
  // Front face — most visible, densest sampling.
  for (let i = 0; i < 95; i++) {
    const wx = rand() * W;
    const wz = rand() * H_TOTAL;
    const s = iso(wx, 0, wz);
    out.push({
      x: s.x,
      y: s.y,
      delay: (1 - wz / H_TOTAL) * 1.4 + rand() * 0.25,
      drift: (rand() - 0.5) * 60,
      size: 1.1 + rand() * 1.1,
    });
  }
  // Right face.
  for (let i = 0; i < 55; i++) {
    const wy = rand() * D;
    const wz = rand() * H_TOTAL;
    const s = iso(W, wy, wz);
    out.push({
      x: s.x,
      y: s.y,
      delay: (1 - wz / H_TOTAL) * 1.4 + rand() * 0.25,
      drift: (rand() - 0.5) * 60,
      size: 1.1 + rand() * 1.1,
    });
  }
  // Top face — these dissolve first because they have the highest Z.
  for (let i = 0; i < 35; i++) {
    const wx = rand() * W;
    const wy = rand() * D;
    const s = iso(wx, wy, H_TOTAL);
    out.push({
      x: s.x,
      y: s.y,
      delay: rand() * 0.2,
      drift: (rand() - 0.5) * 80,
      size: 1.2 + rand() * 1.2,
    });
  }
  return out;
})();

// ── Component ─────────────────────────────────────────────────────

export function BuildingReveal() {
  return (
    <div
      className="building-reveal relative mx-auto [--cube-size:280px] sm:[--cube-size:340px] lg:[--cube-size:460px]"
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
            "radial-gradient(circle, rgba(0,212,200,0.22) 0%, rgba(0,212,200,0.06) 32%, transparent 65%)",
        }}
      />

      <PhaseIndicator />

      <svg
        viewBox="0 0 400 360"
        className="relative block w-full h-full bhq-float"
        fill="none"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Wall surfaces — slight gradient top→bottom to suggest
              ambient occlusion. */}
          <linearGradient id="bhq-wallFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(14,38,56,0.96)" />
            <stop offset="1" stopColor="rgba(4,14,24,0.99)" />
          </linearGradient>
          <linearGradient id="bhq-wallRight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(8,24,38,0.97)" />
            <stop offset="1" stopColor="rgba(3,10,18,0.99)" />
          </linearGradient>
          {/* Roof slab — darker than walls. */}
          <linearGradient id="bhq-roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(18,46,66,0.98)" />
            <stop offset="1" stopColor="rgba(8,28,44,0.99)" />
          </linearGradient>
          {/* Parapet edge accent. */}
          <linearGradient id="bhq-parapet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(22,58,82,0.98)" />
            <stop offset="1" stopColor="rgba(10,34,52,0.99)" />
          </linearGradient>
          {/* Floor shadow. */}
          <radialGradient id="bhq-shadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(0,0,0,0.7)" />
            <stop offset="0.4" stopColor="rgba(0,0,0,0.25)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          {/* Glass — cool steel-blue. */}
          <linearGradient id="bhq-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(60,120,160,0.45)" />
            <stop offset="1" stopColor="rgba(20,50,80,0.65)" />
          </linearGradient>
          {/* Warm interior light — the "lit" state of each window. */}
          <linearGradient id="bhq-lit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,228,170,1)" />
            <stop offset="1" stopColor="rgba(255,178,90,0.92)" />
          </linearGradient>
          {/* Garage door — slatted dark plate. */}
          <linearGradient id="bhq-garage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(28,38,52,0.95)" />
            <stop offset="1" stopColor="rgba(14,22,34,0.99)" />
          </linearGradient>
          {/* Entrance door — wood-warm dark. */}
          <linearGradient id="bhq-door" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(78,52,32,0.95)" />
            <stop offset="1" stopColor="rgba(48,30,20,0.99)" />
          </linearGradient>
          {/* The scan-line gradient used during construction — a
              bright teal band that fades both sides. */}
          <linearGradient id="bhq-scan" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(126,245,237,0)" />
            <stop offset="0.5" stopColor="rgba(126,245,237,1)" />
            <stop offset="1" stopColor="rgba(126,245,237,0)" />
          </linearGradient>
          {/* Slatted pattern for garage doors. */}
          <pattern
            id="bhq-slats"
            patternUnits="userSpaceOnUse"
            width={6}
            height={6}
            patternTransform="rotate(-30)"
          >
            <line x1="0" y1="0" x2="6" y2="0" stroke="rgba(126,245,237,0.10)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Floor shadow — sits beneath the whole building. */}
        <ellipse
          cx={200}
          cy={295}
          rx={145}
          ry={16}
          fill="url(#bhq-shadow)"
          opacity={0.6}
          className="bhq-floor-shadow"
        />

        {/* Isometric ground grid — fades in/out per phase. */}
        <GroundGrid />

        {/* ── Act 1 — Top-down blueprint plan ───────────────────── */}
        <g className="bhq-blueprint">
          <BlueprintTopDown />
        </g>

        {/* ── Acts 2–4 — Isometric building ─────────────────────── */}
        <g className="bhq-iso">
          {/* Foundation slab beneath the building footprint. */}
          <Foundation />

          {/* Holographic blueprint scaffolding behind the building. */}
          <HoloScaffolding />

          {/* Walls — 3 bands per side (ground, first, parapet). Each
              band has its own clip-path animation to "rise" from the
              foundation up. */}
          <Walls />

          {/* Top slab — visible above the parapet. */}
          <RoofSlab />

          {/* Party wall seam — vertical accent down the building front. */}
          <PartyWallSeam />

          {/* Corner accent edges — vertical lines where walls meet,
              "catches the light." */}
          <CornerEdges />

          {/* Apertures: garage, door, windows. Always rendered but
              glass darker by default; warm light layered on top
              fades in during Act 4. */}
          <Apertures />

          {/* Landscape — small planters with foliage in front of the
              building. */}
          <Landscape />

          {/* Project metadata label — appears during the Complete
              beat to anchor the scene to BuilderHQ's product. */}
          <ProjectLabel />
        </g>

        {/* ── Act 5 — Dissolution particles ────────────────────── */}
        <g className="bhq-particles">
          {PARTICLES.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.size}
              fill="rgba(126,245,237,1)"
              className="bhq-particle"
              style={
                {
                  "--bhq-delay": `${p.delay.toFixed(2)}s`,
                  "--bhq-drift": `${p.drift.toFixed(0)}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

// ── Phase indicator ───────────────────────────────────────────────

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
        <span className="relative min-w-[6.5rem] h-3 text-[9.5px] tracking-[0.18em] uppercase text-text-muted font-semibold">
          <span className="absolute inset-0 whitespace-nowrap bhq-phase bhq-phase-1">
            01 · Drafting
          </span>
          <span className="absolute inset-0 whitespace-nowrap bhq-phase bhq-phase-2">
            02 · Building
          </span>
          <span className="absolute inset-0 whitespace-nowrap bhq-phase bhq-phase-3">
            03 · Lights on
          </span>
          <span className="absolute inset-0 whitespace-nowrap bhq-phase bhq-phase-4">
            04 · Looping
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Top-down blueprint plan (Act 1) ───────────────────────────────

/**
 * Draws a believable architectural floor plan of the two units. Each
 * line is its own animated `<line>` or `<path>` with a staggered
 * `stroke-dashoffset` so the plan plots itself the way drafting
 * software lays down geometry — one line at a time.
 */
function BlueprintTopDown() {
  // Outer envelope corners (clockwise from top-left)
  const tl = plan(0, 0);
  const tr = plan(W, 0);
  const br = plan(W, D);
  const bl = plan(0, D);
  // Party wall — vertical line down the middle.
  const partyTop = plan(UA_R + GAP / 2, 0);
  const partyBot = plan(UA_R + GAP / 2, D);

  // Interior partition: per unit, two horizontal lines splitting it
  // into front-zone (garage+entry), mid-zone (kitchen+living), back-
  // zone (bedrooms+bath).
  const interiorA1L = plan(0, D * 0.36);
  const interiorA1R = plan(UA_R, D * 0.36);
  const interiorA2L = plan(0, D * 0.66);
  const interiorA2R = plan(UA_R, D * 0.66);
  const interiorB1L = plan(UB_L, D * 0.36);
  const interiorB1R = plan(W, D * 0.36);
  const interiorB2L = plan(UB_L, D * 0.66);
  const interiorB2R = plan(W, D * 0.66);

  // Door openings — drawn as short perpendicular arcs (just visual
  // notation, the wall continues on either side).
  const doorPositions = [
    { x: 0.5, y: 0 },          // unit A entry on front (door swings in)
    { x: UB_L + 0.5, y: 0 },   // unit B entry
    { x: UA_R / 2, y: D * 0.36 }, // unit A interior
    { x: UB_L + UA_R / 2, y: D * 0.36 }, // unit B interior
  ];

  // Dimension callouts on the south (top) edge — overall width.
  const dimTopLeft = plan(0, -0.45);
  const dimTopRight = plan(W, -0.45);
  // West (left) edge — overall depth.
  const dimLeftTop = plan(-0.45, 0);
  const dimLeftBot = plan(-0.45, D);

  const lines: Array<{
    d: string;
    delay: number;
    width?: number;
    color?: string;
  }> = [
    // Outer walls — heavy stroke, drawn first.
    { d: `M ${fmt(tl)} L ${fmt(tr)}`, delay: 0.2, width: 2.2 },
    { d: `M ${fmt(tr)} L ${fmt(br)}`, delay: 0.4, width: 2.2 },
    { d: `M ${fmt(br)} L ${fmt(bl)}`, delay: 0.6, width: 2.2 },
    { d: `M ${fmt(bl)} L ${fmt(tl)}`, delay: 0.8, width: 2.2 },
    // Party wall.
    { d: `M ${fmt(partyTop)} L ${fmt(partyBot)}`, delay: 1.1, width: 1.8 },
    // Interior partitions, unit A.
    { d: `M ${fmt(interiorA1L)} L ${fmt(interiorA1R)}`, delay: 1.4, width: 1.2 },
    { d: `M ${fmt(interiorA2L)} L ${fmt(interiorA2R)}`, delay: 1.55, width: 1.2 },
    // Interior partitions, unit B.
    { d: `M ${fmt(interiorB1L)} L ${fmt(interiorB1R)}`, delay: 1.7, width: 1.2 },
    { d: `M ${fmt(interiorB2L)} L ${fmt(interiorB2R)}`, delay: 1.85, width: 1.2 },
  ];

  return (
    <g>
      {/* Animated lines — each path uses pathLength=100 so CSS pixel
          units on stroke-dasharray / stroke-dashoffset still cover the
          full intrinsic path length. */}
      {lines.map((l, i) => (
        <path
          key={i}
          d={l.d}
          stroke={l.color ?? "rgba(126,245,237,0.85)"}
          strokeWidth={l.width ?? 1.4}
          strokeLinecap="round"
          fill="none"
          pathLength={100}
          strokeDasharray={100}
          className="bhq-plan-line"
          style={{ animationDelay: `${l.delay.toFixed(2)}s` }}
        />
      ))}

      {/* Door swings — small arcs at door positions to mark openings */}
      {doorPositions.map((d, i) => {
        const pos = plan(d.x, d.y);
        return (
          <path
            key={`door-${i}`}
            d={`M ${pos.x - 8},${pos.y} A 8 8 0 0 1 ${pos.x},${pos.y + 8}`}
            stroke="rgba(126,245,237,0.55)"
            strokeWidth="0.8"
            fill="none"
            pathLength={100}
            strokeDasharray={100}
            className="bhq-plan-line"
            style={{ animationDelay: `${(2.1 + i * 0.08).toFixed(2)}s` }}
          />
        );
      })}

      {/* Dimension callouts */}
      <PlanDim
        from={dimTopLeft}
        to={dimTopRight}
        text="12 m"
        delay={2.5}
        side="top"
      />
      <PlanDim
        from={dimLeftTop}
        to={dimLeftBot}
        text="8 m"
        delay={2.7}
        side="left"
      />

      {/* Room labels — placed in the centroid of each zone. Front
          zone (y < D*0.36) holds garage + entry; mid zone holds the
          kitchen; back zone holds the living room. Both units mirror
          the same layout. */}
      <PlanLabel x={UA_R * 0.34} y={D * 0.18} text="GARAGE" delay={2.95} />
      <PlanLabel x={UA_R * 0.80} y={D * 0.18} text="ENTRY" delay={3.0} />
      <PlanLabel x={UA_R * 0.5} y={D * 0.50} text="KITCHEN" delay={3.05} />
      <PlanLabel x={UA_R * 0.5} y={D * 0.83} text="LIVING" delay={3.1} />

      <PlanLabel x={UB_L + UA_R * 0.34} y={D * 0.18} text="GARAGE" delay={3.0} />
      <PlanLabel x={UB_L + UA_R * 0.80} y={D * 0.18} text="ENTRY" delay={3.05} />
      <PlanLabel x={UB_L + UA_R * 0.5} y={D * 0.50} text="KITCHEN" delay={3.1} />
      <PlanLabel x={UB_L + UA_R * 0.5} y={D * 0.83} text="LIVING" delay={3.15} />

      {/* Title block under the plan */}
      <g
        className="bhq-plan-title"
        style={{ animationDelay: "3.3s" }}
      >
        <text
          x={200}
          y={plan(0, D).y + 30}
          fill="rgba(126,245,237,0.85)"
          fontSize="9"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          textAnchor="middle"
          letterSpacing="0.24em"
          style={{ textTransform: "uppercase" }}
        >
          Dual Occupancy
        </text>
        <text
          x={200}
          y={plan(0, D).y + 44}
          fill="rgba(238,246,255,0.55)"
          fontSize="7.5"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          textAnchor="middle"
          letterSpacing="0.16em"
        >
          Black Rock · VIC · Scale 1:100
        </text>
      </g>
    </g>
  );
}

function PlanLabel({
  x,
  y,
  text,
  delay,
}: {
  x: number;
  y: number;
  text: string;
  delay: number;
}) {
  const p = plan(x, y);
  return (
    <text
      x={p.x}
      y={p.y}
      fill="rgba(126,245,237,0.7)"
      fontSize="6"
      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      textAnchor="middle"
      letterSpacing="0.16em"
      style={{ textTransform: "uppercase", animationDelay: `${delay.toFixed(2)}s` }}
      className="bhq-plan-label"
    >
      {text}
    </text>
  );
}

function PlanDim({
  from,
  to,
  text,
  delay,
  side,
}: {
  from: Pt;
  to: Pt;
  text: string;
  delay: number;
  side: "top" | "left";
}) {
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2;
  const tickH = 4;
  return (
    <g
      className="bhq-plan-dim"
      style={{ animationDelay: `${delay.toFixed(2)}s` }}
    >
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="rgba(126,245,237,0.55)"
        strokeWidth="0.7"
      />
      {/* End-cap ticks */}
      {side === "top" ? (
        <>
          <line
            x1={from.x}
            y1={from.y - tickH}
            x2={from.x}
            y2={from.y + tickH}
            stroke="rgba(126,245,237,0.7)"
            strokeWidth="0.9"
          />
          <line
            x1={to.x}
            y1={to.y - tickH}
            x2={to.x}
            y2={to.y + tickH}
            stroke="rgba(126,245,237,0.7)"
            strokeWidth="0.9"
          />
        </>
      ) : (
        <>
          <line
            x1={from.x - tickH}
            y1={from.y}
            x2={from.x + tickH}
            y2={from.y}
            stroke="rgba(126,245,237,0.7)"
            strokeWidth="0.9"
          />
          <line
            x1={to.x - tickH}
            y1={to.y}
            x2={to.x + tickH}
            y2={to.y}
            stroke="rgba(126,245,237,0.7)"
            strokeWidth="0.9"
          />
        </>
      )}
      <rect
        x={cx - 14}
        y={cy - 6}
        width={28}
        height={12}
        fill="rgba(3,9,15,0.92)"
        stroke="rgba(126,245,237,0.25)"
        strokeWidth="0.4"
        rx="1.5"
      />
      <text
        x={cx}
        y={cy + 0.5}
        fill="rgba(126,245,237,0.9)"
        fontSize="7.5"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing="0.08em"
      >
        {text}
      </text>
    </g>
  );
}

// ── Isometric foundation slab ─────────────────────────────────────

function Foundation() {
  const center = { x: W / 2, y: D / 2 };
  const scale = 1.16;
  const expand = (px: number, py: number): Pt =>
    iso(
      center.x + (px - center.x) * scale,
      center.y + (py - center.y) * scale,
      0,
    );

  const e_fl = expand(0, 0);
  const e_fr = expand(W, 0);
  const e_br = expand(W, D);
  const e_bl = expand(0, D);

  return (
    <g className="bhq-foundation">
      <path
        d={quad(e_fl, e_fr, e_br, e_bl)}
        fill="rgba(0,212,200,0.04)"
        stroke="rgba(126,245,237,0.22)"
        strokeWidth="0.6"
        strokeDasharray="3 5"
      />
    </g>
  );
}

// ── Walls (3 bands, line-by-line) ─────────────────────────────────

function Walls() {
  // Three bands per side. Each band rises from bottom up via
  // clip-path inset animation. The accompanying scan line element
  // moves up across the same band during the same window.
  const bands = [
    {
      front: quad(FP.FL, FP.FR, GF.FR, GF.FL),
      right: quad(FP.FR, FP.BR, GF.BR, GF.FR),
      cls: "bhq-band-1",
    },
    {
      front: quad(GF.FL, GF.FR, F1.FR, F1.FL),
      right: quad(GF.FR, GF.BR, F1.BR, F1.FR),
      cls: "bhq-band-2",
    },
    {
      front: quad(F1.FL, F1.FR, PT.FR, PT.FL),
      right: quad(F1.FR, F1.BR, PT.BR, PT.FR),
      cls: "bhq-band-3",
    },
  ];

  return (
    <g className="bhq-walls">
      {bands.map((b, i) => (
        <g key={i} className={`bhq-band ${b.cls}`}>
          {/* Right face (drawn first so front overlaps it). */}
          <path
            d={b.right}
            fill="url(#bhq-wallRight)"
            stroke="rgba(126,245,237,0.55)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Front face. */}
          <path
            d={b.front}
            fill={i === 2 ? "url(#bhq-parapet)" : "url(#bhq-wallFront)"}
            stroke="rgba(126,245,237,0.7)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* Scan-line bars — one per band. Sits as a horizontal beam
          that moves up the band as the wall reveals. */}
      <g className="bhq-scan-band-1">
        <rect
          x={FP.FL.x - 10}
          y={0}
          width={FP.FR.x - FP.FL.x + 40}
          height={6}
          fill="url(#bhq-scan)"
          opacity={0.9}
        />
      </g>
      <g className="bhq-scan-band-2">
        <rect
          x={FP.FL.x - 10}
          y={0}
          width={FP.FR.x - FP.FL.x + 40}
          height={6}
          fill="url(#bhq-scan)"
          opacity={0.9}
        />
      </g>
      <g className="bhq-scan-band-3">
        <rect
          x={FP.FL.x - 10}
          y={0}
          width={FP.FR.x - FP.FL.x + 40}
          height={6}
          fill="url(#bhq-scan)"
          opacity={0.9}
        />
      </g>
    </g>
  );
}

function RoofSlab() {
  return (
    <g className="bhq-roof">
      <path
        d={quad(PT.FL, PT.FR, PT.BR, PT.BL)}
        fill="url(#bhq-roof)"
        stroke="rgba(126,245,237,0.55)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Hairline accent on the front roof edge — catches "light." */}
      <line
        x1={PT.FL.x}
        y1={PT.FL.y}
        x2={PT.FR.x}
        y2={PT.FR.y}
        stroke="rgba(126,245,237,0.85)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </g>
  );
}

function PartyWallSeam() {
  // Vertical seam down the front face dividing Unit A and Unit B.
  return (
    <g className="bhq-party">
      <line
        x1={PWA.bottom.x}
        y1={PWA.bottom.y}
        x2={PWA.top.x}
        y2={PWA.top.y}
        stroke="rgba(126,245,237,0.45)"
        strokeWidth="0.8"
      />
      <line
        x1={PWB.bottom.x}
        y1={PWB.bottom.y}
        x2={PWB.top.x}
        y2={PWB.top.y}
        stroke="rgba(126,245,237,0.45)"
        strokeWidth="0.8"
      />
    </g>
  );
}

function CornerEdges() {
  // Vertical accent edges where walls meet — these define the
  // building's silhouette under any lighting.
  const edges = [
    { from: FP.FL, to: PT.FL },
    { from: FP.FR, to: PT.FR },
    { from: FP.BR, to: PT.BR },
  ];
  return (
    <g className="bhq-corners">
      {edges.map((e, i) => (
        <line
          key={i}
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

// ── Apertures — windows, doors, garage ────────────────────────────

function Apertures() {
  return (
    <g className="bhq-apertures">
      {/* Front-face apertures */}
      {FRONT_APERTURES.map((a, i) => {
        const d = frontAperturePath(a);
        if (a.kind === "garage") {
          return (
            <g key={`f-${i}`}>
              <path d={d} fill="url(#bhq-garage)" stroke="rgba(126,245,237,0.45)" strokeWidth="0.8" />
              <path d={d} fill="url(#bhq-slats)" />
              {/* Garage handle accent */}
              <circle
                cx={iso(a.x + a.w / 2, 0, a.z + 0.45).x}
                cy={iso(a.x + a.w / 2, 0, a.z + 0.45).y}
                r="0.8"
                fill="rgba(126,245,237,0.4)"
              />
            </g>
          );
        }
        if (a.kind === "door") {
          // Door panel + small warm light strip above
          const handleP = iso(a.x + a.w * 0.78, 0, a.z + 0.45);
          return (
            <g key={`f-${i}`}>
              <path d={d} fill="url(#bhq-door)" stroke="rgba(126,245,237,0.5)" strokeWidth="0.8" />
              {/* Door handle */}
              <circle cx={handleP.x} cy={handleP.y} r="0.9" fill="rgba(126,245,237,0.7)" />
              {/* Sidelight above door — pulses warm */}
              <path
                d={quad(
                  iso(a.x, 0, a.z + a.h),
                  iso(a.x + a.w, 0, a.z + a.h),
                  iso(a.x + a.w, 0, a.z + a.h + 0.18),
                  iso(a.x, 0, a.z + a.h + 0.18),
                )}
                fill="url(#bhq-lit)"
                className="bhq-window-lit"
                style={{ animationDelay: `${(0.1 + i * 0.05).toFixed(2)}s` }}
              />
            </g>
          );
        }
        // window
        return (
          <g key={`f-${i}`}>
            {/* Always-visible cool glass. */}
            <path d={d} fill="url(#bhq-glass)" stroke="rgba(126,245,237,0.55)" strokeWidth="0.8" />
            {/* Warm light overlay — only opaque during Act 4. */}
            <path
              d={d}
              fill="url(#bhq-lit)"
              className="bhq-window-lit"
              style={{ animationDelay: `${(0.0 + i * 0.08).toFixed(2)}s` }}
            />
            {/* Window mullion — vertical bar centre. */}
            <line
              x1={iso(a.x + a.w / 2, 0, a.z).x}
              y1={iso(a.x + a.w / 2, 0, a.z).y}
              x2={iso(a.x + a.w / 2, 0, a.z + a.h).x}
              y2={iso(a.x + a.w / 2, 0, a.z + a.h).y}
              stroke="rgba(126,245,237,0.4)"
              strokeWidth="0.5"
            />
            {/* Top hairline. */}
            <line
              x1={iso(a.x, 0, a.z + a.h).x}
              y1={iso(a.x, 0, a.z + a.h).y}
              x2={iso(a.x + a.w, 0, a.z + a.h).x}
              y2={iso(a.x + a.w, 0, a.z + a.h).y}
              stroke="rgba(126,245,237,0.55)"
              strokeWidth="0.5"
            />
          </g>
        );
      })}

      {/* Right-face windows */}
      {RIGHT_APERTURES.map((a, i) => {
        const d = rightAperturePath(a);
        return (
          <g key={`r-${i}`}>
            <path d={d} fill="url(#bhq-glass)" stroke="rgba(126,245,237,0.45)" strokeWidth="0.6" />
            <path
              d={d}
              fill="url(#bhq-lit)"
              className="bhq-window-lit"
              style={{ animationDelay: `${(0.3 + i * 0.06).toFixed(2)}s` }}
            />
          </g>
        );
      })}
    </g>
  );
}

// ── Landscape (planters, foliage) ─────────────────────────────────

function Landscape() {
  // Small planter boxes in front of each unit, with foliage blobs.
  const trees: Array<{ x: number; y: number; size: number }> = [
    { x: -0.35, y: -0.45, size: 0.5 },
    { x: 1.10, y: -0.5, size: 0.42 },
    { x: 2.45, y: -0.4, size: 0.45 },
    { x: UB_L + 1.10, y: -0.5, size: 0.42 },
    { x: UB_L + 2.45, y: -0.4, size: 0.45 },
    { x: W + 0.35, y: 0.0, size: 0.5 },
  ];

  return (
    <g className="bhq-landscape">
      {trees.map((t, i) => {
        const base = iso(t.x, t.y, 0);
        const trunkTop = iso(t.x, t.y, t.size * 0.6);
        const foliageCenter = iso(t.x, t.y, t.size * 0.95);
        const fr = t.size * 8; // foliage radius in screen px
        return (
          <g
            key={i}
            className="bhq-tree"
            style={{ animationDelay: `${(13.0 + i * 0.1).toFixed(2)}s` }}
          >
            {/* Trunk */}
            <line
              x1={base.x}
              y1={base.y}
              x2={trunkTop.x}
              y2={trunkTop.y}
              stroke="rgba(120,90,60,0.8)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Foliage — soft ellipse with stippled accent */}
            <ellipse
              cx={foliageCenter.x}
              cy={foliageCenter.y}
              rx={fr}
              ry={fr * 0.85}
              fill="rgba(40,80,60,0.85)"
              stroke="rgba(126,245,237,0.35)"
              strokeWidth="0.5"
            />
            <ellipse
              cx={foliageCenter.x - fr * 0.2}
              cy={foliageCenter.y - fr * 0.2}
              rx={fr * 0.45}
              ry={fr * 0.35}
              fill="rgba(70,130,100,0.7)"
            />
          </g>
        );
      })}
    </g>
  );
}

// ── Holographic scaffolding ───────────────────────────────────────

/**
 * Faint blueprint-glow lines extending upward from the building's
 * silhouette during the Construct + Illuminate beats. Sells the
 * "blueprint-meets-built" identity from the reference image — the
 * building is real but still carries its drafting aura.
 */
function HoloScaffolding() {
  // Extend vertical "rays" upward from the parapet corners.
  const rays = [
    { from: PT.FL, height: 90 },
    { from: PT.FR, height: 70 },
    { from: PT.BR, height: 80 },
  ];
  return (
    <g className="bhq-holo">
      {rays.map((r, i) => (
        <line
          key={i}
          x1={r.from.x}
          y1={r.from.y}
          x2={r.from.x}
          y2={r.from.y - r.height}
          stroke="rgba(126,245,237,0.35)"
          strokeWidth="0.5"
          strokeDasharray="2 3"
          strokeLinecap="round"
        />
      ))}
      {/* A floating reference plane (faint quad above the building). */}
      <path
        d={quad(
          { x: PT.FL.x, y: PT.FL.y - 56 },
          { x: PT.FR.x, y: PT.FR.y - 56 },
          { x: PT.BR.x, y: PT.BR.y - 56 },
          { x: PT.BL.x, y: PT.BL.y - 56 },
        )}
        fill="none"
        stroke="rgba(126,245,237,0.18)"
        strokeWidth="0.5"
        strokeDasharray="2 3"
      />
    </g>
  );
}

// ── Project label — bottom-right title block on the iso building ──

function ProjectLabel() {
  return (
    <g
      className="bhq-label"
      style={{ animationDelay: "13.6s" }}
    >
      <rect
        x={252}
        y={304}
        width={130}
        height={42}
        rx={2}
        fill="rgba(6,18,30,0.88)"
        stroke="rgba(126,245,237,0.28)"
        strokeWidth="0.6"
      />
      <line
        x1={256}
        y1={309}
        x2={378}
        y2={309}
        stroke="rgba(126,245,237,0.55)"
        strokeWidth="0.45"
      />
      <text
        x={258}
        y={320}
        fill="rgba(126,245,237,0.9)"
        fontSize="8"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.18em"
        style={{ textTransform: "uppercase" }}
      >
        Dual Occupancy
      </text>
      <text
        x={258}
        y={331}
        fill="rgba(238,246,255,0.65)"
        fontSize="6.8"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.10em"
      >
        Black Rock · VIC
      </text>
      <text
        x={258}
        y={341}
        fill="rgba(126,245,237,0.6)"
        fontSize="6.2"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.10em"
      >
        Budget $3M+ · 0–3 mo
      </text>
      <text
        x={378}
        y={341}
        fill="rgba(126,245,237,0.85)"
        fontSize="6.2"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.18em"
        textAnchor="end"
        style={{ textTransform: "uppercase" }}
      >
        Verified
      </text>
    </g>
  );
}

// ── Ground grid ───────────────────────────────────────────────────

function GroundGrid() {
  const lines: React.ReactElement[] = [];
  const gridSize = 9;
  const step = 24;
  for (let i = -gridSize; i <= gridSize; i++) {
    const x1 = 200 - 120 + i * (step * 0.866);
    const y1 = 200 + 90 + i * (step * 0.5);
    const x2 = x1 + 240 * 0.866;
    const y2 = y1 - 240 * 0.5;
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
    const x1 = 200 + 120 + i * (-step * 0.866);
    const y1 = 200 + 90 + i * (step * 0.5);
    const x2 = x1 - 240 * 0.866;
    const y2 = y1 - 240 * 0.5;
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

// ── Styles ────────────────────────────────────────────────────────

/**
 * Master 20-second timeline. All keyframes computed as percentages
 * of LOOP for readability. Phase markers:
 *
 *   PLAN    0.00s ─  4.50s   ( 0% – 22.5%)
 *   LIFT    4.50s ─  6.00s   (22.5% – 30%)
 *   BUILD   6.00s ─ 13.00s   (30% – 65%)
 *     band 1 (ground floor):   6.0s –  8.2s
 *     band 2 (first floor):    8.0s – 10.4s
 *     band 3 (parapet):       10.2s – 12.0s
 *   LIGHTS 13.00s ─ 15.50s   (65% – 77.5%)
 *   HOLD   15.50s ─ 16.50s   (77.5% – 82.5%)
 *   DISSOLVE 16.50s ─ 19.50s (82.5% – 97.5%)
 *   RESET 19.50s ─ 20.00s    (97.5% – 100%)
 */
function BuildingRevealStyles() {
  return (
    <style>{`
      .building-reveal .bhq-float {
        animation: bhq-float 8s ease-in-out infinite;
        transform-origin: 50% 70%;
      }
      @keyframes bhq-float {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-4px); }
      }

      /* Floor shadow — present always but stronger when illuminated. */
      .building-reveal .bhq-floor-shadow {
        animation: bhq-shadow 20s ease-in-out infinite;
      }
      @keyframes bhq-shadow {
        0%, 100%  { opacity: 0; }
        28%       { opacity: 0.3; }
        65%, 82%  { opacity: 0.6; }
        92%       { opacity: 0; }
      }

      /* Ground grid */
      .building-reveal .bhq-grid {
        opacity: 0;
        animation: bhq-grid 20s ease-in-out infinite;
      }
      @keyframes bhq-grid {
        0%, 100% { opacity: 0; }
        4%       { opacity: 0.45; }
        82%      { opacity: 0.45; }
        92%      { opacity: 0; }
      }

      /* ── Act 1 — Blueprint plan ─────────────────────────────── */
      /* Each line draws via stroke-dashoffset. pathLength=100 on the
         path makes a CSS value of 100 mean "fully hidden" (offset by
         the entire conceptual path length), 0 means "fully drawn." */
      .building-reveal .bhq-plan-line {
        stroke-dashoffset: 100;
        opacity: 0;
        animation: bhq-plan-line 20s ease-in-out infinite;
      }
      @keyframes bhq-plan-line {
        0%       { stroke-dashoffset: 100; opacity: 0; }
        2%       { opacity: 1; }
        14%      { stroke-dashoffset: 0; opacity: 1; }
        24%      { stroke-dashoffset: 0; opacity: 1; }
        28%      { stroke-dashoffset: 0; opacity: 0; }
        100%     { stroke-dashoffset: 100; opacity: 0; }
      }

      .building-reveal .bhq-plan-label {
        opacity: 0;
        animation: bhq-plan-fade 20s ease-in-out infinite;
      }
      .building-reveal .bhq-plan-dim,
      .building-reveal .bhq-plan-title {
        opacity: 0;
        animation: bhq-plan-fade 20s ease-in-out infinite;
      }
      @keyframes bhq-plan-fade {
        0%       { opacity: 0; }
        15%      { opacity: 1; }
        24%      { opacity: 1; }
        28%      { opacity: 0; }
        100%     { opacity: 0; }
      }

      /* ── Acts 2–4 — Isometric building ──────────────────────── */
      .building-reveal .bhq-iso {
        opacity: 0;
        transform: translateY(8px) scale(0.96);
        transform-origin: 50% 80%;
        animation: bhq-iso 20s ease-in-out infinite;
      }
      @keyframes bhq-iso {
        0%, 22%  { opacity: 0; transform: translateY(8px) scale(0.96); }
        30%      { opacity: 1; transform: translateY(0) scale(1); }
        82%      { opacity: 1; transform: translateY(0) scale(1); }
        96%      { opacity: 0; transform: translateY(0) scale(1); }
        100%     { opacity: 0; transform: translateY(8px) scale(0.96); }
      }

      /* Foundation slab — fades in at lift. */
      .building-reveal .bhq-foundation {
        opacity: 0;
        animation: bhq-foundation 20s ease-in-out infinite;
      }
      @keyframes bhq-foundation {
        0%, 22%  { opacity: 0; }
        30%      { opacity: 1; }
        96%      { opacity: 1; }
        100%     { opacity: 0; }
      }

      /* Hologram scaffolding — appears with the construction beats. */
      .building-reveal .bhq-holo {
        opacity: 0;
        animation: bhq-holo 20s ease-in-out infinite;
      }
      @keyframes bhq-holo {
        0%, 28%  { opacity: 0; }
        34%      { opacity: 1; }
        80%      { opacity: 1; }
        86%      { opacity: 0; }
        100%     { opacity: 0; }
      }

      /* ── Walls — each band rises from foundation up ──────────── */
      /* Each .bhq-band is invisible (clipped) until its window, then
         the clip-path inset animates from 100% (fully clipped from
         the top, so nothing visible) to 0% (fully visible). This
         feels like the wall rising from the floor up. */

      /* Band 1 — ground floor (6.0s → 8.2s = 30% → 41%) */
      .building-reveal .bhq-band-1 {
        clip-path: inset(100% 0% 0% 0%);
        animation: bhq-band-1 20s ease-out infinite;
      }
      @keyframes bhq-band-1 {
        0%, 30%  { clip-path: inset(100% 0% 0% 0%); }
        41%      { clip-path: inset(0% 0% 0% 0%); }
        82%      { clip-path: inset(0% 0% 0% 0%); }
        96%      { clip-path: inset(0% 0% 0% 0%); opacity: 0.4; }
        100%     { clip-path: inset(0% 0% 0% 0%); opacity: 0; }
      }

      /* Band 2 — first floor (8.0s → 10.4s = 40% → 52%) */
      .building-reveal .bhq-band-2 {
        clip-path: inset(100% 0% 0% 0%);
        animation: bhq-band-2 20s ease-out infinite;
      }
      @keyframes bhq-band-2 {
        0%, 40%  { clip-path: inset(100% 0% 0% 0%); }
        52%      { clip-path: inset(0% 0% 0% 0%); }
        82%      { clip-path: inset(0% 0% 0% 0%); }
        96%      { clip-path: inset(0% 0% 0% 0%); opacity: 0.4; }
        100%     { clip-path: inset(0% 0% 0% 0%); opacity: 0; }
      }

      /* Band 3 — parapet (10.2s → 12.0s = 51% → 60%) */
      .building-reveal .bhq-band-3 {
        clip-path: inset(100% 0% 0% 0%);
        animation: bhq-band-3 20s ease-out infinite;
      }
      @keyframes bhq-band-3 {
        0%, 51%  { clip-path: inset(100% 0% 0% 0%); }
        60%      { clip-path: inset(0% 0% 0% 0%); }
        82%      { clip-path: inset(0% 0% 0% 0%); }
        96%      { clip-path: inset(0% 0% 0% 0%); opacity: 0.4; }
        100%     { clip-path: inset(0% 0% 0% 0%); opacity: 0; }
      }

      /* Roof slab — drops in once band 3 settles. */
      .building-reveal .bhq-roof {
        opacity: 0;
        animation: bhq-roof 20s ease-out infinite;
      }
      @keyframes bhq-roof {
        0%, 58%  { opacity: 0; transform: translateY(-12px); }
        65%      { opacity: 1; transform: translateY(0); }
        82%      { opacity: 1; transform: translateY(0); }
        96%      { opacity: 0; transform: translateY(0); }
        100%     { opacity: 0; transform: translateY(-12px); }
      }

      /* Party wall seam — appears with the walls. */
      .building-reveal .bhq-party {
        opacity: 0;
        animation: bhq-party 20s ease-out infinite;
      }
      @keyframes bhq-party {
        0%, 35%  { opacity: 0; }
        45%      { opacity: 1; }
        82%      { opacity: 1; }
        96%      { opacity: 0; }
        100%     { opacity: 0; }
      }

      /* Corner accent edges — pop in at top of construction. */
      .building-reveal .bhq-corners {
        opacity: 0;
        animation: bhq-corners 20s ease-out infinite;
      }
      @keyframes bhq-corners {
        0%, 55%  { opacity: 0; }
        62%      { opacity: 1; }
        82%      { opacity: 1; }
        96%      { opacity: 0; }
        100%     { opacity: 0; }
      }

      /* Scan-line bars — travel up each band during its rise. The
         translate keeps the bar inside the iso group's local space
         so it rides up the building's front face. */

      .building-reveal .bhq-scan-band-1 {
        opacity: 0;
        animation: bhq-scan-band-1 20s linear infinite;
      }
      @keyframes bhq-scan-band-1 {
        0%, 30%  { opacity: 0; transform: translateY(0); }
        31%      { opacity: 1; transform: translateY(0); }
        41%      { opacity: 1; transform: translateY(-70px); }
        43%      { opacity: 0; transform: translateY(-70px); }
        100%     { opacity: 0; transform: translateY(0); }
      }

      .building-reveal .bhq-scan-band-2 {
        opacity: 0;
        animation: bhq-scan-band-2 20s linear infinite;
      }
      @keyframes bhq-scan-band-2 {
        0%, 40%  { opacity: 0; transform: translateY(-70px); }
        41%      { opacity: 1; transform: translateY(-70px); }
        52%      { opacity: 1; transform: translateY(-130px); }
        54%      { opacity: 0; transform: translateY(-130px); }
        100%     { opacity: 0; transform: translateY(-70px); }
      }

      .building-reveal .bhq-scan-band-3 {
        opacity: 0;
        animation: bhq-scan-band-3 20s linear infinite;
      }
      @keyframes bhq-scan-band-3 {
        0%, 51%  { opacity: 0; transform: translateY(-130px); }
        52%      { opacity: 1; transform: translateY(-130px); }
        60%      { opacity: 1; transform: translateY(-150px); }
        62%      { opacity: 0; transform: translateY(-150px); }
        100%     { opacity: 0; transform: translateY(-130px); }
      }

      /* ── Apertures — windows / doors / garage ────────────────── */
      .building-reveal .bhq-apertures {
        opacity: 0;
        animation: bhq-apertures 20s ease-out infinite;
      }
      @keyframes bhq-apertures {
        0%, 60%  { opacity: 0; }
        65%      { opacity: 1; }
        82%      { opacity: 1; }
        96%      { opacity: 0; }
        100%     { opacity: 0; }
      }

      /* Warm interior light — pulses gently during the Lights-on
         beat. Sits as an opacity overlay on top of cool glass. */
      .building-reveal .bhq-window-lit {
        opacity: 0;
        animation: bhq-window-lit 20s ease-in-out infinite;
      }
      @keyframes bhq-window-lit {
        0%, 65%  { opacity: 0; }
        68%      { opacity: 1; }
        72%      { opacity: 0.65; }
        76%      { opacity: 1; }
        80%      { opacity: 0.78; }
        84%      { opacity: 1; }
        92%      { opacity: 0.6; }
        96%      { opacity: 0; }
        100%     { opacity: 0; }
      }

      /* Landscape — fades in just before lights so the scene reads
         as a complete vignette by the time windows are warm. */
      .building-reveal .bhq-landscape {
        opacity: 0;
        animation: bhq-landscape 20s ease-out infinite;
      }
      @keyframes bhq-landscape {
        0%, 62%  { opacity: 0; transform: translateY(6px); }
        70%      { opacity: 1; transform: translateY(0); }
        82%      { opacity: 1; transform: translateY(0); }
        96%      { opacity: 0; transform: translateY(0); }
        100%     { opacity: 0; transform: translateY(6px); }
      }

      /* Title block on the iso scene */
      .building-reveal .bhq-label {
        opacity: 0;
        animation: bhq-label 20s ease-out infinite;
      }
      @keyframes bhq-label {
        0%, 68%  { opacity: 0; }
        74%      { opacity: 1; }
        82%      { opacity: 1; }
        96%      { opacity: 0; }
        100%     { opacity: 0; }
      }

      /* ── Act 5 — Dissolution ─────────────────────────────────── */
      /* Each particle: invisible most of the loop, then briefly visible
         around its individual delay window inside the dissolve beat,
         drifting downward + outward as it fades. */
      .building-reveal .bhq-particle {
        opacity: 0;
        transform: translate(0, 0);
        animation: bhq-particle 20s linear infinite;
        animation-delay: var(--bhq-delay, 0s);
      }
      @keyframes bhq-particle {
        /* The active window for particle dissolution sits at the end
           of the loop. animation-delay shifts the whole cycle, so each
           particle effectively fires its dissolution at a slightly
           different time relative to the master timeline. */
        0%, 80%  { opacity: 0; transform: translate(0, 0); }
        82%      { opacity: 1; transform: translate(0, 0); }
        86%      { opacity: 1; transform: translate(calc(var(--bhq-drift) * 0.3), 14px); }
        95%      { opacity: 0; transform: translate(var(--bhq-drift), 64px); }
        100%     { opacity: 0; transform: translate(0, 0); }
      }

      /* Building dissolves — opacity sweep top-to-bottom of the iso
         group. Combined with particles, gives the "dematerialising
         from the top" feel. */
      .building-reveal .bhq-iso .bhq-walls,
      .building-reveal .bhq-iso .bhq-roof,
      .building-reveal .bhq-iso .bhq-apertures,
      .building-reveal .bhq-iso .bhq-party,
      .building-reveal .bhq-iso .bhq-corners {
        /* dissolve already covered by each component's own animation;
           this rule is intentionally empty as a placeholder for any
           future shared dissolve behaviour. */
      }

      /* Phase chip — each label has its own keyframes so visibility
         matches the master timeline directly.
            01 Drafting   0%  – 24%   (0.0s – 4.8s)
            02 Building   28% – 60%   (5.6s – 12.0s)
            03 Lights on  62% – 82%   (12.4s – 16.4s)
            04 Looping    84% – 100%  (16.8s – 20s) */
      .building-reveal .bhq-phase { opacity: 0; }
      .building-reveal .bhq-phase-1 { animation: bhq-phase-1 20s ease-in-out infinite; }
      .building-reveal .bhq-phase-2 { animation: bhq-phase-2 20s ease-in-out infinite; }
      .building-reveal .bhq-phase-3 { animation: bhq-phase-3 20s ease-in-out infinite; }
      .building-reveal .bhq-phase-4 { animation: bhq-phase-4 20s ease-in-out infinite; }
      @keyframes bhq-phase-1 {
        0%   { opacity: 0; }
        2%   { opacity: 1; }
        22%  { opacity: 1; }
        24%  { opacity: 0; }
        100% { opacity: 0; }
      }
      @keyframes bhq-phase-2 {
        0%, 26%  { opacity: 0; }
        28%      { opacity: 1; }
        58%      { opacity: 1; }
        60%      { opacity: 0; }
        100%     { opacity: 0; }
      }
      @keyframes bhq-phase-3 {
        0%, 60%  { opacity: 0; }
        62%      { opacity: 1; }
        80%      { opacity: 1; }
        82%      { opacity: 0; }
        100%     { opacity: 0; }
      }
      @keyframes bhq-phase-4 {
        0%, 82%  { opacity: 0; }
        84%      { opacity: 1; }
        99%      { opacity: 1; }
        100%     { opacity: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .building-reveal .bhq-float,
        .building-reveal .bhq-floor-shadow,
        .building-reveal .bhq-grid,
        .building-reveal .bhq-plan-line,
        .building-reveal .bhq-plan-label,
        .building-reveal .bhq-plan-dim,
        .building-reveal .bhq-plan-title,
        .building-reveal .bhq-iso,
        .building-reveal .bhq-foundation,
        .building-reveal .bhq-holo,
        .building-reveal .bhq-band,
        .building-reveal .bhq-roof,
        .building-reveal .bhq-party,
        .building-reveal .bhq-corners,
        .building-reveal .bhq-apertures,
        .building-reveal .bhq-window-lit,
        .building-reveal .bhq-landscape,
        .building-reveal .bhq-label,
        .building-reveal .bhq-particle,
        .building-reveal .bhq-phase {
          animation: none;
        }
        .building-reveal .bhq-iso { opacity: 1; transform: none; }
        .building-reveal .bhq-band { clip-path: none; opacity: 1; }
        .building-reveal .bhq-roof,
        .building-reveal .bhq-foundation,
        .building-reveal .bhq-party,
        .building-reveal .bhq-corners,
        .building-reveal .bhq-apertures,
        .building-reveal .bhq-window-lit,
        .building-reveal .bhq-landscape,
        .building-reveal .bhq-label,
        .building-reveal .bhq-holo,
        .building-reveal .bhq-grid,
        .building-reveal .bhq-floor-shadow { opacity: 1; transform: none; }
        .building-reveal .bhq-phase-3 { opacity: 1; }
      }
    `}</style>
  );
}
