/**
 * <Pill /> — status indicator + small chip.
 *
 * Uses:
 *   · Status: "Live" / "Tendering" / "Awarded" / "Draft" — tone picks
 *     the right semantic color
 *   · Counts: "3 new" — neutral tone, small numeric label
 *   · Filter chips: "Type · Single dwelling" — neutral, dismissable
 *
 * Variants:
 *   · neutral   — default, hairline border, muted text
 *   · accent    — teal background tint, accent text
 *   · success   — for awarded / completed states
 *   · warning   — for pending / review states
 *   · danger    — for rejected / archived states
 *   · solid     — filled accent, accent-contrast text (use for the
 *                 one most-prominent pill on a screen)
 *
 * Size:
 *   · `sm` — caption-size text, 4px vertical pad
 *   · `md` — body-size text, 6px vertical pad
 */
import * as React from "react";
import { Text, View, type ViewStyle } from "react-native";

import { palette, radii4 } from "@/lib/theme";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "solid";
type Size = "sm" | "md";

interface Props {
  children: React.ReactNode;
  tone?: Tone;
  size?: Size;
  /** Optional leading icon (rendered before text). */
  leading?: React.ReactNode;
  style?: ViewStyle;
}

export function Pill({
  children,
  tone = "neutral",
  size = "sm",
  leading,
  style,
}: Props) {
  const t = tones[tone];
  const s = sizes[size];

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          alignSelf: "flex-start",
          backgroundColor: t.bg,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: radii4.pill,
          paddingHorizontal: s.paddingX,
          paddingVertical: s.paddingY,
        },
        style,
      ]}
    >
      {leading}
      <Text
        style={{
          fontSize: s.fontSize,
          fontWeight: "600",
          letterSpacing: 0.2,
          color: t.text,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

const tones: Record<
  Tone,
  { bg: string; border: string; text: string }
> = {
  neutral: {
    bg: "transparent",
    border: palette.hairlineStrong,
    text: palette.textMuted,
  },
  accent: {
    bg: palette.accentMuted,
    border: palette.hairlineAccent,
    text: palette.accentLight,
  },
  success: {
    bg: palette.successMuted,
    border: "rgba(94, 234, 212, 0.30)",
    text: palette.success,
  },
  warning: {
    bg: palette.warningMuted,
    border: "rgba(251, 191, 36, 0.30)",
    text: palette.warning,
  },
  danger: {
    bg: palette.dangerMuted,
    border: "rgba(251, 113, 133, 0.30)",
    text: palette.danger,
  },
  solid: {
    bg: palette.accent,
    border: palette.accent,
    text: palette.accentContrast,
  },
};

const sizes: Record<
  Size,
  { fontSize: number; paddingX: number; paddingY: number }
> = {
  sm: { fontSize: 11, paddingX: 10, paddingY: 4 },
  md: { fontSize: 13, paddingX: 14, paddingY: 6 },
};
