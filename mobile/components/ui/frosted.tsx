/**
 * <Frosted /> — real native backdrop blur, the iOS Control-Center
 * / Apple-display-style frosted glass effect.
 *
 * Uses expo-blur's BlurView (now version-aligned with the Expo Go
 * SDK 54 runtime, so the native view manager mismatch that wiped out
 * the v2 redesign is gone). Layered on top, a hair of glass tint so
 * colour doesn't get washed out by the blur algorithm.
 *
 * `blurMethod="dimezisBlurView"` is the new API (replacing the
 * deprecated `experimentalBlurMethod`). On Android it picks the
 * RealtimeBlurView fork; on iOS the prop is a no-op (UIBlurEffect
 * does the work).
 *
 * Tints:
 *   · default — neutral white-glass tint over the blur.
 *   · accent  — teal-tinted, used on active / focused surfaces.
 *   · deep    — heavier dark tint for nav chrome (tab bar, header)
 *               so it reads as foreground rather than a peer to
 *               content cards.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

interface Props {
  style?: StyleProp<ViewStyle>;
  tint?: "default" | "accent" | "deep";
  /** Override the default intensity. 30–80 reads best on dark. */
  intensity?: number;
}

export function Frosted({ style, tint = "default", intensity }: Props) {
  const tintFill =
    tint === "accent"
      ? "rgba(0, 212, 200, 0.10)"
      : tint === "deep"
        ? "rgba(10, 13, 26, 0.65)"
        : "rgba(255, 255, 255, 0.05)";
  const blurIntensity =
    intensity ?? (tint === "deep" ? 60 : tint === "accent" ? 35 : 45);

  return (
    <View pointerEvents="none" style={[{ overflow: "hidden" }, style]}>
      <BlurView
        intensity={blurIntensity}
        tint="dark"
        // dimezisBlurView is the Android backend in expo-blur 15.x
        // (SDK 54). iOS ignores this prop and uses native UIBlurEffect.
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tintFill }]} />
    </View>
  );
}
