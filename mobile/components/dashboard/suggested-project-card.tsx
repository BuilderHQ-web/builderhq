/**
 * <SuggestedProjectCard /> — wide premium project card.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ✦ NEW MATCH                                                  │
 *   │                                                              │
 *   │ Multi-dwelling · Black Rock, VIC                             │
 *   │                                                              │
 *   │ 📍 Black Rock, VIC · 3193                                    │
 *   │                                                              │
 *   │ [$3M – $5M]                                                  │
 *   │                                                              │
 *   │ 🛏 5  🛁 4  🏠 2                                              │
 *   │                                                              │
 *   │ ───────────  blueprint strip ──────────                      │
 *   │                                                              │
 *   │ 🔒 2 of 3 unlocked              1 slot left                  │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Layout note: previous version put the blueprint visual as a SIDE
 * COLUMN with flex stretching — the SVG container had no explicit
 * height bound, which caused the card to balloon in some viewports.
 *
 * v2 puts the blueprint as a thin DECORATIVE HORIZONTAL STRIP near
 * the bottom — fixed height, full-width inside the card. Predictable
 * dimensions, more breathing room for the content above.
 *
 * Premium 3D float: shadow stack lifts the card off the ambient
 * background so it reads as a layer.
 */

import * as React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Line,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { Icon } from "@/lib/icons";
import { palette, type } from "@/lib/theme";

import { Press } from "@/components/ui/press";

interface Props {
  title: string;
  typeLabel?: string;
  location?: string;
  budgetLabel?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  dwellingCount?: number | null;
  unlockedCount?: number;
  unlockCap?: number;
  isNew?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function SuggestedProjectCard({
  title,
  typeLabel,
  location,
  budgetLabel,
  bedrooms,
  bathrooms,
  dwellingCount,
  unlockedCount,
  unlockCap = 3,
  isNew = false,
  onPress,
  onLongPress,
}: Props) {
  const slotsLeft =
    typeof unlockedCount === "number"
      ? Math.max(0, unlockCap - unlockedCount)
      : null;

  const body = (
    <View
      style={{
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: palette.hairline,
        // 3D float — premium drop shadow stack.
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowOffset: { width: 0, height: 14 },
        shadowRadius: 28,
        elevation: 10,
      }}
    >
      {/* Subtle gradient surface — slightly lifted top, deep base */}
      <LinearGradient
        colors={["rgba(20, 26, 42, 0.95)", "rgba(14, 19, 31, 1)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ padding: 18 }}
      >
        {/* Top hairline accent — premium signal */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 36,
            right: 36,
            height: 1,
            backgroundColor: palette.accentLight,
            opacity: 0.55,
          }}
        />

        {/* Kicker — NEW MATCH or type label */}
        {isNew ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
            }}
          >
            <Icon.Spark size={11} color={palette.accent} />
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: "700",
                letterSpacing: 1.8,
                color: palette.accentLight,
              }}
            >
              NEW MATCH
            </Text>
          </View>
        ) : typeLabel ? (
          <Text
            style={{
              fontSize: 10.5,
              fontWeight: "700",
              letterSpacing: 1.8,
              color: palette.textDim,
            }}
          >
            {typeLabel.toUpperCase()}
          </Text>
        ) : null}

        {/* Title */}
        <Text
          numberOfLines={2}
          style={{
            ...type.title,
            color: palette.text,
            fontWeight: "700",
            letterSpacing: -0.3,
            fontSize: 21,
            lineHeight: 26,
            marginTop: 12,
          }}
        >
          {title}
        </Text>

        {/* Location */}
        {location ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
            }}
          >
            <Icon.Location size={13} color={palette.textDim} />
            <Text
              numberOfLines={1}
              style={{
                ...type.bodySmall,
                color: palette.textMuted,
                fontSize: 13,
              }}
            >
              {location}
            </Text>
          </View>
        ) : null}

        {/* Budget pill */}
        {budgetLabel ? (
          <View style={{ flexDirection: "row", marginTop: 14 }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: palette.accentMuted,
                borderWidth: 1,
                borderColor: palette.hairlineAccent,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: palette.accentLight,
                  fontVariant: ["tabular-nums"],
                  letterSpacing: -0.1,
                }}
              >
                {budgetLabel}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Specs */}
        {(bedrooms || bathrooms || dwellingCount) ? (
          <View
            style={{
              flexDirection: "row",
              gap: 22,
              marginTop: 18,
            }}
          >
            {bedrooms ? <Spec icon="bed" label="bed" value={bedrooms} /> : null}
            {bathrooms ? (
              <Spec icon="bath" label="bath" value={bathrooms} />
            ) : null}
            {dwellingCount && dwellingCount > 1 ? (
              <Spec icon="dwell" label="dwell" value={dwellingCount} />
            ) : null}
          </View>
        ) : null}

        {/* Decorative blueprint strip — FIXED HEIGHT, no flex weirdness */}
        <View
          style={{
            marginTop: 22,
            height: 64,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "rgba(0, 212, 200, 0.04)",
            borderWidth: 1,
            borderColor: palette.hairline,
          }}
        >
          <BlueprintStrip />
        </View>

        {/* Footer: unlock status */}
        {slotsLeft !== null ? (
          <View
            style={{
              marginTop: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Icon.Lock size={13} color={palette.textDim} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: palette.textMuted,
                letterSpacing: -0.05,
                flex: 1,
              }}
            >
              {unlockedCount} of {unlockCap} unlocked
            </Text>
            {slotsLeft > 0 ? (
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: "700",
                  color: palette.accentLight,
                  letterSpacing: 0.3,
                }}
              >
                {slotsLeft} SLOT{slotsLeft === 1 ? "" : "S"} LEFT
              </Text>
            ) : (
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: "700",
                  color: palette.danger,
                  letterSpacing: 0.3,
                }}
              >
                FILLED
              </Text>
            )}
          </View>
        ) : null}
      </LinearGradient>
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

