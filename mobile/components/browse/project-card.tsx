/**
 * <BrowseProjectCard /> — premium marketplace card, v4.6.
 *
 * No architectural art band — just clean type-tinted chrome:
 *   · The card border, type chip, and outer glow shadow carry the
 *     variant identity. Project types are recognisable from accent
 *     colour, not a drawn picture.
 *   · FULL state overrides every variant tint with wine (border +
 *     glow + pill).
 *
 * Composition:
 *   ┌────────────────────────────────────────────────────────┐
 *   │ ╭ type chip ╮              ╭ FULL ╮  ╭ heart ╮         │
 *   │ ╰───────────╯               ╰──────╯  ╰───────╯        │
 *   │                                                        │
 *   │ Project title                                          │
 *   │ 📍 Suburb, STATE                                       │
 *   │                                                        │
 *   │ 💰 $500k–$1M   🛏 3   🛁 2   📐 200–250m²              │
 *   │                                                        │
 *   │ ✓ Docs ready · Tender ASAP · High match               │
 *   │                                                        │
 *   │ ───────────────────────────────────────────────        │
 *   │ Posted 13d ago                       📄 2  ›           │
 *   └────────────────────────────────────────────────────────┘
 */

import { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { Icon } from "@/lib/icons";
import { haptics } from "@/lib/haptics";
import { palette, type } from "@/lib/theme";
import type { BrowseListItem } from "@/components/dashboard/types";

const TYPE_LABEL: Record<string, string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

const BUDGET_LABEL: Record<string, string> = {
  under_500k: "<$500k",
  "500k_1m": "$500k–$1M",
  "1m_1_5m": "$1–1.5M",
  "1_5m_2m": "$1.5–2M",
  "2m_3m": "$2–3M",
  "3m_5m": "$3–5M",
  over_5m: "$5M+",
};

const BUILD_LABEL: Record<string, string> = {
  under_100: "<100m²",
  "100_150": "100–150m²",
  "150_200": "150–200m²",
  "200_250": "200–250m²",
  "250_300": "250–300m²",
  "300_400": "300–400m²",
  "400_500": "400–500m²",
  over_500: "500m²+",
};

type VariantKey =
  | "single_dwelling"
  | "multi_dwelling"
  | "renovation"
  | "extension"
  | "full";

interface VariantTint {
  border: string;
  chipBg: string;
  chipFg: string;
  glow: string;
}

const VARIANT: Record<VariantKey, VariantTint> = {
  single_dwelling: {
    border: "rgba(0, 212, 200, 0.22)",
    chipBg: "rgba(0, 212, 200, 0.10)",
    chipFg: "#7EF5ED",
    glow: "#00D4C8",
  },
  multi_dwelling: {
    border: "rgba(110, 165, 255, 0.22)",
    chipBg: "rgba(110, 165, 255, 0.12)",
    chipFg: "#A8C6FF",
    glow: "#4C90FF",
  },
  renovation: {
    border: "rgba(220, 142, 110, 0.22)",
    chipBg: "rgba(220, 142, 110, 0.14)",
    chipFg: "#F2C0A8",
    glow: "#DC8E6E",
  },
  extension: {
    border: "rgba(252, 217, 140, 0.22)",
    chipBg: "rgba(252, 217, 140, 0.14)",
    chipFg: "#FCD98C",
    glow: "#FCD98C",
  },
  full: {
    border: "rgba(251, 113, 133, 0.32)",
    chipBg: "rgba(251, 113, 133, 0.14)",
    chipFg: "#FFC4CD",
    glow: "#FB7185",
  },
};

function variantOf(item: BrowseListItem): VariantKey {
  if (item.isFull) return "full";
  if (item.type === "single_dwelling") return "single_dwelling";
  if (item.type === "multi_dwelling") return "multi_dwelling";
  if (item.type === "renovation") return "renovation";
  if (item.type === "extension") return "extension";
  return "single_dwelling";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (diff < 60) return "just now";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function matchLabel(item: BrowseListItem): {
  label: string;
  color: string;
} | null {
  if (item.isFull) return null;
  if (item.isNew) return { label: "High match", color: palette.accentLight };
  if (item.budgetBand && item.documentCount > 1) {
    return { label: "Strong match", color: "#FCD98C" };
  }
  return null;
}

interface Props {
  item: BrowseListItem;
  isSaved: boolean;
  onToggleSave: () => void;
}

export function BrowseProjectCard({ item, isSaved, onToggleSave }: Props) {
  const v = variantOf(item);
  const tint = VARIANT[v];
  const typeLabel = TYPE_LABEL[item.type] ?? item.type;
  const budgetLabel = item.budgetBand
    ? BUDGET_LABEL[item.budgetBand]
    : null;
  const buildLabel = item.buildSizeBand
    ? BUILD_LABEL[item.buildSizeBand]
    : null;
  const location = useMemo(
    () => [item.suburb, item.state].filter(Boolean).join(", "),
    [item.suburb, item.state],
  );
  const match = matchLabel(item);

  const scale = useSharedValue(1);
  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.985, { mass: 0.4, damping: 18 });
  }, [scale]);
  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { mass: 0.4, damping: 16 });
  }, [scale]);
  const onPress = useCallback(() => {
    void haptics.tap();
    router.push(`/(main)/projects/${item.slug}` as never);
  }, [item.slug]);

  return (
    <Animated.View style={cardAnim}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${typeLabel}, ${
          item.isFull
            ? "full"
            : `${item.unlockedCount} of 3 builders unlocked`
        }`}
        style={{
          borderRadius: 20,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: tint.border,
          backgroundColor: palette.surface,
          padding: 16,
          // 3D float — premium drop shadow tinted by variant glow.
          shadowColor: tint.glow,
          shadowOpacity: item.isFull ? 0.22 : 0.14,
          shadowOffset: { width: 0, height: 14 },
          shadowRadius: 24,
          elevation: 8,
        }}
      >
        {/* Top row: type chip (left) + FULL pill + heart (right) */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TypeChip
            label={typeLabel}
            bg={tint.chipBg}
            fg={tint.chipFg}
            border={tint.border}
          />
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            {item.isFull ? <FullPill /> : null}
            <HeartButton saved={isSaved} onToggle={onToggleSave} />
          </View>
        </View>

        {/* Title + location */}
        <Text
          numberOfLines={2}
          style={{
            ...type.title,
            fontSize: 20,
            lineHeight: 25,
            color: palette.text,
            fontWeight: "700",
            letterSpacing: -0.3,
            marginTop: 14,
          }}
        >
          {item.title}
        </Text>
        {location ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              marginTop: 7,
            }}
          >
            <Icon.Location size={12} color={palette.textDim} />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12.5,
                color: palette.textMuted,
              }}
            >
              {location}
            </Text>
          </View>
        ) : null}

        {/* Stats strip — inline icons + values, no big labels */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.05)",
          }}
        >
          {budgetLabel ? (
            // No leading $ icon — the budget label already starts with
            // a dollar sign ("$500k–$1M"). Two dollar signs side-by-side
            // read as a typo.
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: palette.accentLight,
                letterSpacing: -0.1,
                fontVariant: ["tabular-nums"],
              }}
            >
              {budgetLabel}
            </Text>
          ) : null}
          {item.bedrooms != null ? (
            <Stat icon={<BedIcon />} value={String(item.bedrooms)} />
          ) : null}
          {item.bathrooms != null ? (
            <Stat icon={<BathIcon />} value={String(item.bathrooms)} />
          ) : null}
          {buildLabel ? (
            <Stat icon={<RulerIcon />} value={buildLabel} />
          ) : null}
        </View>

        {/* Unlock price ribbon — only when the project is NOT full
            (you can't unlock a filled project). Shows the original
            unlock fee struck through next to a big FREE badge. The
            value here is a stub until the server endpoint surfaces
            real per-project unlock pricing on BrowseListItem. */}
        {!item.isFull ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 14,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: "700",
                letterSpacing: 1.6,
                color: palette.textDim,
              }}
            >
              UNLOCK
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: palette.textDim,
                textDecorationLine: "line-through",
                textDecorationColor: palette.textDim,
                fontVariant: ["tabular-nums"],
              }}
            >
              $39
            </Text>
            <Text
              style={{
                fontSize: 22,
                lineHeight: 24,
                fontWeight: "800",
                color: palette.accentLight,
                letterSpacing: -0.4,
                fontVariant: ["tabular-nums"],
              }}
            >
              $0
            </Text>
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: "700",
                letterSpacing: 1.4,
                color: palette.accent,
              }}
            >
              FOUNDER
            </Text>
          </View>
        ) : null}

        {/* Status hints — small inline badges, only when relevant */}
        {item.documentCount > 0 || match ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 14,
              marginTop: 12,
            }}
          >
            {item.documentCount > 0 ? (
              <Hint
                icon={<Icon.CheckCircle size={12} color={palette.success} />}
                label="Docs ready"
                color={palette.success}
              />
            ) : null}
            {item.isNew ? (
              <Hint
                icon={<Icon.Date size={12} color={palette.textMuted} />}
                label="Tender ASAP"
                color={palette.textMuted}
              />
            ) : null}
            {match ? (
              <Hint
                icon={<Icon.Spark size={12} color={match.color} />}
                label={match.label}
                color={match.color}
              />
            ) : null}
          </View>
        ) : null}

        {/* Footer: posted + docs + chevron */}
        <View
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.05)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: palette.textDim,
              letterSpacing: 0.1,
            }}
          >
            Posted {relativeTime(item.publishedAt)}
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            {item.documentCount > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon.Document size={12} color={palette.textMuted} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: palette.textMuted,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {item.documentCount}
                </Text>
              </View>
            ) : null}
            <Icon.ChevronRight size={15} color={palette.textDim} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function TypeChip({
  label,
  bg,
  fg,
  border,
}: {
  label: string;
  bg: string;
  fg: string;
  border: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: fg,
        }}
      />
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: fg,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function FullPill() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "rgba(251, 113, 133, 0.14)",
        borderWidth: 1,
        borderColor: "rgba(251, 113, 133, 0.4)",
      }}
    >
      <Icon.Lock size={10} color="#FFC4CD" strokeWidth={2} />
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: "700",
          color: "#FFC4CD",
          letterSpacing: 1,
        }}
      >
        FULL
      </Text>
    </View>
  );
}

function HeartButton({
  saved,
  onToggle,
}: {
  saved: boolean;
  onToggle: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPress = useCallback(() => {
    void haptics.tap();
    scale.value = withSpring(0.85, {}, () => {
      scale.value = withSpring(1);
    });
    onToggle();
  }, [scale, onToggle]);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={saved ? "Unsave" : "Save"}
    >
      <Animated.View
        style={[
          {
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: saved
              ? "rgba(0, 212, 200, 0.16)"
              : "rgba(255, 255, 255, 0.05)",
            borderWidth: 1,
            borderColor: saved
              ? "rgba(0, 212, 200, 0.4)"
              : "rgba(255, 255, 255, 0.08)",
            alignItems: "center",
            justifyContent: "center",
          },
          animStyle,
        ]}
      >
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path
            d="M12 21s-7-4.5-9.5-9C0 7 3 3 7 3c2 0 3.5 1 5 2.5C13.5 4 15 3 17 3c4 0 7 4 4.5 9-2.5 4.5-9.5 9-9.5 9z"
            fill={saved ? palette.accentLight : "none"}
            stroke={saved ? palette.accentLight : "rgba(255, 255, 255, 0.85)"}
            strokeWidth={saved ? 0 : 1.6}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

function Stat({
  icon,
  value,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  accent?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
      }}
    >
      {icon}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: accent ? palette.accentLight : palette.text,
          letterSpacing: -0.1,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Hint({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      {icon}
      <Text
        style={{
          fontSize: 11.5,
          fontWeight: "600",
          color,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// Tiny SVG icons — bed, bath, ruler (lucide doesn't ship clean
// bed/bath/ruler at the size we want without re-importing).

function BedIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20"
        stroke={palette.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M6 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
        stroke={palette.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function BathIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5h0a1.5 1.5 0 0 0-1.5 1.5V14"
        stroke={palette.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M2 12h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM6 19v2M18 19v2"
        stroke={palette.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function RulerIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="m21.3 8.7-6-6a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l11.2-11.2a1 1 0 0 0 0-1.4Z"
        stroke={palette.textMuted}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M14.5 6.5 16 8M11.5 9.5 13 11M8.5 12.5 10 14M5.5 15.5 7 17"
        stroke={palette.textMuted}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}
