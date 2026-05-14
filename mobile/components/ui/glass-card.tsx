/**
 * <GlassCard /> — the foundation surface for v2.
 *
 * A frosted card composed of three layers:
 *   1. BlurView (expo-blur) — native backdrop blur for iOS / Android.
 *   2. A thin gradient tint on top of the blur so colour doesn't get
 *      washed out by the system blur algorithm.
 *   3. Optional 1px highlight border on the inner top edge — the
 *      single design touch that makes the card read as "glass" vs
 *      "translucent card".
 *
 * Variants:
 *   · `default`   — neutral white glass (most common).
 *   · `accent`    — teal-tinted glass, used for active / highlight
 *                   states (active tab, primary card on hero rows).
 *   · `gradient`  — accepts a `gradientColors` prop and renders the
 *                   gradient directly on the card surface; the blur
 *                   layer is dimmed to let the colour do the work.
 *
 * Cards are press-aware via the optional `onPress`. When pressed the
 * card scales to 0.985 via a Reanimated spring — UI-thread worklet so
 * it stays smooth under load.
 */
import { useCallback } from "react";
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { colors } from "@/lib/theme";

type Variant = "default" | "accent" | "gradient";

interface GlassCardProps extends Omit<PressableProps, "style"> {
  variant?: Variant;
  /** Used only when variant="gradient". */
  gradientColors?: readonly [string, string, ...string[]];
  /** Outer container style. */
  style?: ViewStyle;
  /** Inner content padding. Defaults to 16. */
  padding?: number;
  /** Corner radius. Defaults to 20. */
  radius?: number;
  /** Blur intensity (iOS 0–100). Defaults to 40 for default/accent,
   *  reduced for gradient. */
  intensity?: number;
  /** Disable the press-scale animation (still allows onPress). */
  noPressAnim?: boolean;
  children: React.ReactNode;
}

export function GlassCard({
  variant = "default",
  gradientColors,
  style,
  padding = 16,
  radius = 20,
  intensity,
  noPressAnim = false,
  onPress,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: GlassCardProps) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pressIn = useCallback(
    (e: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) => {
      if (!noPressAnim && onPress) {
        scale.value = withSpring(0.985, { mass: 0.35, damping: 18 });
      }
      onPressIn?.(e);
    },
    [scale, noPressAnim, onPress, onPressIn],
  );
  const pressOut = useCallback(
    (e: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) => {
      if (!noPressAnim && onPress) {
        scale.value = withSpring(1, { mass: 0.35, damping: 16 });
      }
      onPressOut?.(e);
    },
    [scale, noPressAnim, onPress, onPressOut],
  );

  const blurIntensity =
    intensity ?? (variant === "gradient" ? 20 : 40);
  const tintFill =
    variant === "accent"
      ? colors.accentMuted
      : variant === "gradient"
        ? "transparent"
        : colors.glass1;

  const inner = (
    <Animated.View style={[anim]}>
      <View style={[{ borderRadius: radius, overflow: "hidden" }, style]}>
        {variant === "gradient" && gradientColors ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tintFill }]} />
        {/* Inner top-edge highlight — the "glass" tell. 1px white
            top border catches the device tilt and reads as a polished
            piece of frosted glass rather than a flat translucent box. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: colors.glassEdge,
          }}
        />
        <View
          style={{
            padding,
            borderWidth: 1,
            borderColor:
              variant === "accent"
                ? colors.borderAccent
                : variant === "gradient"
                  ? "rgba(255, 255, 255, 0.18)"
                  : colors.border,
            borderRadius: radius,
          }}
        >
          {children}
        </View>
      </View>
    </Animated.View>
  );

  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      {...rest}
    >
      {inner}
    </Pressable>
  );
}
