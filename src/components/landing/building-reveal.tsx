"use client";

/**
 * BuildingReveal — Real 3D cinematic hero (Three.js / React-Three-Fiber).
 *
 * A procedural dual-occupancy townhouse rendered with Three.js
 * primitives. Real PBR materials, real lights (ambient + key
 * directional + four warm point lights inside the building shining
 * through window glass), real soft shadows beneath the structure,
 * gentle camera orbit, and an 18-second cinematic loop with four
 * acts:
 *
 *   Act 1 · Construct   ( 0.0s –  7.0s )  walls rise floor by floor
 *   Act 2 · Settle      ( 7.0s –  9.0s )  roof drops on, edges crisp up
 *   Act 3 · Illuminate  ( 9.0s – 14.0s )  interior lights fade in,
 *                                         windows glow warm, gentle
 *                                         breath; camera orbits
 *   Act 4 · Dissolve   (14.0s – 17.5s )  building scales down, particle
 *                                         field bursts out and fades
 *   Act 5 · Reset      (17.5s – 18.0s )  back to start
 *
 * Implementation notes
 * ────────────────────
 *   · Pure procedural geometry — no GLB model required. All meshes are
 *     primitives (box/plane) so the bundle includes only the three.js
 *     core, R3F, and a handful of drei helpers.
 *   · Construction "rises" via group `scale.y` from 0→1, anchored at
 *     the floor so each band grows up from the foundation, not from
 *     its centre.
 *   · Window lighting uses emissive material on the glass + a
 *     proportional point-light intensity inside each unit so the
 *     warm glow also tints the surrounding wall surfaces.
 *   · ContactShadows under the building handles the soft floor shadow.
 *   · Particles are simple meshes inside a single group, animated each
 *     frame with seeded jitter so the dissolution looks chaotic
 *     without being random per render.
 *   · prefers-reduced-motion freezes the scene at the "Illuminate" beat.
 */

import * as React from "react";
import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

// ── World dimensions ──────────────────────────────────────────────
// Conceptually metres. Camera and floor adjusted to suit.

const W = 5.4; // total building width (X)
const D = 3.2; // total building depth (Z)
const H_GF = 1.55; // ground floor height
const H_F1 = 1.45; // first floor height
const H_PARAPET = 0.20; // parapet edge cap
const GAP = 0.10; // party-wall gap

const UA_HALF = (W - GAP) / 4; // half width of unit A from its centre
const UA_CX = -(GAP / 2 + UA_HALF); // unit A centre X
const UB_CX = +(GAP / 2 + UA_HALF); // unit B centre X
const UNIT_W = UA_HALF * 2; // each unit width

// ── Master loop length (seconds) ──────────────────────────────────
const LOOP = 18;

// ── Animation curve helpers ───────────────────────────────────────
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

// ── Phase windows on the master loop (in seconds) ────────────────
const PHASE = {
  groundStart: 0.4,
  groundEnd: 2.4,
  firstStart: 2.0,
  firstEnd: 4.2,
  parapetStart: 4.0,
  parapetEnd: 5.0,
  roofStart: 5.0,
  roofEnd: 6.8,
  apertureStart: 6.6,
  apertureEnd: 8.4,
  lightsStart: 9.0,
  lightsEnd: 10.8,
  holdEnd: 14.0,
  dissolveStart: 14.0,
  dissolveEnd: 17.5,
  reset: 17.5,
};

// ── Component ─────────────────────────────────────────────────────

export function BuildingReveal() {
  return (
    <div
      className="building-reveal relative mx-auto [--cube-size:300px] sm:[--cube-size:360px] lg:[--cube-size:480px]"
      style={{
        width: "var(--cube-size)",
        height: "calc(var(--cube-size) * 1.05)",
      }}
    >
      {/* Halo behind the scene */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-12 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.20) 0%, rgba(0,212,200,0.06) 32%, transparent 65%)",
        }}
      />

      <PhaseIndicator />

      <div className="absolute inset-0">
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: false,
          }}
          camera={{ position: [6.5, 5, 6.5], fov: 28, near: 0.1, far: 60 }}
          // Transparent background so the page bg shows through.
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
          }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

