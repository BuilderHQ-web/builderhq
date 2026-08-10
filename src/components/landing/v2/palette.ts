/**
 * The marketing surface runs on ONE brand hue.
 *
 * The four-lens role palette (teal / steel / amber / violet) retired
 * with the role morph: four hues read as four brands, and every large
 * platform we benchmarked against carries one. What remains is the
 * teal pair from globals.css, in the two roles the design system
 * allows:
 *
 *   accent      #00d4c8  FILL ONLY. As type on cream it measures
 *                        1.65:1 and fails; it must always carry
 *                        --color-accent-contrast ink on top.
 *   accentSoft  #0a7d73  The ink. Teal as type is always this.
 *
 * Consumers that used to pick a hue per role (the partner modal, the
 * partner register) now take this and stay on brand.
 */
export const BRAND = {
  accent: "#00d4c8",
  accentSoft: "#0a7d73",
  /** Ambient bloom behind avatars and mastheads. Alpha, never type. */
  glow1: "rgba(0,212,200,0.20)",
} as const;

export type BrandHue = typeof BRAND;
