/**
 * <Button /> — premium tap button with the BuilderHQ press-feel.
 *
 * What makes it feel right:
 *   · Light haptic on press-in (Taptic / vibration) — the "this is real
 *     and responding" cue.
 *   · 60fps scale animation on press (0.97) driven by Reanimated
 *     worklets on the UI thread. Runs even during heavy JS work, which
 *     is exactly when buttons feel sluggish on cheaper RN apps.
 *   · Disabled + loading states baked in — no caller has to remember
 *     to wire opacity / activity indicator separately.
 *   · Variant + size match the web design system so the brand reads
 *     identically across platforms.
 */
import { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Leading icon node. Sized to match the label. */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeClasses: Record<Size, { container: string; text: string }> = {
  sm: { container: "h-9 px-4 rounded-md", text: "text-[13px]" },
  md: { container: "h-11 px-5 rounded-lg", text: "text-[14px]" },
  lg: { container: "h-14 px-7 rounded-xl", text: "text-[15px]" },
};

const variantClasses: Record<
  Variant,
  { container: string; text: string }
> = {
  primary: {
    container: "bg-accent active:bg-accent-active",
    text: "text-accent-contrast font-semibold tracking-[0.02em]",
  },
  secondary: {
    container: "bg-surface-1 border border-border-strong",
    text: "text-text font-medium tracking-[0.005em]",
  },
  ghost: {
    container: "bg-transparent",
    text: "text-text-muted font-medium",
  },
  danger: {
    container: "bg-danger-muted border border-danger/40",
    text: "text-danger font-semibold tracking-[0.02em]",
  },
};

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    label,
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    onPressIn,
    onPress,
    onPressOut,
    style,
    ...rest
  },
  ref,
) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sz = sizeClasses[size];
  const vr = variantClasses[variant];

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={(e) => {
        scale.value = withSpring(0.97, { mass: 0.5, damping: 14, stiffness: 220 });
        // Light haptic — calibrated to "noticeable but not pushy."
        if (!isDisabled) void haptics.tap();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { mass: 0.5, damping: 14, stiffness: 260 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (isDisabled) return;
        onPress?.(e);
      }}
      style={[animatedStyle, style]}
      className={cn(
        "flex-row items-center justify-center gap-2",
        sz.container,
        vr.container,
        fullWidth && "w-full",
        isDisabled && "opacity-50",
      )}
      // Shadow for the primary variant — matches the web hero CTA glow.
      // Skipping for other variants where it'd be visual noise.
      {...(variant === "primary" && {
        style: [
          {
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 18,
            elevation: 8,
          },
          animatedStyle,
          style,
        ],
      })}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? colors.accentContrast : colors.accent}
        />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text className={cn(sz.text, vr.text)}>{label}</Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </AnimatedPressable>
  );
});