function Spec({
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <Text
        style={{
          fontSize: 19,
          lineHeight: 24,
          fontWeight: "700",
          color: palette.text,
          fontVariant: ["tabular-nums"],
          letterSpacing: -0.3,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 9.5,
          fontWeight: "700",
          letterSpacing: 1.5,
          color: palette.textDim,
          marginTop: 1,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * Horizontal architectural strip — full-width thin blueprint
 * footer art. Fixed height (matches container), no flex issues.
 */
function BlueprintStrip() {
  const stroke = "rgba(126, 245, 237, 0.50)";
  const strokeFaint = "rgba(126, 245, 237, 0.20)";
  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 64" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <SvgGradient id="stripFade" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0E131F" stopOpacity="0.6" />
          <Stop offset="0.5" stopColor="#0E131F" stopOpacity="0" />
          <Stop offset="1" stopColor="#0E131F" stopOpacity="0.6" />
        </SvgGradient>
      </Defs>

      {/* Faint grid lines */}
      {Array.from({ length: 12 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={i * 28}
          y1={0}
          x2={i * 28}
          y2={64}
          stroke={strokeFaint}
          strokeWidth={0.4}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <Line
          key={`h${i}`}
          x1={0}
          y1={i * 14}
          x2={320}
          y2={i * 14}
          stroke={strokeFaint}
          strokeWidth={0.4}
        />
      ))}

      {/* Stylized skyline — three building outlines of varying heights */}
      <Rect x={28} y={28} width={36} height={32} stroke={stroke} strokeWidth={1.1} fill="none" />
      <Rect x={64} y={18} width={48} height={42} stroke={stroke} strokeWidth={1.1} fill="none" />
      <Rect x={112} y={32} width={28} height={28} stroke={stroke} strokeWidth={1.1} fill="none" />
      <Rect x={140} y={22} width={40} height={38} stroke={stroke} strokeWidth={1.1} fill="none" />
      <Rect x={180} y={36} width={32} height={24} stroke={stroke} strokeWidth={1.1} fill="none" />
      <Rect x={212} y={28} width={44} height={32} stroke={stroke} strokeWidth={1.1} fill="none" />
      <Rect x={256} y={20} width={36} height={40} stroke={stroke} strokeWidth={1.1} fill="none" />

      {/* Roofline accents on a couple */}
      <Path d="M 64 18 L 88 8 L 112 18" stroke={stroke} strokeWidth={1.1} fill="none" />
      <Path d="M 140 22 L 160 12 L 180 22" stroke={stroke} strokeWidth={1.1} fill="none" />
      <Path d="M 256 20 L 274 10 L 292 20" stroke={stroke} strokeWidth={1.1} fill="none" />

      {/* Edge fade so the strip dissolves cleanly on the left + right */}
      <Rect width="320" height="64" fill="url(#stripFade)" />
    </Svg>
  );
}
