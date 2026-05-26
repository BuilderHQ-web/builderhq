/**
 * Design tokens — single source of truth for the mobile app.
 *
 * ─────────────────────────────────────────────────────────────────
 * v4 — "Confident calm with moments of celebration."
 * ─────────────────────────────────────────────────────────────────
 *
 * The old v2/v3 system layered 5 background tints, 3 glass tones,
 * 2 brand colors, and gradients on everything. That read as a Figma
 * template. v4 strips it back to a strict 13-color palette plus the
 * landing's Instrument Serif as the signature display face.
 *
 * Philosophy:
 *   · ONE canvas, ONE surface, ONE accent. Layer only when meaning
 *     demands it (active state = elevated surface; selected = accent
 *     border).
 *   · The accent (teal #00d4c8) is the ONLY brand color. No secondary
 *     blue. No glass tones. Gradients reserved for the headline
 *     accent-italic treatment and the primary CTA glow.
 *   · Three text tones. Three. That's the entire text hierarchy.
 *   · Native iOS feel — system font (SF Pro) for UI + body, Instrument
 *     Serif for display only. Tabular numerics throughout.
 *   · Motion is meaningful — named curves and durations, no ad-hoc
 *     spring-bounce. Celebration moments use the spring curve;
 *     everything else is easeOut.
 *
 * Migration plan:
 *   · v4 tokens live alongside the legacy v2/v3 tokens during the
 *     dashboard + profile rebuild (Phase 1-2). Once every screen is
 *     ported (Phase 3) the legacy block at the bottom of this file
 *     gets deleted.
 *   · Tailwind config (`mobile/tailwind.config.js`) mirrors this file
 *     1:1 — when one changes the other must follow.
 */

// ── v4 PALETTE — strict, premium, BuilderHQ ─────────────────────────────

/**
 * The 13 colors that compose every screen. Cap is intentional: when a
 * designer reaches for a 14th, they've drifted from the system.
 *
 * Naming convention:
 *   · `canvas`        — the page background
 *   · `surface`       — the one card surface
 *   · `surfaceElev`   — elevated card (active / selected only)
 *   · `hairline*`     — borders (and only borders)
 *   · `text*`         — text in three tones
 *   · `accent*`       — brand teal, in four shades for context
 *   · semantic        — success / warning / danger, tuned to harmonize
 */
export const palette = {
  // Canvas + surfaces — three depths, no more
  canvas: "#06080F",
  surface: "#0E131F",
  surfaceElev: "#141A2A",

  // Borders — two states only (default + accent active)
  hairline: "rgba(255, 255, 255, 0.06)",
  hairlineStrong: "rgba(255, 255, 255, 0.12)",
  hairlineAccent: "rgba(0, 212, 200, 0.30)",

  // Text — three tones, full stop
  text: "#F5F7FF",
  textMuted: "#8E9BB8",
  textDim: "#5A6789",

  // Accent — brand teal in four shades
  accent: "#00D4C8",
  accentLight: "#7EF5ED",
  accentMuted: "rgba(0, 212, 200, 0.08)",
  accentGlow: "rgba(0, 212, 200, 0.40)",
  accentContrast: "#031118",

  // Semantic — tuned to harmonize with the teal accent, used sparingly
  success: "#5EEAD4",
  successMuted: "rgba(94, 234, 212, 0.10)",
  warning: "#FBBF24",
  warningMuted: "rgba(251, 191, 36, 0.10)",
  danger: "#FB7185",
  dangerMuted: "rgba(251, 113, 133, 0.10)",
} as const;

/**
 * Signature accent-italic gradient — the device that ties the mobile
 * app to the landing page. Used ONLY on display titles (one word per
 * screen) and the primary CTA hover glow.
 */
export const accentItalicGradient = [
  "#EEF6FF", // landing-aligned ice white
  palette.accentLight,
] as const;

/**
 * Type system — two faces, optical-size aware.
 *
 * Why these two and only these two:
 *   · Instrument Serif italic carries the BuilderHQ brand voice from
 *     the landing. Reserved for display titles in italic form only.
 *   · System font (SF Pro on iOS, Roboto on Android) for everything
 *     else. Native rendering, perfect optical sizing at every weight,
 *     and tabular nums for prices. No JS font loading needed for the
 *     90% case — the OS already has it.
 */
export const fonts = {
  /** Instrument Serif — display titles (italic). Loaded via expo-font. */
  display: "InstrumentSerif_400Regular",
  displayItalic: "InstrumentSerif_400Regular_Italic",
  /** Native system font — iOS SF Pro, Android Roboto. No load needed. */
  system: undefined as string | undefined,
} as const;

