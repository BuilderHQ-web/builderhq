/** @type {import('tailwindcss').Config} */
// NativeWind v4 + Tailwind v3 — keep these in lockstep with the web app's
// design tokens in apps/web/src/app/globals.css. When a token changes
// over there, mirror it here so the brand stays unified across platforms.
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── v4 PALETTE — strict 13-color premium system ───────────────
        //
        // The single source of truth for the BuilderHQ mobile rebuild.
        // Keep in lockstep with `lib/theme.ts` palette. Three depths,
        // two border tones, three text tones, four accent shades,
        // three semantic. That's the system — anything outside it has
        // drifted from the brand.
        canvas: "#06080F",
        surface: "#0E131F",
        "surface-elev": "#141A2A",

        hairline: "rgba(255, 255, 255, 0.06)",
        "hairline-strong": "rgba(255, 255, 255, 0.12)",
        "hairline-accent": "rgba(0, 212, 200, 0.30)",

        // v4 accent — same teal, sharper naming
        "accent-4": "#00D4C8",
        "accent-4-light": "#7EF5ED",
        "accent-4-muted": "rgba(0, 212, 200, 0.08)",
        "accent-4-glow": "rgba(0, 212, 200, 0.40)",
        "accent-4-contrast": "#031118",

        // v4 text — three tones, full stop
        "text-4": "#F5F7FF",
        "text-4-muted": "#8E9BB8",
        "text-4-dim": "#5A6789",

        // v4 semantic — tuned to harmonize with the teal accent
        "success-4": "#5EEAD4",
        "success-4-muted": "rgba(94, 234, 212, 0.10)",
        "warning-4": "#FBBF24",
        "warning-4-muted": "rgba(251, 191, 36, 0.10)",
        "danger-4": "#FB7185",
        "danger-4-muted": "rgba(251, 113, 133, 0.10)",

        // ── LEGACY v2/v3 — kept until every screen is ported ─────────
        //
        // Browse, messages, project detail, and tender flow still
        // import these. Phase 3 of the rebuild sweeps them. When all
        // legacy references are gone this block deletes wholesale.
        // ── Dark canvas (v2 — warmer, deeper, gradient-friendly) ──────
        //
        // The base sits between Starlink's near-black and Revolut's
        // slate-purple — a deep navy with a hair of warmth so the
        // teal/blue accents pop instead of disappearing. App _layout
        // pairs this token with a top-to-bottom LinearGradient so the
        // bg gently shifts hue as the eye travels.
        bg: "#0a0d1a",
        "bg-deep": "#06080f",
        "bg-tint": "#10162a", // lower stop of the page gradient
        "bg-raised": "#141a2e",
        "bg-elev": "#1a2240",

        // ── Glass surfaces (paired with <BlurView intensity={60-80} />) ──
        // The rgba values are read by Glass primitives and StyleSheet
        // entries — Tailwind drops these into inline styles at build.
        "glass-1": "rgba(255, 255, 255, 0.04)",
        "glass-2": "rgba(255, 255, 255, 0.07)",
        "glass-3": "rgba(255, 255, 255, 0.10)",
        "glass-edge": "rgba(255, 255, 255, 0.14)", // top-inner highlight

        // ── Borders — neutral white-tinged so glass reads premium ──
        "border-subtle": "rgba(255, 255, 255, 0.06)",
        border: "rgba(255, 255, 255, 0.10)",
        "border-strong": "rgba(255, 255, 255, 0.18)",
        "border-accent": "rgba(0, 212, 200, 0.40)",
        "border-accent-strong": "rgba(0, 212, 200, 0.65)",
        "border-blue": "rgba(76, 144, 255, 0.40)",

        // ── Text ──
        text: "#f5f7ff",
        "text-muted": "#a8b3cf",
        "text-subtle": "rgba(245, 247, 255, 0.62)",
        "text-faint": "rgba(245, 247, 255, 0.42)",
        "text-dim": "#697296",
        "text-inverse": "#06080f",

        // ── Accent — teal stays as the primary brand mark, but the
        // light/glow stops are tuned brighter for the new canvas.
        accent: "#00d4c8",
        "accent-hover": "#22e3d8",
        "accent-active": "#00b9ae",
        "accent-muted": "rgba(0, 212, 200, 0.16)",
        "accent-glow": "rgba(0, 212, 200, 0.45)",
        "accent-light": "#7df5ed",
        "accent-contrast": "#031118",

        // ── Secondary brand — vibrant blue ──
        // The website's brand blue is `#1a5fd4`; the mobile palette
        // ships a brighter complement (#3b82f6) for energy, plus a
        // light stop for highlight states. Paired with teal in the
        // gradient system to feel alive.
        blue: "#3b82f6",
        "blue-hover": "#5d97f8",
        "blue-light": "#7eb1ff",
        "blue-glow": "rgba(59, 130, 246, 0.40)",
        "blue-muted": "rgba(59, 130, 246, 0.16)",

        // ── Hero gradient stops (for LinearGradient props) ──
        "grad-from": "#00d4c8",
        "grad-via": "#1ea3f0",
        "grad-to": "#3b82f6",

        // ── Semantic ──
        success: "#86efac",
        "success-muted": "rgba(134, 239, 172, 0.14)",
        warning: "#fbb840",
        "warning-muted": "rgba(255, 180, 0, 0.14)",
        danger: "#ff7a8a",
        "danger-muted": "rgba(255, 122, 138, 0.14)",
        info: "#7dd3fc",
        "info-muted": "rgba(125, 211, 252, 0.14)",
      },
      fontFamily: {
        // ── v4 — two faces, optical-size aware ──────────────────────
        //
        // Display: Instrument Serif — the landing's voice carried into
        // mobile. Loaded in app/_layout.tsx. Used in italic form only,
        // and only on screen titles (via the accent-italic device).
        //
        // System: SF Pro on iOS, Roboto on Android. No JS load needed
        // — the OS supplies it. Premium native rendering for free,
        // with perfect optical sizing at every weight + true tabular
        // nums for prices.
        serif: ["InstrumentSerif_400Regular", "serif"],
        "serif-italic": ["InstrumentSerif_400Regular_Italic", "serif"],

        // ── LEGACY v2/v3 fonts — kept for un-ported screens. These
        //    never actually loaded in the old app (no useFonts call
        //    existed), so they silently fell back to System. We keep
        //    the names so legacy screens don't crash; they'll continue
        //    to render in System until each is ported to v4.
        sans: ["System"],
        ui: ["System"],
        display: ["System"],
        mono: ["System"],
      },
      borderRadius: {
        tight: "3px",
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
    },
  },
  plugins: [],
};
