/**
 * <Row /> — the universal list row.
 *
 * Airbnb / Linear / Cluely all use this same composition:
 *
 *   ┌────────────────────────────────────────────────────┐
 *   │  [leading]   Title              ┌─trailing────┐   │
 *   │              Subtitle           │  pill / val │   │
 *   └────────────────────────────────────────────────────┘
 *
 * Leading is typically an icon, an avatar, or a numeric rank.
 * Trailing is typically a chevron, a pill, or a numeric value.
 *
 * Behavior:
 *   · Press-aware out of the box (via <Press>). Tap fires a soft
 *     haptic to feel native without being noisy.
 *   · No background by default — designed to live inside a Surface
 *     or directly on the canvas (with a hairline divider provided
 *     by the consumer if needed).
 *   · `active` prop tints the surface with accentMuted and swaps
 *     the title to accentLight for selected states.
 *
 * Why a single Row vs. type-specific Row components:
 *   Conversation rows, project rows, tender rows, settings rows — all
 *   the same shape underneath. Specializing would just duplicate
 *   padding logic and lock us out of consistent press feedback.
 */
import * as React from "react";
import { Text, View, type TextStyle, type ViewStyle } from "react-native";

import { palette, type } from "@/lib/theme";

import { Icon } from "@/lib/icons";
import { Press } from "./press";

interface Props {
  /** Left-hand content (icon, avatar, rank). Sized to ~36-44px. */
  leading?: React.ReactNode;
  /** Primary line. */
  title: string;
  /** Optional secondary line under the title. */
  subtitle?: string | React.ReactNode;
  /** Right-hand trailing content (pill, value, chevron). */
  trailing?: React.ReactNode;
  /** Show a default chevron at the trailing edge. Ignored if `trailing` set. */
  showChevron?: boolean;
  /** Active / selected state — tints surface, brightens title. */
  active?: boolean;
  /** Tap handler. Omit for a non-interactive row. */
  onPress?: () => void;
  /** Optional long-press handler for context menus (Instagram-style). */
  onLongPress?: () => void;
  /** Override the row's vertical padding. Default 14. */
  paddingY?: number;
  /** Override horizontal padding. Default 16. */
  paddingX?: number;
  style?: ViewStyle;
}

export function Row({
  leading,
  title,
  subtitle,
  trailing,
  showChevron = false,
  active = false,
  onPress,
  onLongPress,
  paddingY = 14,
  paddingX = 16,
  style,
}: Props) {
  const body = (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: paddingX,
          paddingVertical: paddingY,
          backgroundColor: active ? palette.accentMuted : "transparent",
          borderRadius: 12,
        },
        style,
      ]}
    >
      {leading ? <View style={{ flexShrink: 0 }}>{leading}</View> : null}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={
            {
              ...type.titleSmall,
              color: active ? palette.accentLight : palette.text,
              fontWeight: "600",
            } as TextStyle
          }
        >
          {title}
        </Text>
        {subtitle ? (
          typeof subtitle === "string" ? (
            <Text
              numberOfLines={1}
              style={{
                ...type.bodySmall,
                color: palette.textMuted,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : (
            <View style={{ marginTop: 2 }}>{subtitle}</View>
          )
        ) : null}
      </View>

      {trailing ? (
        <View style={{ flexShrink: 0 }}>{trailing}</View>
      ) : showChevron ? (
        <Icon.ChevronRight size={18} color={palette.textDim} />
      ) : null}
    </View>
  );

  if (!onPress && !onLongPress) return body;

  return (
    <Press
      onPress={onPress}
      onLongPress={onLongPress}
      haptic="soft"
      scaleTo={0.99}
    >
      {body}
    </Press>
  );
}
