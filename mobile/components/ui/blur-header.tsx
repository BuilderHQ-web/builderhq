/**
 * <BlurHeader /> — a frosted-glass top bar that crossfades from
 * transparent to solid as the user scrolls.
 *
 * Two pieces:
 *   1. A backing layer (BlurView + tint) whose opacity is driven by
 *      a scroll-derived SharedValue. Past 60px the layer is fully
 *      opaque, so the content beneath the header reads cleanly.
 *   2. The top-bar content (back button + optional center title +
 *      optional right slot). The title style accepts an animated
 *      value so consumers can crossfade between a large hero title
 *      and a compact bar title.
 *
 * Used standalone on detail / tender screens, and as the page
 * eyebrow on tab roots (where the back button is hidden).
 */
import { type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { ArrowLeft } from "lucide-react-native";

import { colors } from "@/lib/theme";

const BAR_HEIGHT = 52;

interface Props {
  onBack?: () => void;
  /** Right-aligned slot — usually an action glyph (filter, edit, …). */
  right?: ReactNode;
  /** When true, the back chevron is hidden (used on tab roots). */
  hideBack?: boolean;
  /** Driven by the scrollY of the screen — useAnimatedStyle return.
   *  We accept the loose ViewStyle type here so callers don't have to
   *  thread the exact Reanimated style union; the underlying
   *  Animated.View accepts both. */
  backdropStyle?: ViewStyle;
  /** Center content. Usually wrapped in its own animated style to fade
   *  in once the user scrolls past the hero. */
  centerSlot?: ReactNode;
}

export function BlurHeader({
  onBack,
  right,
  hideBack,
  backdropStyle,
  centerSlot,
}: Props) {
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      {/* Backdrop — animated opacity */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { overflow: "hidden" },
          backdropStyle,
        ]}
      >
        <BlurView
          intensity={Platform.OS === "ios" ? 70 : 90}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10, 13, 26, 0.55)" }]}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: colors.borderSubtle,
          }}
        />
      </Animated.View>

      {/* Bar contents */}
      <SafeAreaView edges={["top"]}>
        <View
          style={{
            height: BAR_HEIGHT,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 8,
          }}
        >
          {!hideBack && onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
              }}
            >
              <ArrowLeft size={20} color={colors.text} strokeWidth={1.8} />
            </Pressable>
          ) : (
            <View style={{ width: 40, height: 40 }} />
          )}

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 56,
              right: 56,
              top: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {centerSlot}
          </View>

          <View style={{ flex: 1 }} />

          {right ?? <View style={{ width: 40, height: 40 }} />}
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Re-export of the canonical bar height so consumers can offset
 *  their first-frame content (otherwise it gets covered by the
 *  initially-transparent header). */
export const HEADER_HEIGHT = BAR_HEIGHT;

/** Convenience: a centered "kicker · title" stack ready to drop into
 *  centerSlot. */
export function HeaderTitle({
  kicker,
  title,
}: {
  kicker?: string;
  title: string;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      {kicker ? (
        <Text
          style={{
            color: colors.textFaint,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 9.5,
            letterSpacing: 2.4,
            textTransform: "uppercase",
            fontWeight: "600",
          }}
        >
          {kicker}
        </Text>
      ) : null}
      <Text
        style={{
          color: colors.text,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14.5,
          fontWeight: "600",
        }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}
