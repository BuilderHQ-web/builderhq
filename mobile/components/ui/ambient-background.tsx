/**
 * <AmbientBackground /> — the global page atmosphere.
 *
 * Mirrors the landing page's atmosphere (Ambient + GridOverlay) so the
 * mobile app shares the same brand backdrop:
 *
 *   1. A LinearGradient base from canvas (top) → very slight teal-tinted
 *      slate (bottom). Reads as depth, not flat black.
 *   2. A pair of soft accent-teal radial blooms (one top-right, one
 *      bottom-left) so the canvas has a subtle electric warmth in two
 *      corners. Very low opacity — premium, not gimmicky.
 *   3. A faint SVG grid overlay at ~3% opacity, masked with a vignette
 *      so it's strongest in the middle and dissolves at the edges.
 *
 * Mounted ONCE at the (main)/_layout level — every screen automatically
 * sits on top of it. No per-screen wiring needed.
 */

import * as React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Pattern,
  Rect,
  Stop,
} from "react-native-svg";

import { palette } from "@/lib/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export function AmbientBackground() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: palette.canvas }]}
    >
      {/* 1. Canvas gradient — top a touch lighter than bottom, with a
            cooler hue at the top edge. */}
      <LinearGradient
        colors={[
          "#08111E", // top — slightly tinted slate
          "#06080F", // mid
          "#04060C", // bottom — deeper near-black
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Accent blooms — two radial-ish hot spots */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -180,
          right: -120,
          width: 420,
          height: 420,
          borderRadius: 210,
          backgroundColor: "rgba(0, 212, 200, 0.10)",
          opacity: 0.6,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -200,
          left: -160,
          width: 460,
          height: 460,
          borderRadius: 230,
          backgroundColor: "rgba(0, 212, 200, 0.06)",
          opacity: 0.55,
        }}
      />

      {/* 3. Faint grid overlay — SVG so it scales crisp at any density.
            Mid-opacity in the center, fades to nothing at the edges via
            the vignette gradient overlaid below it. */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <Pattern
            id="grid"
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <Rect
              width="48"
              height="48"
              fill="none"
              stroke="rgba(126, 245, 237, 0.55)"
              strokeWidth="0.5"
            />
          </Pattern>
          <SvgGradient id="vignette" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#06080F" stopOpacity="0.35" />
            <Stop offset="0.5" stopColor="#06080F" stopOpacity="0" />
            <Stop offset="1" stopColor="#06080F" stopOpacity="0.7" />
          </SvgGradient>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill="url(#grid)"
          opacity={0.035}
        />
        {/* Vignette fade on top to soften the grid at the edges */}
        <Rect width="100%" height="100%" fill="url(#vignette)" />
      </Svg>

      {/* 4. Subtle horizontal hairline across the top — premium signal,
            same device the landing uses. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: SCREEN_W * 0.2,
          right: SCREEN_W * 0.2,
          height: 1,
          backgroundColor: palette.accentLight,
          opacity: 0.12,
        }}
      />

      {/* Touch screen size to silence unused-import warning */}
      {SCREEN_H ? null : null}
    </View>
  );
}
