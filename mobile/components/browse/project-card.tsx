/**
 * <BrowseProjectCard /> — the marketplace card.
 *
 * Designed to read at a glance + survive thumb-scroll without losing
 * meaningful information. The card is the single most important
 * surface in the builder app — everything else fans out from a tap on
 * one of these.
 *
 * Visual recipe:
 *   · Generous padding + 16px corner radius — feels premium, not
 *     spreadsheet-y.
 *   · Brand glow on accent borders when active (n/3 slots open).
 *   · Type icon + label in a kicker row.
 *   · Title in semibold ui font, then suburb/state in dim text.
 *   · Inline meta row (budget · bed · bath · build size) — only the
 *     pieces that exist, no "—" placeholders.
 *   · Right column has: NEW badge (when <24h old) above slot indicator
 *     (●●○ visual). Slot indicator is the focal cue — a glance tells
 *     the builder whether to tap.
 *   · Heart save button bottom-right with pulse animation on toggle.
 *   · Time since live in dim mono at bottom-left.
 *
 * The card itself is a Pressable. Press-in nudges scale to 0.985 via
 * Reanimated for that "I'm responding" cue, then springs back on
 * release. No haptic on the press-in — the haptic fires inside the
 * tap handler so it's tied to the navigate, not the touch.
 */
import { useCallback, useEffect } from "react";
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
import {
  Bath,
  Bed,
  Building,
  Heart,
  Home as HomeIcon,
  Layers,
  Lock,
  MapPin,
  Wrench,
} from "lucide-react-native";

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
  over_5m: "Over $5M",
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

function typeIcon(type: string, size = 14) {
  const p = { size, color: "#7ef5ed", strokeWidth: 1.6 };
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
  const location = [item.suburb, item.state].filter(Boolean).join(", ");

  // Press-scale spring.
  const scale = useSharedValue(1);
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.985, { mass: 0.35, damping: 18 });
  }, [scale]);
  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { mass: 0.35, damping: 16 });
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
        className="rounded-2xl border bg-surface-1/40 px-4 py-4 overflow-hidden"
        style={{
          borderColor: item.isFull
            ? "rgba(255, 122, 138, 0.18)"
            : "rgba(0, 212, 200, 0.16)",
        }}
      >
        {/* Brand-tinted halo when active (open slots) — purely
              decorative, dims the dark-card-on-dark-background look. */}
        {!item.isFull ? (
          <View
            pointerEvents="none"
            className="absolute -top-12 -right-12 size-32 rounded-full"
            style={{ backgroundColor: "rgba(0, 212, 200, 0.05)" }}
          />
        ) : null}

        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 min-w-0">
            {/* Kicker */}
            <View className="flex-row items-center gap-1.5">
              {typeIcon(item.type, 13)}
              <Text className="text-text-muted text-[11px] font-ui tracking-[0.005em]">
                {typeLabel}
              </Text>
              {item.isNew ? <NewBadge /> : null}
            </View>

            {/* Title */}
            <Text
              className="text-text font-ui font-semibold text-[16px] tracking-[-0.005em] mt-2"
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {/* Location */}
            {location ? (
              <View className="flex-row items-center gap-1 mt-1">
                <MapPin size={11} color="#98b8d0" strokeWidth={1.6} />
                <Text
                  className="text-text-muted text-[12px]"
                  numberOfLines={1}
                >
                  {location}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Right-side slot pill */}
          <View className="items-end">
            <SlotIndicator unlockedCount={item.unlockedCount} isFull={item.isFull} />
          </View>
        </View>

        {/* Meta row */}
        <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1 mt-3">
          {budgetLabel ? <Meta value={budgetLabel} /> : null}
          {item.bedrooms != null ? (
            <Meta icon={<Bed size={11} color="#98b8d0" strokeWidth={1.6} />} value={item.bedrooms} />
          ) : null}
          {item.bathrooms != null ? (
            <Meta icon={<Bath size={11} color="#98b8d0" strokeWidth={1.6} />} value={item.bathrooms} />
          ) : null}
          {buildLabel ? <Meta value={buildLabel} /> : null}
        </View>

        {/* Footer row — time + heart */}
        <View className="flex-row items-center justify-between mt-3 -mb-1">
          <Text className="text-text-faint text-[11px]" numberOfLines={1}>
            {item.publishedAt ? relativeTime(item.publishedAt) : ""}
          </Text>
          <HeartButton isSaved={isSaved} onToggle={onToggleSave} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Slot indicator ──────────────────────────────────────────────────

function SlotIndicator({
  unlockedCount,
  isFull,
}: {
  unlockedCount: number;
  isFull: boolean;
}) {
  if (isFull) {
    return (
      <View
        className="px-2.5 h-7 rounded-full justify-center border"
        style={{
          backgroundColor: "rgba(255, 122, 138, 0.10)",
          borderColor: "rgba(255, 122, 138, 0.30)",
        }}
      >
        <View className="flex-row items-center gap-1">
          <Lock size={9} color="#ff7a8a" strokeWidth={1.8} />
          <Text
            className="text-[9.5px] tracking-[0.18em] uppercase font-ui font-semibold"
            style={{ color: "#ff7a8a" }}
          >
            Full
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View
      className="flex-row items-center gap-2 px-2.5 h-7 rounded-full border"
      style={{
        backgroundColor: "rgba(0, 212, 200, 0.10)",
        borderColor: "rgba(0, 212, 200, 0.30)",
      }}
    >
      <SlotDots filled={unlockedCount} total={3} />
      <Text
        className="text-[9.5px] tracking-[0.18em] uppercase font-ui font-semibold"
        style={{ color: "#7ef5ed" }}
      >
        {unlockedCount}/3
      </Text>
    </View>
  );
}

function SlotDots({ filled, total }: { filled: number; total: number }) {
  return (
    <View className="flex-row gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className="size-[5px] rounded-full"
          style={{
            backgroundColor:
              i < filled ? "#7ef5ed" : "rgba(126, 245, 237, 0.25)",
          }}
        />
      ))}
    </View>
  );
}

