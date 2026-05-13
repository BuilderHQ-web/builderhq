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
        // Brand canvas — dark-only. Mirrors src/app/globals.css @theme block on web.
        bg: "#03090f",
        "bg-deep": "#060f19",
        "bg-raised": "#0c1726",
        "bg-elev": "#101e32",

        "surface-1": "#0c1726",
        "surface-2": "#142539",
        "surface-3": "#1c3046",
        "surface-hover": "#243a52",

        // Brand-tinted borders (blueprint-blue, not neutral grey)
        "border-subtle": "rgba(100, 180, 255, 0.06)",
        border: "rgba(100, 180, 255, 0.10)",
        "border-strong": "rgba(100, 180, 255, 0.18)",
        "border-accent": "rgba(0, 212, 200, 0.30)",
        "border-accent-strong": "rgba(0, 212, 200, 0.45)",

        // Text — premium screen-white
        text: "#eef6ff",
        "text-muted": "#98b8d0",
        "text-subtle": "rgba(238, 246, 255, 0.62)",
        "text-faint": "rgba(238, 246, 255, 0.42)",
        "text-dim": "#567080",
        "text-inverse": "#031118",

        // Accent — BuilderHQ teal
        accent: "#00d4c8",
        "accent-hover": "#6df0e8",
        "accent-active": "#4cd9d2",
        "accent-muted": "rgba(0, 212, 200, 0.14)",
        "accent-glow": "rgba(0, 212, 200, 0.35)",
        "accent-light": "#7ef5ed",
        "accent-contrast": "#031118",

        // Secondary brand blue
        blue: "#1a5fd4",
        "blue-glow": "rgba(26, 95, 212, 0.30)",

        // Semantic
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
        // Loaded in app/_layout.tsx via expo-font. SF / Roboto fallback
        // for boot frames before the custom faces hydrate.
        sans: ["DMSans_400Regular", "System"],
        ui: ["SpaceGrotesk_500Medium", "System"],
        display: ["BebasNeue_400Regular", "Impact", "System"],
        mono: ["JetBrainsMono_400Regular", "Menlo"],
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
