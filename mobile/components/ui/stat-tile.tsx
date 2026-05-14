/**
 * <StatTile /> — single glass tile in a stat row.
 *
 * Strict shared shape so the row of 2/3 tiles on the dashboard reads
 * uniform regardless of how the parent composes them.
 *
 * Variants:
 *   · neutral — used when value is 0 / inactive. Glass with subtle
 *               white-tint top highlight.
 *   · accent  — used when value > 0 OR otherwise "active". Teal glass
 *               + teal-tinted number; the eye locks onto the active
 *               tiles at a glance.
 *
 * Optionally accepts an `icon` slot for a small lucide glyph in the
 * top-right corner. Keeps the tile readable without crowding the
 * value.
 */
import { type ReactNode } from "react";
import { Pressable, View, Text } from "react-native";

import { colors } from "@/lib/theme";
import { haptics } from "@/lib/haptics";

interface Props {
  label: string;
  value: string | number;
  tone?: "neutral" | "accent" | "warn";
  icon?: ReactNode;
  onPress?: () => void;
}

export function StatTile({ label, value, tone = "neutral", icon, onPress }: Props) {
  const accent = tone === "accent";
  const warn = tone === "warn";

  const fill = accent
    ? "rgba(0, 212, 200, 0.08)"
    : warn
      ? "rgba(255, 122, 138, 0.06)"
      : "rgba(255, 255, 255, 0.035)";
  const borderColor = accent
    ? "rgba(0, 212, 200, 0.32)"
    : warn
      ? "rgba(255, 122, 138, 0.30)"
      : "rgba(255, 255, 255, 0.08)";
  const valueColor = accent
    ? colors.accentLight
    : warn
      ? colors.danger
      : colors.text;

  const content = (
    <View
      style={{
        flex: 1,
        height: 88,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 14,
        backgroundColor: fill,
        borderWidth: 1,
        borderColor,
        overflow: "hidden",
        justifyContent: "space-between",
      }}
    >
      {/* Inner top highlight */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(255, 255, 255, 0.10)",
        }}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: accent ? colors.accent : colors.textFaint,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 9.5,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
        {icon ? <View style={{ opacity: 0.5 }}>{icon}</View> : null}
      </View>
      <Text
        style={{
          color: valueColor,
          fontFamily: "BebasNeue_400Regular",
          fontSize: 30,
          lineHeight: 30,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={() => {
        void haptics.tap();
        onPress();
      }}
      style={{ flex: 1 }}
    >
      {content}
    </Pressable>
  );
}
