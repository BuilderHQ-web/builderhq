/**
 * <ScreenHeader /> — collapsible iOS-style top bar.
 *
 * The pattern every premium iOS app uses (Apple Mail, Messages,
 * Settings, Cluely): a small inline title that sits in the nav bar
 * area + a large title in the scroll content. As the user scrolls,
 * the large title fades out and the inline title fades in. The
 * transition feels native because we drive it from `scrollY` rather
 * than from a JS state change.
 *
 * Composition:
 *
 *   ┌───────────────────────────────────────────┐
 *   │  [back]   Title (small, fades in)   [···] │  ← floating header
 *   └───────────────────────────────────────────┘
 *
 *   ┌───────────────────────────────────────────┐
 *   │                                           │
 *   │  Title                                    │  ← large title that
 *   │  (large, fades out on scroll)             │     lives in the scroll
 *   │                                           │
 *   └───────────────────────────────────────────┘
 *
 * Use with <ScreenV4 variant="scroll" scrollY={shared}> and render
 * <ScreenHeader scrollY={shared} title="…"> at the top of the scroll
 * content (NOT outside it).
 */
import * as React from "react";
import { Text, View, type ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { Icon } from "@/lib/icons";
import { palette, type } from "@/lib/theme";

import { Press } from "./press";

interface Props {
  title: string;
  /** Shared scrollY emitted by ScreenV4. */
  scrollY: SharedValue<number>;
  /** Optional left action (defaults to back chevron if onBack supplied). */
  leading?: React.ReactNode;
  /** If supplied, shows the back chevron as leading. */
  onBack?: () => void;
  /** Right-aligned actions (icons, pills, etc.). */
  trailing?: React.ReactNode;
  /** Height at which the inline title is fully visible. Default 80. */
  collapseAt?: number;
  /** Height of the floating header bar. Default 56. */
  barHeight?: number;
  /** Vertical margin under the large title. Default 24. */
  largeTitleMarginBottom?: number;
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  scrollY,
  leading,
  onBack,
  trailing,
  collapseAt = 80,
  barHeight = 56,
  largeTitleMarginBottom = 24,
  style,
}: Props) {
  // Floating bar fades in as the large title scrolls under it.
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, collapseAt * 0.5, collapseAt],
      [0, 0, 1],
      "clamp",
    ),
  }));

  // Large title fades + translates as we scroll.
  const largeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, collapseAt], [1, 0], "clamp"),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, collapseAt],
          [0, -12],
          "clamp",
        ),
      },
    ],
  }));

  const leadingNode =
    leading ??
    (onBack ? (
      <Press
        onPress={onBack}
        haptic="soft"
        accessibilityLabel="Back"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.hairline,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon.ChevronRight
          size={20}
          color={palette.text}
          style={{ transform: [{ rotate: "180deg" }] }}
        />
      </Press>
    ) : null);

  return (
    <View style={style}>
      {/* Floating bar — absolutely positioned so it sits flush at top */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: barHeight,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10,
            backgroundColor: palette.canvas,
            borderBottomWidth: 0.5,
            borderBottomColor: palette.hairline,
          },
          barStyle,
        ]}
      >
        <View style={{ width: 60, alignItems: "flex-start" }}>
          {leadingNode}
        </View>
        <Text
          numberOfLines={1}
          style={{
            ...type.titleSmall,
            color: palette.text,
            fontWeight: "600",
            flex: 1,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <View style={{ width: 60, alignItems: "flex-end" }}>
          {trailing}
        </View>
      </Animated.View>

      {/* Large title — lives in the scroll content */}
      <View
        style={{
          paddingTop: barHeight + 8,
          paddingBottom: largeTitleMarginBottom,
        }}
      >
        {/* The leading action (back / etc.) also lives here while
            the large title is visible — it stays in place; the
            floating bar takes over once we scroll. */}
        {leadingNode ? (
          <View style={{ marginBottom: 16 }}>{leadingNode}</View>
        ) : null}
        <Animated.Text
          style={[
            {
              ...type.titleLarge,
              color: palette.text,
              fontWeight: "600",
            },
            largeStyle,
          ]}
        >
          {title}
        </Animated.Text>
      </View>
    </View>
  );
}
