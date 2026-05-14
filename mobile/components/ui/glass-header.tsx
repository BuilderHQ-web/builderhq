/**
 * <GlassHeader /> — the floating, atmospheric top bar.
 *
 * Pattern (matches Revolut / Apple App Store / iOS native):
 *   · Position absolute on top. Content scrolls *under* it.
 *   · Extends from `y=0` (behind the iOS status bar) down through
 *     the content area — no top safe-area gap, no hard rectangle.
 *   · Layered visuals: real BlurView backdrop + a vertical gradient
 *     overlay that goes from `dark-tint at the top` → `transparent at
 *     the bottom`. So the header dissolves into the page rather than
 *     ending at a sharp horizontal edge.
 *   · Left = avatar, centre = greeting copy, right = optional action.
 *
 * Implementation notes:
 *   · We DO NOT add a 1px border or hairline at the bottom. The
 *     atmospheric fade IS the visual separator.
 *   · The blur intensity is moderate (55) so it reads as glass, not
 *     as a frosted slab.
 *   · Status-bar height is added to the top padding so visible content
 *     starts BELOW the status bar text, even though the glass itself
 *     extends all the way up.
 *
 * Used by every authenticated tab root. Pair with
 *   <ScrollView contentContainerStyle={{ paddingTop: GLASS_HEADER_HEIGHT }}>
 * so first-frame content isn't hidden under the absolute-positioned
 * header.
 */
import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/lib/theme";

/** Total header height *excluding* status-bar inset. Add the inset on
 *  the screen side to know the absolute height of the header overlay. */
export const GLASS_HEADER_CONTENT_HEIGHT = 58;
/** Bottom fade region — the soft gradient that dissolves the header
 *  into the page. Bumped out of the bar so content stays readable as
 *  it scrolls into view at the bottom of the header. */
export const GLASS_HEADER_FADE_HEIGHT = 22;

/**
 * Convenience to compute the total scroll-content padding-top the
 * consuming screen needs. Adds top safe area + the fixed content
 * height. The fade region overlaps with the first ~22px of content,
 * which is intentional — content gently fades in as it enters view.
 */
export function useGlassHeaderHeight(): number {
  const insets = useSafeAreaInsets();
  return insets.top + GLASS_HEADER_CONTENT_HEIGHT;
}

interface Props {
  /** Left-side slot. Typically the <Avatar />. */
  left?: ReactNode;
  /** Centre slot — greeting copy / title / kicker. */
  center?: ReactNode;
  /** Right-side action slot. Optional. */
  right?: ReactNode;
}

export function GlassHeader({ left, center, right }: Props) {
  const insets = useSafeAreaInsets();
  const totalHeight =
    insets.top + GLASS_HEADER_CONTENT_HEIGHT + GLASS_HEADER_FADE_HEIGHT;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: totalHeight,
        zIndex: 50,
      }}
    >
      {/* 1. Native backdrop blur covers the full header zone — content
              passing under gets blurred. */}
      <BlurView
        intensity={55}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Vertical tint gradient — opaque navy at top, fading to
              transparent at the bottom. This is the "no hard line" trick
              — the bottom of the header dissolves into the page instead
              of stopping at a rectangle edge. */}
      <LinearGradient
        colors={[
          "rgba(7, 13, 24, 0.92)",
          "rgba(7, 13, 24, 0.78)",
          "rgba(7, 13, 24, 0.55)",
          "rgba(7, 13, 24, 0.20)",
          "rgba(7, 13, 24, 0)",
        ]}
        locations={[0, 0.55, 0.78, 0.92, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 3. Bar content — pinned below the status bar, sits inside the
              solid-tint upper portion of the gradient. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: insets.top + 4,
          paddingHorizontal: 16,
          height: insets.top + GLASS_HEADER_CONTENT_HEIGHT,
        }}
        pointerEvents="box-none"
      >
        <View style={{ width: 40, alignItems: "flex-start" }}>{left}</View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
          pointerEvents="none"
        >
          {center}
        </View>
        <View style={{ width: 40, alignItems: "flex-end" }}>{right}</View>
      </View>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _quiet = colors;