/** Locked optical scale — five sizes, one line-height per role. */
export const type = {
  // Display — Instrument Serif italic, hero greeting / moments only
  display: { fontSize: 36, lineHeight: 40, letterSpacing: -0.4 },
  displayLarge: { fontSize: 52, lineHeight: 56, letterSpacing: -0.8 },
  displayHero: { fontSize: 80, lineHeight: 80, letterSpacing: -1.6 },

  // Title — system font, section headers
  titleLarge: { fontSize: 24, lineHeight: 30, letterSpacing: -0.25 },
  title: { fontSize: 19, lineHeight: 25, letterSpacing: -0.15 },
  titleSmall: { fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },

  // Body — system font, content
  body: { fontSize: 15, lineHeight: 22 },
  bodySmall: { fontSize: 13, lineHeight: 19 },

  // Caption — system font, meta + kickers
  caption: { fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
  kicker: { fontSize: 11, lineHeight: 14, letterSpacing: 2.4, textTransform: "uppercase" as const },

  // Numeric — system font tabular, prices and counts
  numeric: { fontSize: 17, lineHeight: 20 },
  numericLarge: { fontSize: 32, lineHeight: 36 },
  numericHero: { fontSize: 56, lineHeight: 56 },
} as const;

/** Five motion curves. Use only these. */
export const curves = {
  /** Default — most things. */
  easeOut: [0.2, 0.8, 0.2, 1] as const,
  /** Premium feel — slide-ins, screen transitions. */
  easeOutSoft: [0.16, 1, 0.3, 1] as const,
  /** Reversible transitions. */
  easeInOut: [0.65, 0, 0.35, 1] as const,
  /** Celebration only — moments of achievement. */
  spring: [0.34, 1.56, 0.64, 1] as const,
  /** Linear — for ticking timers / progress bars only. */
  linear: [0, 0, 1, 1] as const,
} as const;

/** Four durations. Pick one. */
export const durations = {
  fast: 180,
  base: 320,
  slow: 500,
  celebrate: 1200,
} as const;

// ── v4 spatial system ─────────────────────────────────────────────────

export const radii4 = {
  // Fewer, sharper. Premium = restraint.
  none: 0,
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const space = {
  // 4pt grid
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

/** Standard shadow presets. Used VERY sparingly — premium feels matte. */
export const shadow = {
  /** Subtle lift under a card. */
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 30,
    elevation: 6,
  },
  /** Accent glow under the primary CTA. */
  accentGlow: {
    shadowColor: palette.accent,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

// ── LEGACY v2/v3 BLOCK — kept until every screen is ported ──────────────
//
// Every reference below is still imported by at least one screen we
// haven't rebuilt yet (browse, messages, project detail, tender flow).
// Once Phase 3 sweeps those screens, this block deletes wholesale.

export const colors = {
  // Canvas (v2)
  bg: "#0a0d1a",
  bgDeep: "#06080f",
  bgTint: "#10162a",
  bgRaised: "#141a2e",
  bgElev: "#1a2240",

  // Glass tints
  glass1: "rgba(255, 255, 255, 0.04)",
  glass2: "rgba(255, 255, 255, 0.07)",
  glass3: "rgba(255, 255, 255, 0.10)",
  glassEdge: "rgba(255, 255, 255, 0.14)",

  // Borders
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  border: "rgba(255, 255, 255, 0.10)",
  borderStrong: "rgba(255, 255, 255, 0.18)",
  borderAccent: "rgba(0, 212, 200, 0.40)",
  borderAccentStrong: "rgba(0, 212, 200, 0.65)",
  borderBlue: "rgba(76, 144, 255, 0.40)",

  // Text
  text: "#f5f7ff",
  textMuted: "#a8b3cf",
  textSubtle: "rgba(245, 247, 255, 0.62)",
  textFaint: "rgba(245, 247, 255, 0.42)",
  textDim: "#697296",
  textInverse: "#06080f",

  // Accent
  accent: "#00d4c8",
  accentHover: "#22e3d8",
  accentActive: "#00b9ae",
  accentMuted: "rgba(0, 212, 200, 0.16)",
  accentGlow: "rgba(0, 212, 200, 0.45)",
  accentLight: "#7df5ed",
  accentContrast: "#031118",

  // Secondary blue (v2 — to be dropped in v4 rebuild)
  blue: "#3b82f6",
  blueHover: "#5d97f8",
  blueLight: "#7eb1ff",
  blueGlow: "rgba(59, 130, 246, 0.40)",
  blueMuted: "rgba(59, 130, 246, 0.16)",

  // Hero gradient stops
  gradFrom: "#00d4c8",
  gradVia: "#1ea3f0",
  gradTo: "#3b82f6",

  // Semantic
  success: "#86efac",
  warning: "#fbb840",
  danger: "#ff7a8a",
  info: "#7dd3fc",
} as const;

export const brandGradient = [colors.gradFrom, colors.gradVia, colors.gradTo] as const;
export const subtleGradient = [
  "rgba(0, 212, 200, 0.18)",
  "rgba(59, 130, 246, 0.18)",
] as const;
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
