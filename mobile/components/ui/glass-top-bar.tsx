/**
 * <GlassTopBar /> — the v4 persistent sticky top bar.
 *
 * Revolut / Linear / Cluely pattern: a single compact glass bar pinned
 * to the top of every screen. Page identity (title) lives IN the bar
 * — no big in-scroll display title competing with content.
 *
 * Composition:
 *
 *   ┌───────────────────────────────────────────────────┐
 *   │  [avatar]      Page title              [action]   │  ← glass blur
 *   └───────────────────────────────────────────────────┘
 *
 *   ┌───────────────────────────────────────────────────┐
 *   │                                                   │
 *   │   Screen content scrolls under the bar            │
 *   │                                                   │
 *
 * Why glass:
 *   The native BlurView blurs whatever passes under it. The bar reads
 *   as a layer above the content, not a docked rectangle. Matches the
 *   Revolut chrome the user pointed at as reference.
 *
 * Used by every screen in the (main) group. Pair with
 *   <Screen … topInset> to reserve top padding for the bar.
 */
import * as React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette, type } from "@/lib/theme";

/** Bar height EXCLUDING the safe-area inset. */
export const TOP_BAR_HEIGHT = 52;

/** Total reserved height for the bar overlay — use as top padding
 *  on the screen's scroll content so first-frame content isn't
 *  hidden under the absolutely positioned bar. */
export function useTopBarHeight(): number {
  const insets = useSafeAreaInsets();
  return insets.top + TOP_BAR_HEIGHT;
}

interface Props {
  /** Page title rendered centred in the bar. */
  title: string;
  /** Left slot — typically <AvatarV4 size={32} />. */
  leading?: React.ReactNode;
  /** Right slot — typically a bell, settings cog, or pill. */
  trailing?: React.ReactNode;
}

export function GlassTopBar({ title, leading, trailing }: Props) {
  const insets = useSafeAreaInsets();
  const totalHeight = insets.top + TOP_BAR_HEIGHT;

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
      {/* Native backdrop blur — Revolut-style glass. Content scrolling
          under the bar gets properly blurred. */}
      <BlurView
        intensity={Platform.OS === "ios" ? 70 : 100}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {/* Dark tint so foreground text stays at high contrast on bright
          content scrolling underneath. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(6, 8, 15, 0.55)" },
        ]}
      />
      {/* Bottom hairline divider — kept very subtle. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: palette.hairline,
        }}
      />

      {/* Bar contents — centred title + slots */}
      <View
        pointerEvents="box-none"
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: insets.top,
          paddingHorizontal: 16,
          height: totalHeight,
        }}
      >
        <View
          style={{
            width: 60,
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
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
              ...type.titleSmall,
              color: palette.text,
              fontWeight: "600",
              letterSpacing: -0.1,
            }}
          >
            {title}
          </Text>
        </View>
        <View
          style={{
            width: 60,
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {trailing}
        </View>
      </View>
    </View>
  );
}
