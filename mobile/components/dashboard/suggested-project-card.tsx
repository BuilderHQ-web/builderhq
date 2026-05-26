/**
 * <SuggestedProjectCard /> — wide premium card for matched projects.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ ✦ NEW MATCH                       ┌───────────────────────┐ │
 *   │                                   │                       │ │
 *   │ Multi-dwelling                    │   blueprint /         │ │
 *   │ Black Rock, VIC                   │   map fragment        │ │
 *   │                                   │   (SVG sketch)        │ │
 *   │ [$3M – $5M]                       │                       │ │
 *   │                                   │                       │ │
 *   │ 🛏 5  🛁 4  🏠 2                  └───────────────────────┘ │
 *   │                                                              │
 *   │ ── 2 of 3 unlocked ────────────────────────────────────────  │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * The side art is a hand-rendered architectural SVG (blueprint
 * skyline / floor-plan fragment) — gives the card the construction-
 * brand-honesty signal without resorting to literal hardhats.
 */

import * as React from "react";
import { Text, View } from "react-native";
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
  /** Type label ("Multi-dwelling", "Renovation", etc.) */
  typeLabel?: string;
  /** Location ("Black Rock, VIC"). */
  location?: string;
  /** Pre-formatted budget band ("$3M – $5M"). */
  budgetLabel?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  dwellingCount?: number | null;
  /** Builders who've unlocked (out of 3 max). */
  unlockedCount?: number;
  unlockCap?: number;
  /** Whether this is genuinely "new" (e.g. published <48h ago). */
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
        backgroundColor: palette.surface,
      }}
    >
      {/* Top hairline accent — premium signal */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 28,
          right: 28,
          height: 1,
          backgroundColor: palette.accentLight,
          opacity: 0.5,
        }}
      />

      <View
        style={{
          flexDirection: "row",
          padding: 18,
          minHeight: 168,
        }}
      >
        {/* Content side */}
        <View style={{ flex: 1, paddingRight: 14 }}>
          {/* Kicker */}
          {isNew ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                alignSelf: "flex-start",
              }}
            >
              <Icon.Spark size={11} color={palette.accent} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1.6,
                  color: palette.accentLight,
                }}
              >
                NEW MATCH
              </Text>
            </View>
          ) : typeLabel ? (
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1.6,
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
              fontWeight: "600",
              marginTop: 8,
              letterSpacing: -0.2,
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
                gap: 5,
                marginTop: 6,
              }}
            >
              <Icon.Location size={12} color={palette.textDim} />
              <Text
                numberOfLines={1}
                style={{
                  ...type.bodySmall,
                  color: palette.textMuted,
                  fontSize: 12.5,
                }}
              >
                {location}
              </Text>
            </View>
          ) : null}

          {/* Budget pill */}
          {budgetLabel ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: palette.accentMuted,
                  borderWidth: 1,
                  borderColor: palette.hairlineAccent,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: palette.accentLight,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {budgetLabel}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Spec strip — bed / bath / dwellings */}
          {(bedrooms || bathrooms || dwellingCount) && (
            <View
              style={{
                flexDirection: "row",
                gap: 14,
                marginTop: 12,
              }}
            >
              {bedrooms ? <Spec label="bed" value={bedrooms} /> : null}
              {bathrooms ? <Spec label="bath" value={bathrooms} /> : null}
              {dwellingCount && dwellingCount > 1 ? (
                <Spec label="dwell" value={dwellingCount} />
              ) : null}
            </View>
          )}
        </View>

        {/* Visual side — blueprint / map fragment */}
        <View
          style={{
            width: 120,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "rgba(0, 212, 200, 0.04)",
            borderWidth: 1,
            borderColor: palette.hairline,
          }}
        >
          <BlueprintArt />
        </View>
      </View>

      {/* Footer: unlock status */}
      {slotsLeft !== null ? (
        <View
          style={{
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: palette.hairline,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon.Lock size={12} color={palette.textDim} />
          <Text
            style={{
              fontSize: 12,
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
                fontSize: 11,
                fontWeight: "600",
                color: palette.accentLight,
                letterSpacing: 0.2,
              }}
            >
              {slotsLeft} slot{slotsLeft === 1 ? "" : "s"} left
            </Text>
          ) : (
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: palette.danger,
                letterSpacing: 0.2,
              }}
            >
              FILLED
            </Text>
          )}
        </View>
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

function Spec({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <Text
        style={{
          fontSize: 18,
          lineHeight: 22,
          fontWeight: "700",
          color: palette.text,
          fontVariant: ["tabular-nums"],
          letterSpacing: -0.2,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 9.5,
          fontWeight: "600",
          letterSpacing: 1.4,
          color: palette.textDim,
          marginTop: -1,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * Minimal architectural blueprint art — a stylized floor-plan
 * fragment in accent-tinted strokes on a dark surface. No literal
 * houses or hardhats; just clean lines that signal "construction"
 * without being on-the-nose.
 */
function BlueprintArt() {
  const stroke = "rgba(126, 245, 237, 0.55)";
  const strokeFaint = "rgba(126, 245, 237, 0.25)";
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 168">
      <Defs>
        <SvgGradient id="bpFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0E131F" stopOpacity="0" />
          <Stop offset="1" stopColor="#0E131F" stopOpacity="0.85" />
        </SvgGradient>
      </Defs>

      {/* Faint grid */}
      {Array.from({ length: 10 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={i * 12}
          y1={0}
          x2={i * 12}
          y2={168}
          stroke={strokeFaint}
          strokeWidth={0.4}
          opacity={0.4}
        />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <Line
          key={`h${i}`}
          x1={0}
          y1={i * 12}
          x2={120}
          y2={i * 12}
          stroke={strokeFaint}
          strokeWidth={0.4}
          opacity={0.4}
        />
      ))}

      {/* Building footprint — staggered duplex rectangles */}
      <Rect
        x={18}
        y={36}
        width={42}
        height={62}
        stroke={stroke}
        strokeWidth={1.2}
        fill="none"
      />
      <Rect
        x={60}
        y={36}
        width={42}
        height={62}
        stroke={stroke}
        strokeWidth={1.2}
        fill="none"
      />
      {/* Roof line above */}
      <Path
        d="M 18 36 L 60 18 L 102 36"
        stroke={stroke}
        strokeWidth={1.2}
        fill="none"
      />
      {/* Interior walls */}
      <Line x1={36} y1={62} x2={60} y2={62} stroke={stroke} strokeWidth={0.8} />
      <Line x1={36} y1={62} x2={36} y2={98} stroke={stroke} strokeWidth={0.8} />
      <Line x1={78} y1={62} x2={102} y2={62} stroke={stroke} strokeWidth={0.8} />
      <Line x1={78} y1={62} x2={78} y2={98} stroke={stroke} strokeWidth={0.8} />

      {/* Door swing arcs */}
      <Path
        d="M 36 98 A 8 8 0 0 1 44 90"
        stroke={stroke}
        strokeWidth={0.8}
        fill="none"
      />
      <Path
        d="M 78 98 A 8 8 0 0 1 86 90"
        stroke={stroke}
        strokeWidth={0.8}
        fill="none"
      />

      {/* North arrow */}
      <Path
        d="M 96 132 L 100 122 L 104 132 L 100 128 Z"
        stroke={stroke}
        strokeWidth={0.8}
        fill={stroke}
      />

      {/* Bottom fade so card content sits cleanly above */}
      <Rect x={0} y={120} width={120} height={48} fill="url(#bpFade)" />
    </Svg>
  );
}