// ── Meta chip ───────────────────────────────────────────────────────

function Meta({
  icon,
  value,
}: {
  icon?: React.ReactNode;
  value: string | number;
}) {
  return (
    <View className="flex-row items-center gap-1">
      {icon}
      <Text className="text-text-muted text-[11.5px] font-ui">{value}</Text>
    </View>
  );
}

// ── NEW badge ───────────────────────────────────────────────────────

function NewBadge() {
  return (
    <View
      className="px-1.5 h-4 rounded-sm justify-center"
      style={{ backgroundColor: "#00d4c8" }}
    >
      <Text className="text-[8px] tracking-[0.16em] uppercase font-ui font-semibold text-accent-contrast">
        New
      </Text>
    </View>
  );
}

// ── Heart with pulse ────────────────────────────────────────────────

function HeartButton({
  isSaved,
  onToggle,
}: {
  isSaved: boolean;
  onToggle: () => void;
}) {
  const scale = useSharedValue(1);
  // Pulse — small grow + spring back. Fires when isSaved flips to true.
  useEffect(() => {
    if (isSaved) {
      scale.value = withTiming(1.25, {
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

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPress = useCallback(() => {
    void (isSaved ? haptics.tap() : haptics.success());
    onToggle();
  }, [isSaved, onToggle]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={isSaved ? "Remove from saved" : "Save project"}
      className="size-8 items-center justify-center rounded-full active:bg-surface-1/60"
    >
      <Animated.View style={animStyle}>
        <Heart
          size={18}
          color={isSaved ? "#ff7a8a" : "#567080"}
          fill={isSaved ? "#ff7a8a" : "transparent"}
          strokeWidth={isSaved ? 0 : 1.7}
        />
      </Animated.View>
    </Pressable>
  );
}
