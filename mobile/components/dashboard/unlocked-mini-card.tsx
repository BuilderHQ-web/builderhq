/**
 * <UnlockedMiniCard /> — compact card for the "Recently unlocked"
 * horizontal scroll carousel.
 *
 *   ┌─────────────────────┐
 *   │ ▦ SINGLE DWELLING   │  ← type-tinted color block top
 *   │                     │
 *   │ PROJECT BUDGET      │
 *   │ $1.5M – $2M         │
 *   │─────────────────────│
 *   │ Single dwelling     │  ← title
 *   │ · Glen Iris, VIC    │
 *   │ 📍 Glen Iris, VIC   │
 *   │                     │
 *   │ 4 bed  3 bath  2 st │
 *   │                     │
 *   │ 🔒 FILLED  📄 2     │
 *   └─────────────────────┘
 *
 * Fixed width so cards line up neatly in a horizontal FlatList.
 * Type-tinted top colour-block is the visual ID (web parity).
 */

import * as React from "react";
import { Text, View } from "react-native";

import { Icon } from "@/lib/icons";
import { palette, type } from "@/lib/theme";

import { Press } from "@/components/ui/press";

interface Props {
  title: string;
  typeKey: string; // 'single_dwelling' | 'multi_dwelling' | 'renovation' | 'extension'
  typeLabel: string;
  location?: string;
  budgetLabel?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  /** "Storeys" for new builds, "Dwellings" for multi, etc. */
  thirdSpecLabel?: string;
  thirdSpecValue?: number | null;
  documentCount?: number;
  isFilled?: boolean;
  onPress?: () => void;
}

/** Fixed card width — 78% of viewport for nice peek of the next card. */
export const UNLOCKED_CARD_WIDTH = 260;

const TYPE_TINT: Record<
  string,
  { from: string; to: string; accent: string }
> = {
  single_dwelling: {
    from: "rgba(0, 212, 200, 0.28)",
    to: "rgba(0, 212, 200, 0.08)",
    accent: palette.accentLight,
  },
  multi_dwelling: {
    from: "rgba(76, 144, 255, 0.32)",
    to: "rgba(76, 144, 255, 0.10)",
    accent: "#9CC4FF",
  },
  renovation: {
    from: "rgba(251, 113, 133, 0.28)",
    to: "rgba(251, 113, 133, 0.08)",
    accent: "#FFB4C1",
  },
  extension: {
    from: "rgba(251, 191, 36, 0.26)",
    to: "rgba(251, 191, 36, 0.08)",
    accent: "#FCD98C",
  },
};

export function UnlockedMiniCard({
  title,
  typeKey,
  typeLabel,
  location,
  budgetLabel,
  bedrooms,
  bathrooms,
  thirdSpecLabel,
  thirdSpecValue,
  documentCount,
  isFilled,
  onPress,
}: Props) {
  const tint = TYPE_TINT[typeKey] ?? TYPE_TINT.single_dwelling!;

  const body = (
    <View
      style={{
        width: UNLOCKED_CARD_WIDTH,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.hairline,
      }}
    >
      {/* Type-tinted top colour block — radial-ish gradient via solid stack */}
      <View
        style={{
          height: 112,
          padding: 16,
          justifyContent: "space-between",
          backgroundColor: tint.from,
        }}
      >
        {/* Type badge */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon.Project size={12} color={tint.accent} />
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 1.6,
              color: tint.accent,
            }}
          >
            {typeLabel.toUpperCase()}
          </Text>
        </View>

        {/* Budget */}
        {budgetLabel ? (
          <View>
            <Text
              style={{
                fontSize: 9.5,
                fontWeight: "600",
                letterSpacing: 1.6,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              PROJECT BUDGET
            </Text>
            <Text
              style={{
                fontSize: 22,
                lineHeight: 26,
                fontWeight: "700",
                color: palette.text,
                fontVariant: ["tabular-nums"],
                letterSpacing: -0.3,
                marginTop: 4,
              }}
            >
              {budgetLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View style={{ padding: 16 }}>
        <Text
          numberOfLines={1}
          style={{
            ...type.titleSmall,
            color: palette.text,
            fontWeight: "600",
            letterSpacing: -0.15,
          }}
        >
          {title}
        </Text>
        {location ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              marginTop: 6,
            }}
          >
            <Icon.Location size={11} color={palette.textDim} />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12,
                color: palette.textMuted,
              }}
            >
              {location}
            </Text>
          </View>
        ) : null}

        {/* Specs */}
        {(bedrooms || bathrooms || thirdSpecValue) && (
          <View
            style={{
              flexDirection: "row",
              gap: 14,
              marginTop: 14,
            }}
          >
            {bedrooms ? <MiniSpec value={bedrooms} label="bed" /> : null}
            {bathrooms ? <MiniSpec value={bathrooms} label="bath" /> : null}
            {thirdSpecValue && thirdSpecLabel ? (
              <MiniSpec value={thirdSpecValue} label={thirdSpecLabel} />
            ) : null}
          </View>
        )}

        {/* Footer chips: status + docs */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: palette.hairline,
          }}
        >
          {isFilled !== undefined ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Icon.Lock
                size={11}
                color={isFilled ? palette.danger : palette.accent}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1.2,
                  color: isFilled ? palette.danger : palette.accentLight,
                }}
              >
                {isFilled ? "FILLED" : "UNLOCKED"}
              </Text>
            </View>
          ) : null}
          {typeof documentCount === "number" && documentCount > 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Icon.Document size={11} color={palette.textDim} />
              <Text
                style={{
                  fontSize: 11,
                  color: palette.textMuted,
                  fontWeight: "600",
                }}
              >
                {documentCount} doc{documentCount === 1 ? "" : "s"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );

  if (!onPress) return body;
  return (
    <Press onPress={onPress} haptic="soft" scaleTo={0.98}>
      {body}
    </Press>
  );
}

function MiniSpec({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Text
        style={{
          fontSize: 16,
          lineHeight: 20,
          fontWeight: "700",
          color: palette.text,
          fontVariant: ["tabular-nums"],
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
