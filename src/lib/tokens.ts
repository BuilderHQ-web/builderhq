/**
 * BuilderHQ design tokens — single source of truth.
 *
 * Mirrors src/app/globals.css. Exported as a plain TS object so the future
 * React Native / Expo app can consume identical values without Tailwind.
 * When you change a token here, change the matching CSS var.
 *
 * Reach for this object only when you need a value in TS (charts, Framer
 * Motion, RN, canvas). In components, use Tailwind classes.
 *
 * Palette / fonts / radii were extracted from the brand landing page
 * (reference/landing/index.html). Treat those as the locked brand contract.
 */

export const tokens = {
  color: {
    // Base canvas — deep navy, signature BuilderHQ.
    bg: {
      base: "#03090f",
      deep: "#060f19", // bg2 in landing — used for sections that lift slightly
      raised: "oklch(0.165 0.015 240)",
      elev: "oklch(0.205 0.018 240)",
      overlay: "oklch(0.10 0.012 240 / 0.72)",
    },
    surface: {
      1: "oklch(0.155 0.014 240)",
      2: "oklch(0.195 0.016 240)",
      3: "oklch(0.235 0.018 240)",
      hover: "oklch(0.255 0.020 240)",
    },
    border: {
      // Brand uses cool-blue-tinted borders (rgba(100,180,255,.08)) — feels
      // like a blueprint line, not a neutral grey.
      subtle: "rgba(100,180,255,0.06)",
      DEFAULT: "rgba(100,180,255,0.10)",
      strong: "rgba(100,180,255,0.18)",
      accent: "rgba(0,212,200,0.30)",
      accentStrong: "rgba(0,212,200,0.45)",
    },
    text: {
      // Slight cool tint — premium "screen white", not pure FFFFFF.
      DEFAULT: "#eef6ff",
      muted: "#98b8d0", // "soft" in landing
      subtle: "rgba(238,246,255,0.62)",
      faint: "rgba(238,246,255,0.42)",
      dim: "#567080", // "dim" in landing — for tiny meta labels
      inverse: "#031118",
    },
    accent: {
      // BuilderHQ teal — primary brand colour. Use intentionally.
      DEFAULT: "#00d4c8",
      hover: "oklch(0.84 0.14 195)",
      active: "oklch(0.74 0.15 195)",
      muted: "rgba(0,212,200,0.14)",
      glow: "rgba(0,212,200,0.35)",
      // The lighter teal — used for headlines, glow, highlights ("teal2").
      light: "#7ef5ed",
      contrast: "#031118",
    },
    // Secondary brand blue — used in gradients (CTA wash, project visuals).
    blue: {
      DEFAULT: "#1a5fd4",
      glow: "rgba(26,95,212,0.3)",
    },
    success: {
      DEFAULT: "oklch(0.78 0.16 155)",
      muted: "oklch(0.78 0.16 155 / 0.14)",
    },
    warning: {
      DEFAULT: "#fbb840",
      muted: "rgba(255,180,0,0.14)",
    },
    danger: {
      DEFAULT: "oklch(0.72 0.20 22)",
      muted: "oklch(0.72 0.20 22 / 0.14)",
    },
    info: {
      DEFAULT: "oklch(0.78 0.13 230)",
      muted: "oklch(0.78 0.13 230 / 0.14)",
    },
  },

  // Brand uses tight 3px radii on chips/buttons + 6-8px on cards. We
  // codify both: tight for chips/CTAs, larger for content cards.
  radius: {
    none: "0",
    tight: "3px", // brand-tight: chips, small buttons, badges
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "20px",
    "3xl": "28px",
    full: "9999px",
  },

  space: {
    px: "1px",
    0.5: "2px",
    1: "4px",
    1.5: "6px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
    32: "128px",
  },

  type: {
    family: {
      // Display — Bebas Neue. Tall, condensed, dramatic. ALL CAPS by default
      // for hero/section titles. Brand-locked.
      display: "var(--font-display)",
      // UI — Space Grotesk. Geometric, characterful. Used for headings,
      // labels, button text, mid-size copy.
      ui: "var(--font-ui)",
      // Body — DM Sans. Optimized for long-form readability.
      sans: "var(--font-sans)",
      // Mono — JetBrains. ABNs, prices, IDs.
      mono: "var(--font-mono)",
    },
    size: {
      caption: ["10px", { lineHeight: "14px", letterSpacing: "0.22em" }],
      "body-xs": ["12px", { lineHeight: "18px" }],
      "body-sm": ["14px", { lineHeight: "22px" }],
      body: ["15px", { lineHeight: "26px" }],
      "body-lg": ["17px", { lineHeight: "30px" }],
      h4: ["20px", { lineHeight: "28px", letterSpacing: "-0.02em" }],
      h3: ["26px", { lineHeight: "32px", letterSpacing: "-0.02em" }],
      h2: ["clamp(2.25rem,4vw+1rem,3.75rem)", { lineHeight: "1.0", letterSpacing: "-0.02em" }],
      h1: ["clamp(3rem,5.5vw+1rem,5.5rem)", { lineHeight: "0.92", letterSpacing: "-0.02em" }],
      display: ["clamp(3.5rem,8vw+1rem,7.5rem)", { lineHeight: "0.88", letterSpacing: "-0.015em" }],
      hero: ["clamp(4.5rem,12vw+1rem,11rem)", { lineHeight: "0.83", letterSpacing: "-0.015em" }],
    },
    weight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      // Bebas Neue ships at one weight; this is informational only.
      display: "400",
    },
    tracking: {
      // Brand uses tight letter-spacing for body, very wide tracking for
      // kickers/labels (uppercase 10–11px stuff).
      kicker: "0.22em",
      label: "0.18em",
      tightHero: "-0.015em",
      tightHeadline: "-0.02em",
    },
  },

  motion: {
    duration: {
      fast: "150ms",
      base: "240ms",
      slow: "420ms",
      lazy: "680ms",
      reveal: "900ms",
    },
    ease: {
      // The "premium ease-out" used throughout the landing.
      out: "cubic-bezier(0.22, 1, 0.36, 1)",
      // Apple-flavoured slightly softer ease-out (used for our focus rings).
      outSoft: "cubic-bezier(0.16, 1, 0.3, 1)",
      inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },

  effect: {
    ringFocus: "0 0 0 1px rgba(0,212,200,0.55), 0 0 0 4px rgba(0,212,200,0.18)",
    glowAccent: "0 8px 32px -8px rgba(0,212,200,0.45)",
    glowAccentSoft: "0 6px 24px -10px rgba(0,212,200,0.28)",
    glowAccentStrong: "0 14px 40px rgba(0,212,200,0.30)",
    elev1: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 2px 0 rgba(0,0,0,0.4)",
    elev2: "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 8px 24px -8px rgba(0,0,0,0.5)",
    elev3: "0 32px 80px rgba(0,0,0,0.45)",
  },

  container: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1200px",
    "2xl": "1320px",
    prose: "68ch",
  },
} as const;

export type Tokens = typeof tokens;
