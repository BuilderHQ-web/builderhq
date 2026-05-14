/**
 * <GridCanvas /> — page-level background.
 *
 * Recreates the website's signature canvas:
 *   1. Vertical LinearGradient (deep slate-navy → warmer slate at the
 *      bottom) — gives the canvas a quiet vertical depth.
 *   2. A faint blueprint-blue grid on top, mask-faded toward the
 *      edges so the eye reads it as texture, not lines. Rendered via
 *      react-native-svg (no perf overhead — single static element).
 *   3. A radial glow placed at top-right for a futuristic accent
 *      bloom — matches the brand teal so the energy feels coherent.
 *
 * Renders as `StyleSheet.absoluteFill` inside the parent. The (main)
 * layout drops one of these behind every tab so the texture is
 * uniform across the dashboard, browse, and detail surfaces.
 */
import { Dimensions, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Pattern,
  Rect,
  Stop,
  Path,
  G,
} from "react-native-svg";

import { colors } from "@/lib/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const GRID = 56;

export function GridCanvas() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Vertical canvas gradient */}
      <LinearGradient
        colors={[colors.bgDeep, colors.bg, colors.bgTint]}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Blueprint grid */}
      <Svg
        width={SCREEN_W}
        height={SCREEN_H}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <Pattern
            id="grid"
            x="0"
            y="0"
            width={GRID}
            height={GRID}
            patternUnits="userSpaceOnUse"
          >
            <Path
              d={`M ${GRID} 0 L 0 0 0 ${GRID}`}
              stroke="rgba(125, 245, 237, 0.045)"
              strokeWidth={0.6}
              fill="none"
            />
          </Pattern>
          <SvgLinearGradient id="mask" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity={0.0} />
            <Stop offset="0.15" stopColor="white" stopOpacity={0.65} />
            <Stop offset="0.7" stopColor="white" stopOpacity={0.65} />
            <Stop offset="1" stopColor="white" stopOpacity={0.0} />
          </SvgLinearGradient>
        </Defs>
        <G opacity={0.95}>
          <Rect width="100%" height="100%" fill="url(#grid)" />
        </G>
      </Svg>

      {/* 3. Top-right teal bloom — gentle futuristic accent */}
      <View
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 340,
          height: 340,
          borderRadius: 170,
          backgroundColor: "rgba(0, 212, 200, 0.10)",
          // Soft fade outward, mimicking a radial — RN doesn't ship
          // radial-gradient natively; this is a circle-clipped blur
          // approximation.
          opacity: 0.55,
        }}
      />
      {/* 4. Bottom-left blue bloom — pairs with the teal for the
              "energy" gradient hint without breaking the dark canvas. */}
      <View
        style={{
          position: "absolute",
          bottom: -160,
          left: -120,
          width: 380,
          height: 380,
          borderRadius: 190,
          backgroundColor: "rgba(59, 130, 246, 0.06)",
          opacity: 0.7,
        }}
      />
    </View>
  );
}
