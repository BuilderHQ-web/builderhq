/**
 * <Frosted /> — a glass-style backdrop layer that survives both Expo
 * Go and dev / production builds.
 *
 * Why this exists: expo-blur's `<BlurView>` requires a matched
 * native-module version baked into the Expo Go runtime. Across SDK
 * jumps (or when `expo-blur` ships ahead of the Expo Go you have
 * installed) the JS side ends up requiring a view manager name that
 * isn't exported, and BlurView renders as an "Unimplemented
 * component" error block on top of every card. Painful for the
 * dev-loop, easy to dodge.
 *
 * Implementation strategy:
 *   · Always render a semi-transparent tinted View as the safe
 *     baseline. Combined with the canvas gradient sitting underneath
 *     and an inner top-edge highlight on the consumer, this reads as
 *     "frosted glass" to the eye even without true backdrop blur.
 *   · When/if we move to a dev-client build (`expo run:ios`) we can
 *     swap this back to a BlurView without changing any callsites.
 *
 * The point: never let BlurView's runtime fragility block the look.
 */
import { View, type ViewStyle, type StyleProp } from "react-native";

import { colors } from "@/lib/theme";

interface Props {
  /** Outer container style. Caller controls position + size. */
  style?: StyleProp<ViewStyle>;
  /** "default" = neutral white-glass tint.
   *  "accent"  = teal-tinted glass (used for active / focus states).
   *  "deep"    = darker tint for surfaces that need more contrast
   *              (the tab bar). */
  tint?: "default" | "accent" | "deep";
}

export function Frosted({ style, tint = "default" }: Props) {
  const bg =
    tint === "accent"
      ? colors.accentMuted
      : tint === "deep"
        ? "rgba(16, 22, 42, 0.78)"
        : "rgba(28, 36, 64, 0.55)";
  return <View pointerEvents="none" style={[{ backgroundColor: bg }, style]} />;
}
