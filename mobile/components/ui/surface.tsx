/**
 * <Surface /> — the ONE card primitive.
 *
 * The v4 system uses exactly one card surface: solid #0E131F panel with
 * a hairline border. No glass. No gradient backgrounds. No drop shadows
 * by default. Premium feel comes from the surface choice, the border
 * tone, and the negative space around it — NOT from layering effects.
 *
 * Variants:
 *   · `default`  — the standard solid panel
 *   · `elevated` — slightly lifted surface (#141A2A) — for the active /
 *                  selected state of a list, NEVER for static decoration
 *   · `accent`   — accent-tinted background + accent border, for the
 *                  "best value" tender or the "you're matched" project.
 *                  Use VERY sparingly; one per screen at most.
 *   · `quiet`    — no border, just the surface — used inside list rows
 *                  where the outer Row already provides separation
 *
 * Press behavior:
 *   Wrap with <Press> if you want haptic + scale. Surface doesn't
 *   auto-press because some surfaces are static content blocks.
 */
import * as React from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";

import { palette, radii4 } from "@/lib/theme";

type Variant = "default" | "elevated" | "accent" | "quiet";

interface Props extends ViewProps {
  variant?: Variant;
  /** Padding inside the surface. Defaults vary by variant — see code. */
  padding?: number;
  /** Border radius. Defaults to radii4.md (14). */
  radius?: number;
  /** Add a subtle top hairline accent (the landing's signature device).
   *  Use SPARINGLY — once per surface stack at most. */
  hairline?: boolean;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function Surface({
  variant = "default",
  padding,
  radius = radii4.md,
  hairline = false,
  style,
  children,
  ...rest
}: Props) {
  const bg = backgroundFor(variant);
  const borderColor = borderFor(variant);
  const resolvedPadding = padding ?? defaultPadding(variant);

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius,
          padding: resolvedPadding,
          borderWidth: variant === "quiet" ? 0 : 1,
          borderColor,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {hairline ? <HairlineAccent /> : null}
      {children}
    </View>
  );
}

function backgroundFor(variant: Variant): string {
  switch (variant) {
    case "default":
      return palette.surface;
    case "elevated":
      return palette.surfaceElev;
    case "accent":
      return palette.accentMuted;
    case "quiet":
      return "transparent";
  }
}

function borderFor(variant: Variant): string {
  switch (variant) {
    case "default":
      return palette.hairline;
    case "elevated":
      return palette.hairlineStrong;
    case "accent":
      return palette.hairlineAccent;
    case "quiet":
      return "transparent";
  }
}

function defaultPadding(variant: Variant): number {
  switch (variant) {
    case "default":
    case "elevated":
    case "accent":
      return 20;
    case "quiet":
      return 0;
  }
}

/**
 * Top hairline accent — a 1px line that tapers from transparent →
 * accent → transparent across the top of a surface. The landing
 * uses the same device on its deck cards; this carries the signal
 * to mobile.
 */
function HairlineAccent() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 32,
        right: 32,
        height: 1,
        backgroundColor: palette.accentLight,
        opacity: 0.6,
      }}
    />
  );
}
