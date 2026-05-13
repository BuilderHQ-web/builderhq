/**
 * Loading skeletons for the dashboard.
 *
 * Why skeletons and not a spinner: a centred ActivityIndicator is the
 * least-considered loading UI an app can ship. It tells the user
 * "wait" but gives no read on what's coming. Skeletons in the SHAPE
 * of the final layout shorten perceived wait time — the eye locks in
 * structure before pixels resolve, and the swap to real content feels
 * instant rather than abrupt.
 *
 * Animation: a single shared shimmer keyframe drives every block via
 * Reanimated's `useSharedValue` on the UI thread, so the shimmer is
 * smooth even while the JS thread is busy hydrating real data.
 */
import { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/** A single shimmering block. Pass width/height via className or style. */
export function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: ViewStyle;
}) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={`bg-surface-1/70 rounded-md ${className ?? ""}`}
      style={[animatedStyle, style]}
    />
  );
}

/** Dashboard-shaped skeleton — matches the final layout so the swap is
 *  imperceptible. Eyebrow, headline, stat row (4 tiles), section header,
 *  3 project cards, section header, 4 activity rows. */
export function DashboardSkeleton() {
  return (
    <View className="px-6 pt-4">
      {/* Eyebrow */}
      <SkeletonBlock className="h-3 w-24" />
      {/* Hero headline */}
      <SkeletonBlock className="h-12 w-64 mt-4" />
      {/* Sub */}
      <SkeletonBlock className="h-4 w-48 mt-3" />

      {/* Stat row */}
      <View className="flex-row gap-3 mt-8">
        <SkeletonBlock className="flex-1 h-24" />
        <SkeletonBlock className="flex-1 h-24" />
      </View>
      <View className="flex-row gap-3 mt-3">
        <SkeletonBlock className="flex-1 h-24" />
        <SkeletonBlock className="flex-1 h-24" />
      </View>

      {/* Projects header */}
      <SkeletonBlock className="h-4 w-32 mt-10" />

      {/* Project cards */}
      <SkeletonBlock className="h-28 mt-4" />
      <SkeletonBlock className="h-28 mt-3" />

      {/* Activity header */}
      <SkeletonBlock className="h-4 w-32 mt-10" />

      {/* Activity rows */}
      <SkeletonBlock className="h-14 mt-4" />
      <SkeletonBlock className="h-14 mt-3" />
      <SkeletonBlock className="h-14 mt-3" />
    </View>
  );
}
