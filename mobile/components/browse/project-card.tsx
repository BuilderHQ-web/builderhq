/**
 * <BrowseProjectCard /> — premium marketplace card.
 *
 * Design language (matches the Revolut / Airbnb listing feel the
 * brief asked for):
 *   · Soft glass surface — semi-transparent navy with a 1px white
 *     top-inner highlight and a hairline outer border. No harsh
 *     outlines, no bright fills.
 *   · Wide-aspect hero region at the top of the card so the eye
 *     locks onto a status badge band before scanning details below.
 *     (Future: replace the texture with a real project photo when
 *     uploads ship.) For now: a subtle teal gradient texture matching
 *     the brand canvas.
 *   · Title in 17px semibold, suburb dim 12.5px directly below.
 *     Right-aligned status chip (NEW / FULL / n/3 slots).
 *   · Meta row (budget · beds · baths · size) tight to the title.
 *   · Footer separator + posted-time + heart-save button.
 *   · Press-scale spring on tap (UI-thread worklet) + haptic.
 *
 * Status treatment:
 *   · `NEW` (posted <24h)         → teal chip with sparkle dot
 *   · `n/3 BUILDERS`              → teal chip with filled-slot dots
 *   · `FULL` (3/3)                → muted rose chip — clearly off-
 *                                   limits, not alarming
 *
 * Tap → project detail. Heart tap is separate (stops propagation via
 * the heart's own Pressable swallowing the gesture).
 */
import { useCallback, useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bath,
  Bed,
  Building,
  Heart,
  Home as HomeIcon,
  Layers,
  Lock,
  MapPin,
  Ruler,
  Sparkles,
  Wrench,
} from "lucide-react-native";

import { colors } from "@/lib/theme";
import { haptics } from "@/lib/haptics";
import type { BrowseListItem } from "@/components/dashboard/types";

const TYPE_LABEL: Record<string, string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};
const BUDGET_LABEL: Record<string, string> = {
  under_500k: "Under $500k",
  "500k_1m": "$500k – $1M",
  "1m_1_5m": "$1M – $1.5M",
  "1_5m_2m": "$1.5M – $2M",
  "2m_3m": "$2M – $3M",
  "3m_5m": "$3M – $5M",
  over_5m: "$5M+",
};
const BUILD_LABEL: Record<string, string> = {
  under_100: "<100m²",
  "100_150": "100–150m²",
  "150_200": "150–200m²",
  "200_250": "200–250m²",
  "250_300": "250–300m²",
  "300_400": "300–400m²",
  over_400: "400m²+",
};

