/**
 * Design tokens — single source of truth for the mobile app.
 *
 * Keep in lockstep with `tailwind.config.js`. Both files are read by
 * Tailwind (for `className` classes) and by raw style values via this
 * module — when one changes the other must follow.
 *
 * Style direction (v2):
 *   Glassmorphic surfaces over a deep slate-navy canvas with a teal-
 *   to-blue gradient accent. Inspired by Starlink / Revolut / Airbnb
 *   nav patterns. Most colour usage now passes through this module
 *   so consumers can compose gradients + glass layers without
 *   sprinkling rgba strings.
 */

export const colors = {
  // ── Canvas ──────────────────────────────────────────────────────
  bg: "#0a0d1a",
  bgDeep: "#06080f",
  bgTint: "#10162a",
  bgRaised: "#141a2e",
  bgElev: "#1a2240",

  // ── Glass tints (combine with BlurView) ─────────────────────────
  glass1: "rgba(255, 255, 255, 0.04)",
  glass2: "rgba(255, 255, 255, 0.07)",
  glass3: "rgba(255, 255, 255, 0.10)",
  glassEdge: "rgba(255, 255, 255, 0.14)",

  // ── Borders ─────────────────────────────────────────────────────
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  border: "rgba(255, 255, 255, 0.10)",
  borderStrong: "rgba(255, 255, 255, 0.18)",
  borderAccent: "rgba(0, 212, 200, 0.40)",
  borderAccentStrong: "rgba(0, 212, 200, 0.65)",
  borderBlue: "rgba(76, 144, 255, 0.40)",

  // ── Text ────────────────────────────────────────────────────────
  text: "#f5f7ff",
  textMuted: "#a8b3cf",
  textSubtle: "rgba(245, 247, 255, 0.62)",
  textFaint: "rgba(245, 247, 255, 0.42)",
  textDim: "#697296",
  textInverse: "#06080f",

  // ── Accent (BuilderHQ teal) ─────────────────────────────────────
  accent: "#00d4c8",
  accentHover: "#22e3d8",
  accentActive: "#00b9ae",
  accentMuted: "rgba(0, 212, 200, 0.16)",
  accentGlow: "rgba(0, 212, 200, 0.45)",
  accentLight: "#7df5ed",
  accentContrast: "#031118",

  // ── Secondary brand blue ────────────────────────────────────────
  blue: "#3b82f6",
  blueHover: "#5d97f8",
  blueLight: "#7eb1ff",
  blueGlow: "rgba(59, 130, 246, 0.40)",
  blueMuted: "rgba(59, 130, 246, 0.16)",

  // ── Hero gradient stops ─────────────────────────────────────────
  gradFrom: "#00d4c8",
  gradVia: "#1ea3f0",
  gradTo: "#3b82f6",

  // ── Semantic ────────────────────────────────────────────────────
  success: "#86efac",
  warning: "#fbb840",
  danger: "#ff7a8a",
  info: "#7dd3fc",
} as const;

/**
 * The signature hero gradient: teal → cyan-blue → vibrant blue.
 * Mounted on hero cards, the primary CTA button, the active tab
 * indicator, and the completeness ring fill.
 */
export const brandGradient = [colors.gradFrom, colors.gradVia, colors.gradTo] as const;

/** Subtler gradient — used for secondary surfaces (stat tiles, the
 *  active state on chips) so the accent system layers without
 *  clashing. */
export const subtleGradient = [
  "rgba(0, 212, 200, 0.18)",
  "rgba(59, 130, 246, 0.18)",
] as const;

/** Page-canvas gradient — applied as the top-level background, gives
 *  the bg a quiet vertical depth that pure flat fills can't match. */
export const canvasGradient = [colors.bg, colors.bgTint] as const;

export const radii = {
  tight: 3,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 28,
  full: 9999,
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const easing = {
  out: [0.22, 1, 0.36, 1] as const,
  outSoft: [0.16, 1, 0.3, 1] as const,
  inOutSoft: [0.65, 0, 0.35, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
} as const;