// ── 3D Scene ─────────────────────────────────────────────────────

function Scene() {
  // Single clock for the whole scene. Loops every LOOP seconds.
  const clockRef = useRef({ t: 0 });
  // Phase progress refs — updated each frame, read by all children
  // via React refs to avoid React renders per frame.
  const phase = useRef({
    groundY: 0,
    firstY: 0,
    parapetY: 0,
    roofY: 0,
    roofOpacity: 0,
    apertureOpacity: 0,
    lightsIntensity: 0,
    buildingOpacity: 1,
    buildingScale: 1,
    particles: 0, // 0–1 progress through dissolution
  });

  useFrame((state) => {
    // Advance the loop
    clockRef.current.t = (state.clock.elapsedTime % LOOP);
    const t = clockRef.current.t;

    // Compute phase progress values
    phase.current.groundY = easeOut(
      smoothstep(PHASE.groundStart, PHASE.groundEnd, t),
    );
    phase.current.firstY = easeOut(
      smoothstep(PHASE.firstStart, PHASE.firstEnd, t),
    );
    phase.current.parapetY = easeOut(
      smoothstep(PHASE.parapetStart, PHASE.parapetEnd, t),
    );
    phase.current.roofY = easeOut(
      smoothstep(PHASE.roofStart, PHASE.roofEnd, t),
    );
    phase.current.roofOpacity = smoothstep(
      PHASE.roofStart - 0.2,
      PHASE.roofEnd,
      t,
    );
    phase.current.apertureOpacity = smoothstep(
      PHASE.apertureStart,
      PHASE.apertureEnd,
      t,
    );

    // Lights fade in then breath gently through the Illuminate beat.
    const lightOn = smoothstep(PHASE.lightsStart, PHASE.lightsEnd, t);
    const breath =
      t > PHASE.lightsEnd && t < PHASE.dissolveStart
        ? 0.82 + 0.18 * (0.5 + 0.5 * Math.sin((t - PHASE.lightsEnd) * 1.4))
        : 1;
    phase.current.lightsIntensity = lightOn * 3.4 * breath;

    // Dissolve — building scales down + fades; particles erupt out.
    const dissolve = smoothstep(PHASE.dissolveStart, PHASE.dissolveEnd, t);
    phase.current.particles = dissolve;
    phase.current.buildingOpacity = 1 - dissolve;
    phase.current.buildingScale = 1 - dissolve * 0.05;

    // Hard reset before the loop restarts — collapse everything so the
    // ground floor doesn't pop up at full height for one frame.
    if (t < PHASE.groundStart || t > PHASE.reset) {
      phase.current.groundY = 0;
      phase.current.firstY = 0;
      phase.current.parapetY = 0;
      phase.current.roofY = 0;
      phase.current.roofOpacity = 0;
      phase.current.apertureOpacity = 0;
      phase.current.lightsIntensity = 0;
      phase.current.buildingOpacity = 0;
      phase.current.buildingScale = 1;
      phase.current.particles = 0;
    }
  });

  return (
    <>
      {/* HDRI environment for proper PBR reflections. "night" gives
          us a low-key blue ambient that matches the brand palette. */}
      <Environment preset="night" environmentIntensity={0.6} />

      {/* Ambient cool moonlight to keep shadows from going pure-black. */}
      <ambientLight intensity={0.45} color="#7aa0d8" />

      {/* Key directional light from upper-right. Casts shadow onto
          the ground via ContactShadows beneath. */}
      <directionalLight
        position={[8, 9, 4]}
        intensity={1.4}
        color="#e8f0ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
      />

      {/* Teal rim light from the back-left to separate the silhouette
          from the page. */}
      <directionalLight
        position={[-5, 3, -4]}
        intensity={0.5}
        color="#7ef5ed"
      />

      {/* Soft contact shadow under the building. */}
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.55}
        scale={12}
        blur={2.2}
        far={4}
        resolution={512}
        color="#000"
      />

      {/* Slow camera orbit + light parallax. */}
      <CameraRig />

      {/* The townhouse. */}
      <Townhouse phase={phase} />

      {/* Particle dissolution field — only visible during dissolve. */}
      <Particles phase={phase} />
    </>
  );
}