function typeIcon(type: string, size = 13, color = colors.accentLight) {
  const p = { size, color, strokeWidth: 1.6 };
  switch (type) {
    case "single_dwelling":
      return <HomeIcon {...p} />;
    case "multi_dwelling":
      return <Building {...p} />;
    case "renovation":
      return <Wrench {...p} />;
    case "extension":
      return <Layers {...p} />;
    default:
      return <HomeIcon {...p} />;
  }
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

export function BrowseProjectCard({
  item,
  isSaved,
  onToggleSave,
}: {
  item: BrowseListItem;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  const typeLabel = TYPE_LABEL[item.type] ?? item.type;
  const budgetLabel = item.budgetBand ? BUDGET_LABEL[item.budgetBand] : null;
  const buildLabel = item.buildSizeBand ? BUILD_LABEL[item.buildSizeBand] : null;
  const location = useMemo(
    () => [item.suburb, item.state].filter(Boolean).join(", "),
    [item.suburb, item.state],
  );

  // Press-scale spring (worklet on UI thread).
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
        accessibilityLabel={`${item.title}, ${typeLabel}, ${item.isFull ? "full" : `${item.unlockedCount} of 3 builders unlocked`}`}
        style={{
          borderRadius: 22,
          overflow: "hidden",
          backgroundColor: "rgba(255, 255, 255, 0.035)",
          borderWidth: 1,
          borderColor: item.isFull
            ? "rgba(255, 122, 138, 0.18)"
            : "rgba(255, 255, 255, 0.07)",
        }}
      >
        {/* Inner top highlight — the glass tell */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            zIndex: 1,
          }}
        />

        {/* Hero band — subtle teal gradient texture so the card has
              presence even without project photos. Status chips sit
              over this band. Will swap to a real hero image when
              photo uploads ship. */}
        <View style={{ height: 78, position: "relative", overflow: "hidden" }}>
          <LinearGradient
            colors={
              item.isFull
                ? [
                    "rgba(255, 122, 138, 0.12)",
                    "rgba(255, 122, 138, 0.04)",
                    "rgba(7, 13, 24, 0)",
                  ]
                : [
                    "rgba(0, 212, 200, 0.18)",
                    "rgba(59, 130, 246, 0.10)",
                    "rgba(7, 13, 24, 0)",
                  ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", inset: 0 } as never}
          />

          {/* Type chip — top-left */}
          <View
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              height: 24,
              paddingHorizontal: 8,
              borderRadius: 12,
              backgroundColor: "rgba(7, 13, 24, 0.55)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.10)",
            }}
          >
            {typeIcon(item.type, 11, colors.accentLight)}
            <Text
              style={{
                color: colors.textMuted,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 10.5,
                fontWeight: "600",
                letterSpacing: 0.2,
              }}
            >
              {typeLabel}
            </Text>
          </View>

          {/* Status chip — top-right (NEW / n/3 / FULL) */}
          <View
            style={{
              position: "absolute",
              top: 14,
              right: 14,
            }}
          >
            <StatusChip
              isFull={item.isFull}
              isNew={item.isNew}
              unlockedCount={item.unlockedCount}
            />
          </View>

          {/* Heart — bottom-right corner of the hero band */}
          <View
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
            }}
          >
            <HeartButton isSaved={isSaved} onToggle={onToggleSave} />
          </View>
        </View>

        {/* Body */}
        <View style={{ padding: 16, paddingTop: 14, paddingBottom: 14 }}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.text,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 17,
              fontWeight: "600",
              letterSpacing: -0.2,
            }}
          >
            {item.title}
          </Text>
          {location ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              <MapPin size={11} color={colors.textMuted} strokeWidth={1.6} />
              <Text
                numberOfLines={1}
                style={{
                  color: colors.textMuted,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 12.5,
                }}
              >
                {location}
              </Text>
            </View>
          ) : null}

          {/* Meta row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
              marginTop: 12,
            }}
          >
            {budgetLabel ? <Meta value={budgetLabel} bold /> : null}
            {item.bedrooms != null ? (
              <Meta
                icon={<Bed size={11} color={colors.textMuted} strokeWidth={1.6} />}
                value={item.bedrooms}
              />
            ) : null}
            {item.bathrooms != null ? (
              <Meta
                icon={<Bath size={11} color={colors.textMuted} strokeWidth={1.6} />}
                value={item.bathrooms}
              />
            ) : null}
            {buildLabel ? (
              <Meta
                icon={<Ruler size={11} color={colors.textMuted} strokeWidth={1.6} />}
                value={buildLabel}
              />
            ) : null}
          </View>

          {/* Footer — separator + relative time */}
          {item.publishedAt ? (
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
                  color: colors.textFaint,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 11,
                }}
              >
                Posted {relativeTime(item.publishedAt)}
              </Text>
              {item.documentCount > 0 ? (
                <Text
                  style={{
                    color: colors.textFaint,
                    fontFamily: "DMSans_400Regular",
                    fontSize: 11,
                  }}
                >
                  {item.documentCount} doc{item.documentCount === 1 ? "" : "s"}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Status chip ─────────────────────────────────────────────────────

function StatusChip({
  isFull,
  isNew,
  unlockedCount,
}: {
  isFull: boolean;
  isNew: boolean;
  unlockedCount: number;
}) {
  if (isFull) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          height: 24,
          paddingHorizontal: 9,
          borderRadius: 12,
          backgroundColor: "rgba(255, 122, 138, 0.14)",
          borderWidth: 1,
          borderColor: "rgba(255, 122, 138, 0.32)",
        }}
      >
        <Lock size={10} color={colors.danger} strokeWidth={1.8} />
        <Text
          style={{
            color: colors.danger,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          Full
        </Text>
      </View>
    );
  }
  if (isNew) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          height: 24,
          paddingHorizontal: 9,
          borderRadius: 12,
          backgroundColor: "rgba(0, 212, 200, 0.18)",
          borderWidth: 1,
          borderColor: "rgba(0, 212, 200, 0.40)",
        }}
      >
        <Sparkles size={10} color={colors.accentLight} strokeWidth={1.8} />
        <Text
          style={{
            color: colors.accentLight,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          New
        </Text>
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 24,
        paddingHorizontal: 9,
        borderRadius: 12,
        backgroundColor: "rgba(0, 212, 200, 0.10)",
        borderWidth: 1,
        borderColor: "rgba(0, 212, 200, 0.28)",
      }}
    >
      <View style={{ flexDirection: "row", gap: 3 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor:
                i < unlockedCount
                  ? colors.accentLight
                  : "rgba(125, 245, 237, 0.22)",
            }}
          />
        ))}
      </View>
      <Text
        style={{
          color: colors.accentLight,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 1.4,
        }}
      >
        {unlockedCount}/3
      </Text>
    </View>
  );
}

// ── Meta chip ───────────────────────────────────────────────────────

function Meta({
  icon,
  value,
  bold,
}: {
  icon?: React.ReactNode;
  value: string | number;
  bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      {icon}
      <Text
        style={{
          color: bold ? colors.text : colors.textMuted,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 12.5,
          fontWeight: bold ? "600" : "500",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Heart with pulse-on-save ────────────────────────────────────────

function HeartButton({
  isSaved,
  onToggle,
}: {
  isSaved: boolean;
  onToggle: () => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSaved) {
      scale.value = withTiming(1.28, {
        duration: 140,
        easing: Easing.out(Easing.quad),
      });
      const t = setTimeout(() => {
        scale.value = withSpring(1, { mass: 0.4, damping: 12 });
      }, 140);
      return () => {
        clearTimeout(t);
        cancelAnimation(scale);
      };
    }
    return () => cancelAnimation(scale);
  }, [isSaved, scale]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPress = useCallback(() => {
    void (isSaved ? haptics.tap() : haptics.success());
    onToggle();
  }, [isSaved, onToggle]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={isSaved ? "Remove from saved" : "Save project"}
      style={{
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        backgroundColor: "rgba(7, 13, 24, 0.45)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
    >
      <Animated.View style={anim}>
        <Heart
          size={15}
          color={isSaved ? colors.danger : colors.text}
          fill={isSaved ? colors.danger : "transparent"}
          strokeWidth={isSaved ? 0 : 1.6}
        />
      </Animated.View>
    </Pressable>
  );
}
