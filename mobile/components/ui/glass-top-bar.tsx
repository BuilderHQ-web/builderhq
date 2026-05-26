/**
 * <GlassTopBar /> — sticky persistent chrome.
 *
 * Layout: title on the LEFT, avatar on the RIGHT. No center slot.
 * No bell. Title is slightly bolder than body text — it's the page ID.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  Home                              (avatar)  │  ← glass
 *   └──────────────────────────────────────────────┘
 *
 * Scroll-aware visibility: when `scrollY` is wired in, the bar is
 * INVISIBLE at scroll 0 (the hero content owns the top of the screen
 * un-occluded) and fades in as the user scrolls past ~20px. Once the
 * page is scrolled, the bar floats over content, glass-blurred.
 *
 * If `scrollY` is omitted, the bar is always visible — used by static
 * (non-scroll) screens.
 */

import * as React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette, type } from "@/lib/theme";

export const TOP_BAR_HEIGHT = 52;
export const TOP_BAR_BELOW_HEIGHT = 64;

/**
 * Reserved height for the floating top bar overlay.
 *
 *   useTopBarHeight()            → just the title row (insets.top + 52)
 *   useTopBarHeight({below: true}) → adds the search/filter row (+64)
 */
export function useTopBarHeight(opts?: { below?: boolean }): number {
  const insets = useSafeAreaInsets();
  return insets.top + TOP_BAR_HEIGHT + (opts?.below ? TOP_BAR_BELOW_HEIGHT : 0);
}

interface Props {
  /** Page title. Left-aligned when no `leading`; centered when `leading`
   *  is supplied (drill-in screens with a back button). */
  title: string;
  /** Optional left slot — typically a back button on drill-in screens.
   *  When present, the title shifts to centered alignment. */
  leading?: React.ReactNode;
  /** Right slot — typically <AvatarV4 size={32} /> or an action icon. */
  trailing?: React.ReactNode;
  /** Optional second-row content rendered BELOW the title row inside
   *  the same glass surface. Typically a search bar + filter button.
   *  When supplied, the bar's total height grows by `belowBarHeight`
   *  (default 64) so the consumer can reserve the right top padding
   *  via `useTopBarHeight(belowBarHeight)`. */
  belowBar?: React.ReactNode;
  /** Reserved height for the belowBar row. Default 64. */
  belowBarHeight?: number;
  /** Shared scrollY value. When provided, the bar fades in as the user
   *  scrolls past `revealAt`. When absent, the bar is always visible. */
  scrollY?: SharedValue<number>;
  /** Scroll Y at which the bar reaches full opacity. Default 60. */
  revealAt?: number;
}

export function GlassTopBar({
  title,
  leading,
  trailing,
  belowBar,
  belowBarHeight = TOP_BAR_BELOW_HEIGHT,
  scrollY,
  revealAt = 60,
}: Props) {
  const insets = useSafeAreaInsets();
  const totalHeight =
    insets.top + TOP_BAR_HEIGHT + (belowBar ? belowBarHeight : 0);

  const animStyle = useAnimatedStyle(() => {
    if (!scrollY) {
      return { opacity: 1 };
    }
    return {
      opacity: interpolate(
        scrollY.value,
        [0, revealAt * 0.35, revealAt],
        [0, 0, 1],
        "clamp",
      ),
    };
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: totalHeight,
          zIndex: 50,
        },
        animStyle,
      ]}
    >
      {/* Native blur — Revolut-style glass. */}
      <BlurView
        intensity={Platform.OS === "ios" ? 70 : 100}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(6, 8, 15, 0.55)" },
        ]}
      />
      {/* No hard hairline divider — the bar dissolves into the page
          via blur + tint, no horizontal line. */}

      {/* Stacked layout: title row at top, optional belowBar (search etc.)
          underneath, both inside the same blurred glass surface. */}
      <View
        pointerEvents="box-none"
        style={{
          paddingTop: insets.top,
          height: totalHeight,
        }}
      >
        <View
          pointerEvents="box-none"
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            height: TOP_BAR_HEIGHT,
          }}
        >
          {leading ? (
            // Drill-in mode — leading on left, title centered, trailing right
            <>
              <View style={{ width: 56, alignItems: "flex-start" }}>
                {leading}
              </View>
              <View
                pointerEvents="none"
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    ...type.title,
                    color: palette.text,
                    fontWeight: "700",
                    letterSpacing: -0.3,
                    fontSize: 17,
                  }}
                >
                  {title}
                </Text>
              </View>
              <View style={{ width: 56, alignItems: "flex-end" }}>
                {trailing}
              </View>
            </>
          ) : (
            // Tab-root mode — title LEFT, trailing RIGHT, no center
            <>
              <Text
                numberOfLines={1}
                style={{
                  ...type.title,
                  color: palette.text,
                  fontWeight: "700",
                  letterSpacing: -0.3,
                  fontSize: 22,
                  flex: 1,
                }}
              >
                {title}
              </Text>
              <View style={{ alignItems: "flex-end" }}>{trailing}</View>
            </>
          )}
        </View>

        {/* Second row — search, filters, tabs, etc. Lives inside the
            same glass-blurred surface so it reads as part of the
            header chrome, not a separate floating element. */}
        {belowBar ? (
          <View
            pointerEvents="box-none"
            style={{
              height: belowBarHeight,
              paddingHorizontal: 14,
              justifyContent: "center",
            }}
          >
            {belowBar}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
