/**
 * BuilderHQ design tokens — single source of truth.
 *
 * Mirrors src/styles/tokens.css. Exported as a plain TS object so the
 * future React Native / Expo app can consume identical values without
 * Tailwind. When you change a token here, change the matching CSS var.
 *
 * Use Tailwind classes (`bg-surface-1`, `text-accent`, …) in components.
 * Reach for this object only when you need a value in TS (charts,
 * Framer Motion, RN, canvas, etc).
 */

export const tokens = {
  color: {
    // Base canvas — deep navy, near-black, the BuilderHQ signature.
    bg: {
      base: "#03090f",
      raised: "oklch(0.165 0.015 240)",
      elev: "oklch(0.205 0.018 240)",
      overlay: "oklch(0.10 0.012 240 / 0.72)",
    },
    // Layered surfaces for cards / panels / inputs.
    surface: {
      1: "oklch(0.155 0.014 240)",
      2: "oklch(0.195 0.016 240)",
      3: "oklch(0.235 0.018 240)",
      hover: "oklch(0.255 0.020 240)",
    },
    // Borders sit on top of surfaces; use translucent for that "glow inside" feel.
    border: {
      subtle: "oklch(1 0 0 / 0.06)",
      DEFAULT: "oklch(1 0 0 / 0.10)",
      strong: "oklch(1 0 0 / 0.18)",
      accent: "oklch(0.78 0.13 195 / 0.45)",
    },
    // Text — perceptually uniform ramp, not just opacity.
    text: {
      DEFAULT: "oklch(0.985 0 0)",
      muted: "oklch(0.78 0.01 240)",
      subtle: "oklch(0.62 0.012 240)",
      faint: "oklch(0.46 0.012 240)",
      inverse: "oklch(0.12 0.01 240)",
    },
    // Brand teal — the BuilderHQ accent. Keep usage rare and intentional.
    accent: {
      DEFAULT: "#00d4c8",
      hover: "oklch(0.84 0.14 195)",
      active: "oklch(0.74 0.15 195)",
      muted: "oklch(0.78 0.13 195 / 0.14)",
      glow: "oklch(0.82 0.16 195 / 0.35)",
      contrast: "oklch(0.12 0.02 195)",
    },
    // Semantic states.
    success: {
      DEFAULT: "oklch(0.78 0.16 155)",
      muted: "oklch(0.78 0.16 155 / 0.14)",
    },
    warning: {
      DEFAULT: "oklch(0.83 0.16 75)",
      muted: "oklch(0.83 0.16 75 / 0.14)",
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

  radius: {
    none: "0",
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "20px",
    "3xl": "28px",
    full: "9999px",
  },

  // Spacing follows Tailwind's 4px base; we just name the most-used steps for clarity.
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

  // Type scale tuned for premium proptech UI density.
  type: {
    family: {
      sans: "var(--font-sans)",
      display: "var(--font-display)",
      mono: "var(--font-mono)",
    },
    size: {
      caption: ["11px", { lineHeight: "16px", letterSpacing: "0.04em" }],
      "body-xs": ["12px", { lineHeight: "18px" }],
      "body-sm": ["14px", { lineHeight: "22px" }],
      body: ["15px", { lineHeight: "24px" }],
      "body-lg": ["17px", { lineHeight: "28px" }],
      h4: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
      h3: ["24px", { lineHeight: "32px", letterSpacing: "-0.015em" }],
      h2: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em" }],
      h1: ["44px", { lineHeight: "52px", letterSpacing: "-0.025em" }],
      display: ["clamp(2.75rem, 5vw + 1rem, 5rem)", { lineHeight: "1.04", letterSpacing: "-0.035em" }],
      hero: ["clamp(3.25rem, 6vw + 1rem, 6.75rem)", { lineHeight: "1.02", letterSpacing: "-0.04em" }],
    },
    weight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },

  // Motion — Framer & CSS share these.
  motion: {
    duration: {
      fast: "150ms",
      base: "240ms",
      slow: "420ms",
      lazy: "680ms",
    },
    ease: {
      // Apple-style soft ease-out — the "premium" feel.
      out: "cubic-bezier(0.16, 1, 0.3, 1)",
      inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },

  // Effects: glows + rings, used very sparingly. Dark UIs need glow not shadow.
  effect: {
    ringFocus: "0 0 0 1px oklch(0.78 0.13 195 / 0.55), 0 0 0 4px oklch(0.78 0.13 195 / 0.18)",
    glowAccent: "0 0 0 1px oklch(0.78 0.13 195 / 0.35), 0 8px 32px -8px oklch(0.78 0.16 195 / 0.45)",
    glowAccentSoft: "0 0 0 1px oklch(0.78 0.13 195 / 0.18), 0 6px 24px -10px oklch(0.78 0.16 195 / 0.28)",
    elev1: "0 1px 0 0 oklch(1 0 0 / 0.04) inset, 0 1px 2px 0 oklch(0 0 0 / 0.4)",
    elev2: "0 1px 0 0 oklch(1 0 0 / 0.05) inset, 0 8px 24px -8px oklch(0 0 0 / 0.5)",
    elev3: "0 1px 0 0 oklch(1 0 0 / 0.06) inset, 0 16px 48px -12px oklch(0 0 0 / 0.6)",
  },

  // Layout containers — opinionated, not Tailwind defaults.
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
