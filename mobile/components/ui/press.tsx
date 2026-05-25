/**
 * <Press /> — the single interactive primitive.
 *
 * Wraps any pressable surface with three things every premium app does
 * but most React Native apps forget:
 *
 *   1. Haptic feedback on press-in (NOT on press-out). Press-in feel
 *      is what gives apps the "responsive" feel — Apple's HIG, every
 *      premium iOS app, every native button. Press-out haptic feels
 *      sluggish.
 *
 *   2. Scale-down on press (0.97 by default). The scale snaps in
 *      (~60ms) and releases over the press duration. The exact ratio
 *      isn't important; what matters is that EVERY pressable in the
 *      app uses the same one. Consistency reads as polish.
 *
 *   3. Optional double-tap and long-press, lifted into the same API
 *      so Instagram-style gestures (double-tap to save, long-press
 *      for context menu) compose naturally.
 *
 * Why a wrapper instead of a custom Button:
 *   The same gesture model needs to live on rows, cards, list items,
 *   icons, avatars, anything tappable. A button-only abstraction
 *   forces other things to reinvent these three properties slightly
 *   differently. <Press> covers the lot.
 */
import * as React from "react";
import {
  Pressable,
  type PressableProps,
  type View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { haptics } from "@/lib/haptics";
import { ease } from "@/lib/motion";

interface Props extends Omit<PressableProps, "onPress" | "onLongPress"> {
  /** Tap handler. Receives haptic.tap on press-in. */
  onPress?: () => void;
  /** Optional long-press — fires haptic.select on trigger. */
  onLongPress?: () => void;
  /** Optional double-tap — fires haptic.select. Useful for Instagram-style save. */
  onDoublePress?: () => void;
  /**
   * Scale-down ratio on press. 0.97 is the default — premium without
   * feeling rubbery. Set to 1 to disable scale animation entirely.
   */
  scaleTo?: number;
  /**
   * Haptic kind for the primary tap. Defaults to 'tap' (Light).
   * Pass 'soft' for low-emphasis presses (list rows in dense scrolls)
   * or 'select' for decisive picks (tab change, segmented control).
   */
  haptic?: "tap" | "soft" | "select" | "none";
  /** Disable both haptic + scale. Same as setting scaleTo=1, haptic='none'. */
  flat?: boolean;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

/** Window in ms within which two taps count as a double-tap. */
const DOUBLE_TAP_MS = 280;

export const Press = React.forwardRef<View, Props>(function Press(
  {
    onPress,
    onLongPress,
    onDoublePress,
    scaleTo = 0.97,
    haptic = "tap",
    flat = false,
    style,
    children,
    ...rest
  },
  ref,
) {
  const scale = useSharedValue(1);
  const lastTapAt = React.useRef(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fireHaptic = React.useCallback(() => {
    if (flat || haptic === "none") return;
    void haptics[haptic]();
  }, [flat, haptic]);

  const handlePressIn = React.useCallback(() => {
    fireHaptic();
    if (!flat && scaleTo !== 1) {
      scale.value = withTiming(scaleTo, {
        duration: 120,
        easing: ease.easeOut,
      });
    }
  }, [fireHaptic, flat, scale, scaleTo]);

  const handlePressOut = React.useCallback(() => {
    if (!flat && scaleTo !== 1) {
      scale.value = withTiming(1, {
        duration: 200,
        easing: ease.easeOutSoft,
      });
    }
  }, [flat, scale, scaleTo]);

  const handlePress = React.useCallback(() => {
    // Detect double-tap before firing single-tap, so consumers can
    // wire both without firing single-tap when a double-tap lands.
    if (onDoublePress) {
      const now = Date.now();
      if (now - lastTapAt.current < DOUBLE_TAP_MS) {
        lastTapAt.current = 0;
        void haptics.select();
        onDoublePress();
        return;
      }
      lastTapAt.current = now;
    }
    onPress?.();
  }, [onDoublePress, onPress]);

  const handleLongPress = React.useCallback(() => {
    if (!onLongPress) return;
    void haptics.select();
    onLongPress();
  }, [onLongPress]);

  return (
    <AnimatedPressable
      ref={ref}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress ? handleLongPress : undefined}
      delayLongPress={400}
      style={[animStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