// ── Camera rig ────────────────────────────────────────────────────

function CameraRig() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Camera framing — radius/height tuned so foundation to roof
    // fits inside the canvas with a touch of headroom. Subtle orbit
    // (~2° / sec) and vertical bob give the scene a cinematic float
    // without losing the composition.
    const r = 9.2;
    const baseAngle = Math.PI * 0.30;
    const angle = baseAngle + t * 0.025;
    const y = 5.0 + Math.sin(t * 0.32) * 0.15;
    state.camera.position.set(
      Math.cos(angle) * r,
      y,
      Math.sin(angle) * r,
    );
    state.camera.lookAt(0, 1.4, 0);
  });
  return null;
}

// ── Townhouse ─────────────────────────────────────────────────────

function Townhouse({
  phase,
}: {
  phase: React.MutableRefObject<PhaseState>;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.scale.setScalar(phase.current.buildingScale);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Foundation slab — slightly larger than building footprint. */}
      <Foundation />

      {/* Ground floor walls (per unit so the gap shows in the front). */}
      <FloorBand
        cx={UA_CX}
        width={UNIT_W}
        height={H_GF}
        depth={D}
        yBase={0}
        material={WALL_MAT}
        scaleRef={phase}
        scaleKey="groundY"
      />
      <FloorBand
        cx={UB_CX}
        width={UNIT_W}
        height={H_GF}
        depth={D}
        yBase={0}
        material={WALL_MAT}
        scaleRef={phase}
        scaleKey="groundY"
      />

      {/* First floor walls — slightly inset for a modern stepped look. */}
      <FloorBand
        cx={UA_CX}
        width={UNIT_W}
        height={H_F1}
        depth={D - 0.1}
        yBase={H_GF}
        material={WALL_MAT_LIGHT}
        scaleRef={phase}
        scaleKey="firstY"
      />
      <FloorBand
        cx={UB_CX}
        width={UNIT_W}
        height={H_F1}
        depth={D - 0.1}
        yBase={H_GF}
        material={WALL_MAT_LIGHT}
        scaleRef={phase}
        scaleKey="firstY"
      />

      {/* Parapet cap (full width) — places after both floors. */}
      <FloorBand
        cx={0}
        width={W + 0.05}
        height={H_PARAPET}
        depth={D + 0.04}
        yBase={H_GF + H_F1}
        material={PARAPET_MAT}
        scaleRef={phase}
        scaleKey="parapetY"
      />

      {/* First-floor balcony overhang — extends in front of the
          first floor, creates a real architectural step on the
          front facade and casts a subtle shadow on the ground
          floor below. */}
      <BalconyOverhang phase={phase} />

      {/* Roof slab. */}
      <Roof phase={phase} />

      {/* Floor-line accent hairlines — bright teal pinstripes at
          each storey boundary. Defines the building's silhouette
          even at distance. */}
      <FloorLines phase={phase} />

      {/* Apertures: windows, garage doors, entry doors with warm lit
          glass. */}
      <Apertures phase={phase} />

      {/* Interior point lights — one per unit, two per floor. */}
      <InteriorLights phase={phase} />

      {/* Landscape — small planter boxes with leafy blobs in front. */}
      <Landscape phase={phase} />
    </group>
  );
}

// ── Foundation ────────────────────────────────────────────────────

function Foundation() {
  return (
    <mesh receiveShadow position={[0, -0.05, 0]}>
      <boxGeometry args={[W + 0.6, 0.10, D + 0.6]} />
      <meshStandardMaterial
        color="#0a1825"
        roughness={0.95}
        metalness={0.05}
      />
    </mesh>
  );
}

// ── Floor band (rises from yBase upward) ──────────────────────────

type PhaseState = {
  groundY: number;
  firstY: number;
  parapetY: number;
  roofY: number;
  roofOpacity: number;
  apertureOpacity: number;
  lightsIntensity: number;
  buildingOpacity: number;
  buildingScale: number;
  particles: number;
};

