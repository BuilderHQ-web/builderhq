/**
 * <StickyCTA /> — the Airbnb/Uber bottom-anchored primary action.
 *
 * Sits flush against the bottom safe area. The screen above it adds
 * 96px of bottom inset (via `<ScreenV4 bottomCta />`) so content
 * doesn't get occluded.
 *
 * Three visual modes:
 *   · `primary` — filled accent button, accent-contrast text, glow
 *   · `secondary` — outlined hairline button, text-color text
 *   · `ghost` — text-only link, no surface (for "Maybe later" etc.)
 *
 * Always full-width inside its container. Page padding is owned by
 * ScreenV4; the CTA bar paints edge-to-edge but the BUTTON inside it
 * respects the 20px page padding.
 */
import * as React from "react";
import {
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/lib/icons";
import { palette, radii4, shadow } from "@/lib/theme";

import { Press } from "./press";

interface PrimaryAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Trailing icon — defaults to ArrowRight for primary, none otherwise. */
  trailingIcon?: React.ComponentType<{ size?: number; color?: string }>;
  /** Hide the trailing icon entirely. */
  hideIcon?: boolean;
  /** Variant — defaults to "primary". */
  variant?: "primary" | "secondary" | "ghost";
}

interface Props {
  /** Primary action button. Required. */
  action: PrimaryAction;
  /** Optional secondary action (rendered to the left of primary). */
  secondary?: PrimaryAction;
  /** Optional label above the buttons — e.g. "Founding access · $0" */
  helper?: string;
  /** Border-top hairline. Default true (signals it's a docked bar). */
  divider?: boolean;
  style?: ViewStyle;
}

export function StickyCTA({
  action,
  secondary,
  helper,
  divider = true,
  style,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 14 + Math.max(insets.bottom, 8),
          backgroundColor: palette.canvas,
          borderTopWidth: divider ? 0.5 : 0,
          borderTopColor: palette.hairline,
        },
        style,
      ]}
    >
      {helper ? (
        <Text
          style={{
            fontSize: 11,
            color: palette.textMuted,
            letterSpacing: 0.4,
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          {helper}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        {secondary ? (
          <ActionButton {...secondary} fill={false} />
        ) : null}
        <View style={{ flex: 1 }}>
          <ActionButton {...action} fill />
        </View>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  trailingIcon,
  hideIcon = false,
  variant = "primary",
  fill = true,
}: PrimaryAction & { fill?: boolean }) {
  const v = variants[variant];
  const TrailingIcon =
    !hideIcon && (trailingIcon ?? (variant === "primary" ? Icon.ArrowRight : null));

  return (
    <Press
      onPress={disabled ? undefined : onPress}
      haptic={variant === "primary" ? "select" : "tap"}
      scaleTo={0.97}
      style={
        [
          {
            height: 54,
            paddingHorizontal: 22,
            borderRadius: radii4.pill,
            backgroundColor: v.bg,
            borderWidth: v.borderWidth,
            borderColor: v.borderColor,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            opacity: disabled ? 0.4 : 1,
            flexGrow: fill ? 1 : 0,
          },
          variant === "primary" ? shadow.accentGlow : undefined,
        ] as ViewStyle[]
      }
    >
      <Text
        style={
          {
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: 0.1,
            color: v.fg,
          } as TextStyle
        }
      >
        {label}
      </Text>
      {TrailingIcon ? <TrailingIcon size={18} color={v.fg} /> : null}
    </Press>
  );
}

const variants = {
  primary: {
    bg: palette.accent,
    fg: palette.accentContrast,
    borderColor: palette.accent,
    borderWidth: 1,
  },
  secondary: {
    bg: palette.surface,
    fg: palette.text,
    borderColor: palette.hairlineStrong,
    borderWidth: 1,
  },
  ghost: {
    bg: "transparent",
    fg: palette.textMuted,
    borderColor: "transparent",
    borderWidth: 0,
  },
} as const;
