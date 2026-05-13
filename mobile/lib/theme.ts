/**
 * Design tokens — single source of truth for the mobile app.
 *
 * Mirrors the brand colour names + values from the web app's
 * src/app/globals.css @theme block. Whenever a token changes there,
 * update `tailwind.config.js` AND this file in lockstep.
 *
 * Most styling uses Tailwind class names (e.g. `bg-accent`,
 * `text-text-muted`). This module exists for cases where:
 *   · we need a colour outside Tailwind (e.g. for a native picker)
 *   · animation libs need the raw hex (LinearGradient stops, Skia paints)
 *   · React Navigation theme expects an object
 */

export const colors = {
  bg: "#03090f",
  bgDeep: "#060f19",
  bgRaised: "#0c1726",
  bgElev: "#101e32",

  surface1: "#0c1726",
  surface2: "#142539",
  surface3: "#1c3046",
  surfaceHover: "#243a52",

  borderSubtle: "rgba(100, 180, 255, 0.06)",
  border: "rgba(100, 180, 255, 0.10)",
  borderStrong: "rgba(100, 180, 255, 0.18)",
  borderAccent: "rgba(0, 212, 200, 0.30)",
  borderAccentStrong: "rgba(0, 212, 200, 0.45)",

  text: "#eef6ff",
  textMuted: "#98b8d0",
  textSubtle: "rgba(238, 246, 255, 0.62)",
  textFaint: "rgba(238, 246, 255, 0.42)",
  textDim: "#567080",
  textInverse: "#031118",

  accent: "#00d4c8",
  accentHover: "#6df0e8",
  accentActive: "#4cd9d2",
  accentMuted: "rgba(0, 212, 200, 0.14)",
  accentGlow: "rgba(0, 212, 200, 0.35)",
  accentLight: "#7ef5ed",
  accentContrast: "#031118",

  blue: "#1a5fd4",
  blueGlow: "rgba(26, 95, 212, 0.30)",

  success: "#86efac",
  warning: "#fbb840",
  danger: "#ff7a8a",
  info: "#7dd3fc",
} as const;

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
  // Matches a 4-pt grid — same scale Tailwind uses.
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

/**
 * Easing curves used across native animations. Pulled from the web
 * design system's --ease-* tokens so motion feels uniform across
 * platforms.
 */
export const easing = {
  out: [0.22, 1, 0.36, 1] as const,
  outSoft: [0.16, 1, 0.3, 1] as const,
  inOutSoft: [0.65, 0, 0.35, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
} as const;