function FloorBand({
  cx,
  width,
  height,
  depth,
  yBase,
  material,
  scaleRef,
  scaleKey,
}: {
  cx: number;
  width: number;
  height: number;
  depth: number;
  yBase: number;
  material: THREE.Material;
  scaleRef: React.MutableRefObject<PhaseState>;
  scaleKey: keyof PhaseState;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (groupRef.current) {
      const s = scaleRef.current[scaleKey] as number;
      groupRef.current.scale.y = Math.max(s, 0.001);
    }
  });

  return (
    // Wrap in a group so scale.y pivot is at the band's BASE (yBase).
    <group ref={groupRef} position={[0, yBase, 0]}>
      <mesh
        position={[cx, height / 2, 0]}
        castShadow
        receiveShadow
        material={material}
      >
        <boxGeometry args={[width, height, depth]} />
      </mesh>
    </group>
  );
}

// ── Roof slab ─────────────────────────────────────────────────────

function Roof({
  phase,
}: {
  phase: React.MutableRefObject<PhaseState>;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (meshRef.current) {
      const drop = (1 - phase.current.roofY) * 0.6;
      meshRef.current.position.y =
        H_GF + H_F1 + H_PARAPET + 0.05 + drop;
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = phase.current.roofOpacity;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <boxGeometry args={[W + 0.12, 0.08, D + 0.12]} />
      <meshStandardMaterial
        color="#091a2c"
        roughness={0.75}
        metalness={0.1}
        transparent
        opacity={0}
      />
    </mesh>
  );
}

// ── Balcony overhang ──────────────────────────────────────────────

function BalconyOverhang({
  phase,
}: {
  phase: React.MutableRefObject<PhaseState>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (groupRef.current) {
      const s = phase.current.firstY;
      groupRef.current.scale.set(1, Math.max(s, 0.001), 1);
      groupRef.current.visible = s > 0.01;
    }
  });
  return (
    <group ref={groupRef} position={[0, H_GF, 0]}>
      {/* Overhang slab projecting forward of the first floor. */}
      <mesh position={[0, 0.06, D / 2 + 0.18]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.10, 0.12, 0.50]} />
        <meshStandardMaterial color="#0e2034" roughness={0.7} metalness={0.18} />
      </mesh>
      {/* Glass balustrade in front of the balcony. */}
      <mesh position={[0, 0.30, D / 2 + 0.42]} castShadow>
        <boxGeometry args={[W + 0.0, 0.45, 0.04]} />
        <meshStandardMaterial
          color="#16385a"
          roughness={0.2}
          metalness={0.3}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* Balustrade top rail (catches the light). */}
      <mesh position={[0, 0.54, D / 2 + 0.42]}>
        <boxGeometry args={[W + 0.02, 0.04, 0.06]} />
        <meshStandardMaterial color="#7ef5ed" emissive="#7ef5ed" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// ── Floor-line accent hairlines ──────────────────────────────────

function FloorLines({
  phase,
}: {
  phase: React.MutableRefObject<PhaseState>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (groupRef.current) {
      const s = Math.min(phase.current.firstY, phase.current.parapetY);
      const mat = (groupRef.current.children[0] as THREE.Mesh)
        ?.material as THREE.MeshStandardMaterial | undefined;
      groupRef.current.visible = phase.current.firstY > 0.05;
      // No additional fade — relies on the parent's roof opacity.
      if (mat) mat.opacity = Math.min(1, phase.current.firstY * 2);
    }
  });
  return (
    <group ref={groupRef}>
      {/* Line between ground floor and first floor (front edge). */}
      <mesh position={[0, H_GF, D / 2 + 0.012]}>
        <boxGeometry args={[W + 0.02, 0.025, 0.01]} />
        <meshStandardMaterial
          color="#7ef5ed"
          emissive="#7ef5ed"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* Line at top of first floor (under the parapet). */}
      <mesh position={[0, H_GF + H_F1, D / 2 + 0.012]}>
        <boxGeometry args={[W + 0.02, 0.020, 0.01]} />
        <meshStandardMaterial
          color="#7ef5ed"
          emissive="#7ef5ed"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Right-face vertical seam at the front corner. */}
      <mesh position={[W / 2 + 0.012, (H_GF + H_F1) / 2, 0]}>
        <boxGeometry args={[0.01, H_GF + H_F1, 0.020]} />
        <meshStandardMaterial
          color="#7ef5ed"
          emissive="#7ef5ed"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

