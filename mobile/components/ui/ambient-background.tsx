/**
 * <AmbientBackground /> — the global page atmosphere.
 *
 * Mirrors the landing page's atmosphere:
 *
 *   1. LinearGradient base — top a touch lighter & cooler than bottom.
 *   2. Two soft RADIAL GRADIENT blooms (one top-right, one bottom-left)
 *      that fade smoothly to transparent — no visible disk edges.
 *      Implementation v2: previous version used solid-colored View
 *      circles with hard borderRadius edges that read as actual shapes.
 *      v2 uses react-native-svg's <RadialGradient> so the bloom is a
 *      true radial fade — center has color, edge fades to nothing.
 *   3. Faint 3% SVG grid overlay with a vignette mask.
 *
 * Mounted ONCE at the (main)/_layout level; every screen sits on top.
 */

import * as React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { palette } from "@/lib/theme";

export function AmbientBackground() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: palette.canvas }]}
    >
      {/* 1. Vertical canvas gradient */}
      <LinearGradient
        colors={["#08111E", "#06080F", "#04060C"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Soft radial blooms — proper SVG radial gradients, fade
            smoothly to transparent so they read as light, not shapes. */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          {/* Top-right bloom — light "leaks in" from the top-right corner */}
          <RadialGradient
            id="bloomTopRight"
            cx="95%"
            cy="0%"
            r="80%"
            fx="95%"
            fy="0%"
          >
            <Stop offset="0" stopColor="#00D4C8" stopOpacity="0.18" />
            <Stop offset="0.35" stopColor="#00D4C8" stopOpacity="0.05" />
            <Stop offset="1" stopColor="#00D4C8" stopOpacity="0" />
          </RadialGradient>

          {/* Bottom-left bloom — quieter counterweight */}
          <RadialGradient
            id="bloomBottomLeft"
            cx="5%"
            cy="100%"
            r="75%"
            fx="5%"
            fy="100%"
          >
            <Stop offset="0" stopColor="#00D4C8" stopOpacity="0.10" />
            <Stop offset="0.35" stopColor="#00D4C8" stopOpacity="0.03" />
            <Stop offset="1" stopColor="#00D4C8" stopOpacity="0" />
          </RadialGradient>

          {/* Faint grid pattern */}
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

          {/* Vignette over the grid */}
          <SvgLinearGradient
            id="vignette"
            x1="0.5"
            y1="0"
            x2="0.5"
            y2="1"
          >
            <Stop offset="0" stopColor="#06080F" stopOpacity="0.35" />
            <Stop offset="0.5" stopColor="#06080F" stopOpacity="0" />
            <Stop offset="1" stopColor="#06080F" stopOpacity="0.7" />
          </SvgLinearGradient>
        </Defs>

        {/* Layer order: blooms underneath, grid on top, vignette on top */}
        <Rect width="100%" height="100%" fill="url(#bloomTopRight)" />
        <Rect width="100%" height="100%" fill="url(#bloomBottomLeft)" />
        <Rect
          width="100%"
          height="100%"
          fill="url(#grid)"
          opacity={0.035}
        />
        <Rect width="100%" height="100%" fill="url(#vignette)" />
      </Svg>
    </View>
  );
}
