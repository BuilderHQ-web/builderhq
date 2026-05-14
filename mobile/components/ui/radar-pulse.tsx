/**
 * <RadarPulse /> — empty-state visual.
 *
 * Three concentric rings expand + fade outward on a 2.4s loop. Inner
 * dot at the centre holds a sparkles glyph. The effect reads as a
 * project radar "listening" for matches, which fits the "no new
 * matches yet" empty state much better than a static icon.
 *
 * Animation runs entirely on the UI thread via Reanimated worklets so
 * it stays smooth while the JS thread is hydrating data.
 */
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Sparkles } from "lucide-react-native";

import { colors } from "@/lib/theme";

interface Props {
  size?: number;
  color?: string;
}

const RING_DURATION = 2400;

export function RadarPulse({ size = 96, color = colors.accentLight }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ring size={size} color={color} delay={0} />
      <Ring size={size} color={color} delay={RING_DURATION / 3} />
      <Ring size={size} color={color} delay={(RING_DURATION / 3) * 2} />
      {/* Static centre */}
      <View
        style={{
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: (size * 0.34) / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 212, 200, 0.16)",
          borderWidth: 1,
          borderColor: "rgba(0, 212, 200, 0.34)",
        }}
      >
        <Sparkles size={size * 0.16} color={color} strokeWidth={1.6} />
      </View>
    </View>
  );
}

function Ring({
  size,
  color,
  delay,
}: {
  size: number;
  color: string;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration: RING_DURATION,
          easing: Easing.out(Easing.cubic),
        }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 0.3 + progress.value * 0.85 }],
    opacity: 1 - progress.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.2,
          borderColor: color,
        },
        animated,
      ]}
    />
  );
}