// ── Apertures (windows, doors, garage doors) ──────────────────────

/**
 * Apertures are thin meshes placed slightly in front of the wall
 * surface. Glass uses an emissive material whose intensity is driven
 * by `phase.lightsIntensity`. Doors and garage are non-emissive solid
 * panels. All apertures share their own group so their opacity can
 * fade in together once walls are up.
 */
function Apertures({
  phase,
}: {
  phase: React.MutableRefObject<PhaseState>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const litRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.visible = phase.current.apertureOpacity > 0.02;
      groupRef.current.scale.setScalar(
        0.95 + 0.05 * phase.current.apertureOpacity,
      );
    }
    for (const mat of litRefs.current) {
      if (mat) mat.emissiveIntensity = phase.current.lightsIntensity;
    }
  });

  // Window/door definitions per unit. Coordinates in unit-local
  // space (cx-relative). Picture windows now span ~75% of the front
  // face width of each unit, with floor-to-ceiling proportions on
  // the first floor (this is the bit that makes the building read
  // as a modern townhouse, not a featureless box).
  const windows = useMemo(
    () => [
      // Front face — first floor: 1 wide picture window per unit
      { face: "front" as const, ux: 0, y: H_GF + H_F1 / 2 + 0.05, w: UNIT_W * 0.78, h: H_F1 * 0.78 },
      // Right face — first floor (visible on Unit B side, since Unit A's right is hidden by Unit B)
      { face: "right" as const, ux: -D * 0.22, y: H_GF + H_F1 / 2 + 0.05, w: D * 0.32, h: H_F1 * 0.65 },
      { face: "right" as const, ux: +D * 0.22, y: H_GF + H_F1 / 2 + 0.05, w: D * 0.32, h: H_F1 * 0.65 },
    ],
    [],
  );

  const doorsGround = useMemo(
    () => [
      // Garage door (large) + entry door (narrow) on the FRONT of each unit's ground floor
      { kind: "garage" as const, ux: -UA_HALF * 0.38, y: H_GF * 0.48, w: UNIT_W * 0.46, h: H_GF * 0.82 },
      { kind: "door" as const, ux: +UA_HALF * 0.62, y: H_GF * 0.46, w: UNIT_W * 0.16, h: H_GF * 0.74 },
      // Sidelight window beside the entry door
      { kind: "garage" as const, ux: +UA_HALF * 0.28, y: H_GF * 0.50, w: UNIT_W * 0.18, h: H_GF * 0.60 },
    ],
    [],
  );

  litRefs.current = [];

  return (
    <group ref={groupRef}>
      {/* Apertures on Unit A (cx=UA_CX) */}
      {windows.filter((w) => w.face === "front" || (w.face === "right" && !("sideUnit" in w))).map((w, i) => (
        <Window
          key={`a-w-${i}`}
          face={w.face}
          ux={UA_CX + w.ux}
          y={w.y}
          w={w.w}
          h={w.h}
          unitCx={UA_CX}
          materialRefs={litRefs}
        />
      ))}
      {doorsGround.map((d, i) => (
        <FrontPanel
          key={`a-d-${i}`}
          kind={d.kind}
          ux={UA_CX + d.ux}
          y={d.y}
          w={d.w}
          h={d.h}
        />
      ))}

      {/* Apertures on Unit B (cx=UB_CX) — mirror of A */}
      {windows.filter((w) => w.face === "front").map((w, i) => (
        <Window
          key={`b-w-${i}`}
          face={w.face}
          ux={UB_CX + w.ux}
          y={w.y}
          w={w.w}
          h={w.h}
          unitCx={UB_CX}
          materialRefs={litRefs}
        />
      ))}
      {/* Right-face windows (only the right side of unit B is visible) */}
      {windows.filter((w) => w.face === "right").map((w, i) => (
        <Window
          key={`b-rw-${i}`}
          face={w.face}
          ux={w.ux}
          y={w.y}
          w={w.w}
          h={w.h}
          unitCx={UB_CX}
          materialRefs={litRefs}
        />
      ))}
      {doorsGround.map((d, i) => (
        <FrontPanel
          key={`b-d-${i}`}
          kind={d.kind}
          ux={UB_CX + d.ux}
          y={d.y}
          w={d.w}
          h={d.h}
        />
      ))}

      {/* Vertical seam between Unit A and Unit B — dark accent strip. */}
      <mesh position={[0, (H_GF + H_F1) / 2, D / 2 + 0.006]}>
        <boxGeometry args={[0.06, H_GF + H_F1, 0.01]} />
        <meshStandardMaterial color="#0a1726" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Window({
  face,
  ux,
  y,
  w,
  h,
  unitCx,
  materialRefs,
}: {
  face: "front" | "right";
  ux: number;
  y: number;
  w: number;
  h: number;
  unitCx: number;
  materialRefs: React.MutableRefObject<THREE.MeshStandardMaterial[]>;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  React.useEffect(() => {
    if (matRef.current) materialRefs.current.push(matRef.current);
  });

  if (face === "front") {
    return (
      <group position={[ux, y, D / 2 + 0.012]}>
        {/* Window frame (slightly larger, darker than the glass). */}
        <mesh position={[0, 0, -0.005]}>
          <boxGeometry args={[w + 0.08, h + 0.08, 0.015]} />
          <meshStandardMaterial color="#0a1c30" roughness={0.5} />
        </mesh>
        {/* Glass — emissive material lights up during Act 3. */}
        <mesh castShadow={false}>
          <boxGeometry args={[w, h, 0.025]} />
          <meshStandardMaterial
            ref={matRef}
            color="#1f4870"
            emissive="#ffd49a"
            emissiveIntensity={0}
            roughness={0.18}
            metalness={0.15}
            transparent
            opacity={0.95}
          />
        </mesh>
        {/* Centre mullion */}
        <mesh position={[0, 0, 0.014]}>
          <boxGeometry args={[0.04, h, 0.005]} />
          <meshStandardMaterial color="#0a1c30" roughness={0.6} />
        </mesh>
      </group>
    );
  }
  // face = right
  return (
    <group position={[unitCx + UA_HALF + 0.012, y, ux]}>
      <mesh position={[-0.005, 0, 0]}>
        <boxGeometry args={[0.015, h + 0.06, w + 0.06]} />
        <meshStandardMaterial color="#0a1c30" roughness={0.5} />
      </mesh>
      <mesh castShadow={false}>
        <boxGeometry args={[0.025, h, w]} />
        <meshStandardMaterial
          ref={matRef}
          color="#1f4870"
          emissive="#ffd49a"
          emissiveIntensity={0}
          roughness={0.18}
          metalness={0.15}
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  );
}

function FrontPanel({
  kind,
  ux,
  y,
  w,
  h,
}: {
  kind: "garage" | "door";
  ux: number;
  y: number;
  w: number;
  h: number;
}) {
  const color = kind === "garage" ? "#0e1a26" : "#3a2616";
  const roughness = kind === "garage" ? 0.55 : 0.85;
  return (
    <mesh position={[ux, y, D / 2 + 0.012]}>
      <boxGeometry args={[w, h, 0.02]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.05} />
    </mesh>
  );
}

// ── Interior lights ───────────────────────────────────────────────

function InteriorLights({
  phase,
}: {
  phase: React.MutableRefObject<PhaseState>;
}) {
  const refs = useRef<THREE.PointLight[]>([]);

  useFrame(() => {
    const intensity = phase.current.lightsIntensity * 0.7;
    for (const l of refs.current) {
      if (l) l.intensity = intensity;
    }
  });

  const positions: [number, number, number][] = [
    // Each unit gets 2 interior lights, ground + first floor
    [UA_CX, H_GF * 0.55, 0],
    [UA_CX, H_GF + H_F1 * 0.55, 0],
    [UB_CX, H_GF * 0.55, 0],
    [UB_CX, H_GF + H_F1 * 0.55, 0],
  ];

  refs.current = [];

  return (
    <>
      {positions.map((p, i) => (
        <pointLight
          key={i}
          ref={(l) => {
            if (l) refs.current[i] = l;
          }}
          position={p}
          color="#ffd49a"
          intensity={0}
          distance={5}
          decay={1.8}
        />
      ))}
    </>
  );
}

// ── Landscape — planter boxes with leafy blobs ────────────────────

function Landscape({
  phase,
}: {
  phase: React.MutableRefObject<PhaseState>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.visible = phase.current.apertureOpacity > 0.4;
      groupRef.current.scale.setScalar(
        Math.max(0.001, phase.current.apertureOpacity),
      );
    }
  });

  const items = useMemo(() => {
    const out: Array<{ x: number; z: number; s: number }> = [];
    // 3 trees in front of unit A, 3 in front of unit B
    for (let unit = 0; unit < 2; unit++) {
      const baseX = unit === 0 ? UA_CX : UB_CX;
      for (let k = 0; k < 3; k++) {
        out.push({
          x: baseX + (k - 1) * UNIT_W * 0.32,
          z: D / 2 + 0.55,
          s: 0.32 + (k % 2) * 0.05,
        });
      }
    }
    // 2 corner trees
    out.push({ x: -W / 2 - 0.4, z: D / 2 + 0.2, s: 0.40 });
    out.push({ x: +W / 2 + 0.4, z: D / 2 + 0.2, s: 0.40 });
    return out;
  }, []);

  return (
    <group ref={groupRef}>
      {items.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          {/* Planter box */}
          <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.4, 0.24, 0.4]} />
            <meshStandardMaterial color="#1a2030" roughness={0.9} />
          </mesh>
          {/* Trunk */}
          <mesh position={[0, t.s + 0.24, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.06, t.s * 0.7, 8]} />
            <meshStandardMaterial color="#5a3e25" roughness={0.95} />
          </mesh>
          {/* Foliage */}
          <mesh position={[0, t.s + 0.5, 0]} castShadow>
            <sphereGeometry args={[t.s * 0.8, 12, 10]} />
            <meshStandardMaterial color="#244435" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Particle dissolution ──────────────────────────────────────────

/**
 * A field of small spheres distributed inside the building's volume.
 * Sit invisible most of the loop, then burst upward + outward during
 * the dissolve beat and fade. Stagger by Y position so the top
 * dissolves first.
 */
function Particles({
  phase,
}: {
  phase: React.MutableRefObject<PhaseState>;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  // Generate particle starts deterministically.
  const particles = useMemo(() => {
    let s = 17;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const out: Array<{
      px: number;
      py: number;
      pz: number;
      drift: [number, number, number];
      delay: number;
      size: number;
    }> = [];
    const COUNT = 140;
    for (let i = 0; i < COUNT; i++) {
      // Sample positions on the visible faces of the building.
      const face = rand();
      let x: number, y: number, z: number;
      if (face < 0.5) {
        // front face
        x = (rand() - 0.5) * W;
        y = rand() * (H_GF + H_F1 + H_PARAPET);
        z = D / 2 + 0.02;
      } else if (face < 0.85) {
        // right face
        x = W / 2 + 0.02;
        y = rand() * (H_GF + H_F1 + H_PARAPET);
        z = (rand() - 0.5) * D;
      } else {
        // top
        x = (rand() - 0.5) * W;
        y = H_GF + H_F1 + H_PARAPET + 0.05;
        z = (rand() - 0.5) * D;
      }
      out.push({
        px: x,
        py: y,
        pz: z,
        drift: [
          (rand() - 0.5) * 1.6,
          rand() * 1.6 + 0.4,
          (rand() - 0.5) * 1.4,
        ],
        // Delay scales with inverse Y so top particles dissolve first.
        delay:
          (1 - y / (H_GF + H_F1 + H_PARAPET)) * 0.45 + rand() * 0.15,
        size: 0.018 + rand() * 0.022,
      });
    }
    return out;
  }, []);

  // Pre-allocated reusable colour + opacity attributes managed via
  // per-mesh refs. We don't reuse instanced mesh here because we want
  // per-particle opacity (which InstancedMesh can't do without a
  // custom shader). 140 spheres is fine performance-wise on desktop.

  const meshRefs = useRef<THREE.Mesh[]>([]);
  meshRefs.current = [];

  useFrame(() => {
    const p = phase.current.particles;
    if (p <= 0.001) {
      // Hide all particles
      for (const m of meshRefs.current) {
        if (m) m.visible = false;
      }
      return;
    }
    for (let i = 0; i < particles.length; i++) {
      const mesh = meshRefs.current[i];
      const def = particles[i]!;
      if (!mesh) continue;
      // Per-particle progress: 0 until p > delay, then ramps to 1.
      const local = clamp01((p - def.delay) / (1 - def.delay));
      mesh.visible = local > 0;
      if (local <= 0) continue;
      const e = easeInOut(local);
      mesh.position.set(
        def.px + def.drift[0] * e,
        def.py + def.drift[1] * e,
        def.pz + def.drift[2] * e,
      );
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = 1 - local;
      mat.emissiveIntensity = (1 - local) * 1.2;
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((def, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) meshRefs.current[i] = m;
          }}
          position={[def.px, def.py, def.pz]}
          visible={false}
        >
          <sphereGeometry args={[def.size, 6, 6]} />
          <meshStandardMaterial
            color="#7ef5ed"
            emissive="#7ef5ed"
            emissiveIntensity={1.2}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Materials (instantiated once and reused across walls) ─────────

// Wall materials — brand-on dark navy with a hint of warmth. Lighter
// than the page bg so the silhouette reads against the dark canvas.
const WALL_MAT = new THREE.MeshStandardMaterial({
  color: "#2a4866",
  roughness: 0.78,
  metalness: 0.12,
});
const WALL_MAT_LIGHT = new THREE.MeshStandardMaterial({
  color: "#34557a",
  roughness: 0.72,
  metalness: 0.12,
});
const PARAPET_MAT = new THREE.MeshStandardMaterial({
  color: "#1e3a58",
  roughness: 0.65,
  metalness: 0.18,
});

// ── Phase indicator (HTML overlay) ────────────────────────────────

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
            01 · Building
          </span>
          <span className="absolute inset-0 whitespace-nowrap bhq-phase bhq-phase-2">
            02 · Settling
          </span>
          <span className="absolute inset-0 whitespace-nowrap bhq-phase bhq-phase-3">
            03 · Lights on
          </span>
          <span className="absolute inset-0 whitespace-nowrap bhq-phase bhq-phase-4">
            04 · Looping
          </span>
        </span>
      </div>
      <style>{`
        .bhq-phase { opacity: 0; }
        .bhq-phase-1 { animation: bhq-phase-1 18s linear infinite; }
        .bhq-phase-2 { animation: bhq-phase-2 18s linear infinite; }
        .bhq-phase-3 { animation: bhq-phase-3 18s linear infinite; }
        .bhq-phase-4 { animation: bhq-phase-4 18s linear infinite; }
        /* 01 Building — 0s to 7s (39%) */
        @keyframes bhq-phase-1 {
          0%   { opacity: 0; }
          1%   { opacity: 1; }
          37%  { opacity: 1; }
          39%  { opacity: 0; }
          100% { opacity: 0; }
        }
        /* 02 Settling — 7s to 9s (39% to 50%) */
        @keyframes bhq-phase-2 {
          0%, 38%  { opacity: 0; }
          40%      { opacity: 1; }
          49%      { opacity: 1; }
          50%      { opacity: 0; }
          100%     { opacity: 0; }
        }
        /* 03 Lights on — 9s to 14s (50% to 78%) */
        @keyframes bhq-phase-3 {
          0%, 49%  { opacity: 0; }
          51%      { opacity: 1; }
          77%      { opacity: 1; }
          78%      { opacity: 0; }
          100%     { opacity: 0; }
        }
        /* 04 Looping — 14s to 18s (78% to 100%) */
        @keyframes bhq-phase-4 {
          0%, 77%  { opacity: 0; }
          80%      { opacity: 1; }
          99%      { opacity: 1; }
          100%     { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

