/**
 * <BrowseProjectCard /> — premium marketplace card, v4.5.
 *
 * Each project type carries its own visual identity at the top of
 * the card, so a builder can scan a list and instantly recognise
 * the kind of work on offer:
 *
 *   · single_dwelling  → architectural blueprint linework on a
 *                        cool teal gradient base.
 *   · multi_dwelling   → townhouse / row-of-units strip on a cool
 *                        blue gradient base — denser, structured.
 *   · renovation       → warm timber/material mood (amber gradient
 *                        + horizontal grain stripes).
 *   · extension        → existing-footprint plus an extension overlay
 *                        outlined on a warm olive base.
 *
 * FULL state overrides the type-accent with a wine treatment:
 *   · Wine-tinted gradient + wine border + wine glow shadow.
 *   · A prominent rounded-pill FULL badge with lock icon, top-right.
 *
 * Composition:
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ ╭ type chip ╮              ╭ FULL pill ╮  ╭ heart save ╮   │
 *   │ ╰───────────╯               ╰───────────╯  ╰────────────╯  │
 *   │                                                            │
 *   │   [type-specific architectural SVG art band]               │
 *   │                                                            │
 *   │  Brunswick Dwelling                                        │
 *   │  📍 Brunswick, VIC                                         │
 *   │                                                            │
 *   │  ┌──────────────────────────────────────────────────────┐  │
 *   │  │ $500k–$1M   3 BED   2 BATH   200-250m²              │  │
 *   │  └──────────────────────────────────────────────────────┘  │
 *   │                                                            │
 *   │  ✓ Docs ready  ·  Tender ASAP  ·  High match               │
 *   │                                                            │
 *   │  Posted 13d ago                       2 docs   ›           │
 *   └────────────────────────────────────────────────────────────┘
 */

import { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Line,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { Icon } from "@/lib/icons";
import { haptics } from "@/lib/haptics";
import { palette, type } from "@/lib/theme";
import type { BrowseListItem } from "@/components/dashboard/types";

// ── Mappings ────────────────────────────────────────────────────────────

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
  "400_500": "400–500m²",
  over_500: "500m²+",
};

// ── Variant palette per project type ────────────────────────────────────

type VariantKey =
  | "single_dwelling"
  | "multi_dwelling"
  | "renovation"
  | "extension"
  | "full";

interface VariantTint {
  /** Top-of-card gradient stops (top, mid, fade-to-surface). */
  bandTop: string;
  bandMid: string;
  bandFade: string;
  /** Border color on the card outer. */
  border: string;
  /** Chip background + text for the type label. */
  chipBg: string;
  chipFg: string;
  /** Linework color used inside the SVG art band. */
  stroke: string;
  strokeFaint: string;
  /** Soft outer shadow color for the 3D float. */
  glow: string;
}

const VARIANT: Record<VariantKey, VariantTint> = {
  single_dwelling: {
    bandTop: "rgba(0, 212, 200, 0.18)",
    bandMid: "rgba(0, 212, 200, 0.07)",
    bandFade: "rgba(14, 19, 31, 1)",
    border: "rgba(0, 212, 200, 0.22)",
    chipBg: "rgba(0, 212, 200, 0.10)",
    chipFg: "#7EF5ED",
    stroke: "rgba(126, 245, 237, 0.65)",
    strokeFaint: "rgba(126, 245, 237, 0.22)",
    glow: "rgba(0, 212, 200, 0.16)",
  },
  multi_dwelling: {
    bandTop: "rgba(110, 165, 255, 0.22)",
    bandMid: "rgba(76, 144, 255, 0.08)",
    bandFade: "rgba(14, 19, 31, 1)",
    border: "rgba(110, 165, 255, 0.22)",
    chipBg: "rgba(110, 165, 255, 0.12)",
    chipFg: "#A8C6FF",
    stroke: "rgba(168, 198, 255, 0.65)",
    strokeFaint: "rgba(168, 198, 255, 0.22)",
    glow: "rgba(76, 144, 255, 0.14)",
  },
  renovation: {
    bandTop: "rgba(220, 142, 110, 0.22)",
    bandMid: "rgba(180, 105, 80, 0.10)",
    bandFade: "rgba(20, 16, 22, 1)",
    border: "rgba(220, 142, 110, 0.22)",
    chipBg: "rgba(220, 142, 110, 0.14)",
    chipFg: "#F2C0A8",
    stroke: "rgba(242, 192, 168, 0.55)",
    strokeFaint: "rgba(242, 192, 168, 0.22)",
    glow: "rgba(220, 142, 110, 0.14)",
  },
  extension: {
    bandTop: "rgba(252, 217, 140, 0.20)",
    bandMid: "rgba(202, 168, 100, 0.08)",
    bandFade: "rgba(20, 18, 16, 1)",
    border: "rgba(252, 217, 140, 0.22)",
    chipBg: "rgba(252, 217, 140, 0.14)",
    chipFg: "#FCD98C",
    stroke: "rgba(252, 217, 140, 0.55)",
    strokeFaint: "rgba(252, 217, 140, 0.22)",
    glow: "rgba(202, 168, 100, 0.14)",
  },
  full: {
    bandTop: "rgba(251, 113, 133, 0.22)",
    bandMid: "rgba(180, 80, 95, 0.10)",
    bandFade: "rgba(22, 14, 18, 1)",
    border: "rgba(251, 113, 133, 0.32)",
    chipBg: "rgba(251, 113, 133, 0.14)",
    chipFg: "#FFC4CD",
    stroke: "rgba(255, 196, 205, 0.55)",
    strokeFaint: "rgba(255, 196, 205, 0.22)",
    glow: "rgba(251, 113, 133, 0.20)",
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

// ── Helpers ─────────────────────────────────────────────────────────────

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

// Match-tier label is purely a UX hint derived from how close the
// project lines up with the builder's profile. Until we have the
// real signal from the server, we pick a tier based on isNew + budget
// presence — keeps the visual variety in the list.
function matchLabel(item: BrowseListItem): {
  label: string;
  tone: "accent" | "warm" | "muted";
} | null {
  if (item.isFull) return null;
  if (item.isNew) return { label: "High match", tone: "accent" };
  if (item.budgetBand && item.documentCount > 1) {
    return { label: "Strong match", tone: "warm" };
  }
  return null;
}

// ── Component ───────────────────────────────────────────────────────────

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

  // Press-scale via UI-thread worklet.
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
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: tint.border,
          backgroundColor: palette.surface,
          // 3D float — premium drop shadow, tinted in the variant glow
          // colour so single-dwelling cards have teal glow, FULL cards
          // have wine glow, etc.
          shadowColor: item.isFull ? "#FB7185" : "#00D4C8",
          shadowOpacity: item.isFull ? 0.22 : 0.16,
          shadowOffset: { width: 0, height: 16 },
          shadowRadius: 30,
          elevation: 10,
        }}
      >
        {/* Variant art band — top 130px region with type-specific SVG */}
        <View style={{ height: 130, position: "relative" }}>
          <LinearGradient
            colors={[tint.bandTop, tint.bandMid, tint.bandFade]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ ...StyleSheetAbsoluteFill }}
          />
          <VariantArt
            variant={v}
            stroke={tint.stroke}
            strokeFaint={tint.strokeFaint}
          />

          {/* Top-row chips: TYPE (left), FULL pill + heart (right) */}
          <View
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
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
              iconKind={item.type}
            />

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {item.isFull ? <FullPill /> : null}
              <HeartButton saved={isSaved} onToggle={onToggleSave} />
            </View>
          </View>
        </View>

        {/* Title block */}
        <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
          <Text
            numberOfLines={2}
            style={{
              ...type.title,
              fontSize: 21,
              lineHeight: 26,
              color: palette.text,
              fontWeight: "700",
              letterSpacing: -0.3,
            }}
          >
            {item.title}
          </Text>
          {location ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
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
        </View>

        {/* Stats strip — budget / beds / baths / floor area */}
        <View
          style={{
            marginHorizontal: 18,
            marginTop: 14,
            borderRadius: 14,
            backgroundColor: "rgba(255, 255, 255, 0.025)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.05)",
            flexDirection: "row",
            paddingVertical: 12,
          }}
        >
          <Stat
            label="BUDGET"
            value={budgetLabel ?? "—"}
            tone={item.isFull ? "muted" : "accent"}
            flex={1.6}
            isFirst
          />
          <StatDivider />
          <Stat
            label="BEDS"
            value={item.bedrooms != null ? String(item.bedrooms) : "—"}
            flex={1}
          />
          <StatDivider />
          <Stat
            label="BATHS"
            value={item.bathrooms != null ? String(item.bathrooms) : "—"}
            flex={1}
          />
          {buildLabel ? (
            <>
              <StatDivider />
              <Stat label="AREA" value={buildLabel} flex={1.6} />
            </>
          ) : null}
        </View>

        {/* Status row — micro badges, only shown when relevant */}
        {(item.documentCount > 0 || match) ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 18,
              marginTop: 14,
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
                icon={
                  <Icon.Spark
                    size={12}
                    color={
                      match.tone === "accent"
                        ? palette.accentLight
                        : match.tone === "warm"
                          ? "#FCD98C"
                          : palette.textMuted
                    }
                  />
                }
                label={match.label}
                color={
                  match.tone === "accent"
                    ? palette.accentLight
                    : match.tone === "warm"
                      ? "#FCD98C"
                      : palette.textMuted
                }
              />
            ) : null}
          </View>
        ) : null}

        {/* Footer: posted time + doc count + chevron */}
        <View
          style={{
            marginTop: 14,
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.04)",
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
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            {item.documentCount > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
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
            <Icon.ChevronRight size={16} color={palette.textDim} />
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
  iconKind,
}: {
  label: string;
  bg: string;
  fg: string;
  border: string;
  iconKind: string;
}) {
  const TypeIcon = pickTypeIcon(iconKind);
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
      <TypeIcon size={11} color={fg} />
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

function pickTypeIcon(kind: string) {
  switch (kind) {
    case "single_dwelling":
      return Icon.Home;
    case "multi_dwelling":
      return Icon.Project;
    case "renovation":
      return Icon.Tender; // hammer-ish — the closest in our curated set
    case "extension":
      return Icon.Spark;
    default:
      return Icon.Home;
  }
}

function FullPill() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: "rgba(251, 113, 133, 0.14)",
        borderWidth: 1,
        borderColor: "rgba(251, 113, 133, 0.4)",
        shadowColor: "#FB7185",
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <Icon.Lock size={11} color="#FFC4CD" strokeWidth={2} />
      <Text
        style={{
          fontSize: 11,
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
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: saved
              ? "rgba(0, 212, 200, 0.16)"
              : "rgba(255, 255, 255, 0.06)",
            borderWidth: 1,
            borderColor: saved
              ? "rgba(0, 212, 200, 0.4)"
              : "rgba(255, 255, 255, 0.10)",
            alignItems: "center",
            justifyContent: "center",
          },
          animStyle,
        ]}
      >
        {/* Heart icon — filled when saved. Using a small Svg for fill control. */}
        <HeartIcon filled={saved} />
      </Animated.View>
    </Pressable>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  const color = filled ? palette.accentLight : "rgba(255, 255, 255, 0.85)";
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M12 21s-7-4.5-9.5-9C0 7 3 3 7 3c2 0 3.5 1 5 2.5C13.5 4 15 3 17 3c4 0 7 4 4.5 9-2.5 4.5-9.5 9-9.5 9z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  flex = 1,
  isFirst = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "muted";
  flex?: number;
  isFirst?: boolean;
}) {
  const valueColor =
    tone === "accent"
      ? palette.accentLight
      : tone === "muted"
        ? palette.textMuted
        : palette.text;
  return (
    <View
      style={{
        flex,
        paddingHorizontal: isFirst ? 14 : 10,
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 9.5,
          fontWeight: "700",
          letterSpacing: 1.6,
          color: palette.textDim,
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: valueColor,
          marginTop: 4,
          letterSpacing: -0.1,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function StatDivider() {
  return (
    <View
      style={{
        width: 1,
        marginVertical: 6,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
      }}
    />
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
          letterSpacing: 0,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Variant art ─────────────────────────────────────────────────────────

const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

function VariantArt({
  variant,
  stroke,
  strokeFaint,
}: {
  variant: VariantKey;
  stroke: string;
  strokeFaint: string;
}) {
  switch (variant) {
    case "single_dwelling":
      return <SingleDwellingArt stroke={stroke} strokeFaint={strokeFaint} />;
    case "multi_dwelling":
      return <MultiDwellingArt stroke={stroke} strokeFaint={strokeFaint} />;
    case "renovation":
      return <RenovationArt stroke={stroke} strokeFaint={strokeFaint} />;
    case "extension":
      return <ExtensionArt stroke={stroke} strokeFaint={strokeFaint} />;
    case "full":
      // FULL keeps the original project type art's geometry but tinted
      // in wine — we render a neutral skyline so the wine treatment
      // doesn't read as type-specific.
      return <SingleDwellingArt stroke={stroke} strokeFaint={strokeFaint} />;
  }
}

/** Architectural blueprint — pitched-roof house with windows + grid. */
function SingleDwellingArt({
  stroke,
  strokeFaint,
}: {
  stroke: string;
  strokeFaint: string;
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 360 130"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheetAbsoluteFill}
    >
      <Defs>
        <SvgLinearGradient id="bpFade" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0E131F" stopOpacity="0.5" />
          <Stop offset="0.5" stopColor="#0E131F" stopOpacity="0" />
          <Stop offset="1" stopColor="#0E131F" stopOpacity="0.5" />
        </SvgLinearGradient>
      </Defs>

      {/* Grid */}
      {Array.from({ length: 16 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={i * 24}
          y1={0}
          x2={i * 24}
          y2={130}
          stroke={strokeFaint}
          strokeWidth={0.4}
        />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <Line
          key={`h${i}`}
          x1={0}
          y1={i * 20}
          x2={360}
          y2={i * 20}
          stroke={strokeFaint}
          strokeWidth={0.4}
        />
      ))}

      {/* House outline — pitched roof + walls right-of-centre */}
      <Path
        d="M 200 40 L 245 18 L 290 40 L 290 100 L 200 100 Z"
        stroke={stroke}
        strokeWidth={1.4}
        fill="none"
      />
      {/* Windows */}
      <Rect x={213} y={50} width={20} height={20} stroke={stroke} strokeWidth={1} fill="none" />
      <Rect x={258} y={50} width={20} height={20} stroke={stroke} strokeWidth={1} fill="none" />
      {/* Door */}
      <Rect x={233} y={78} width={20} height={22} stroke={stroke} strokeWidth={1} fill="none" />
      {/* Chimney */}
      <Rect x={258} y={26} width={6} height={10} stroke={stroke} strokeWidth={1} fill="none" />

      {/* Foundation reference line */}
      <Line x1={0} y1={108} x2={360} y2={108} stroke={stroke} strokeWidth={0.6} />

      {/* Dimension marks */}
      <Line x1={200} y1={116} x2={290} y2={116} stroke={strokeFaint} strokeWidth={0.6} />
      <Line x1={200} y1={113} x2={200} y2={119} stroke={strokeFaint} strokeWidth={0.6} />
      <Line x1={290} y1={113} x2={290} y2={119} stroke={strokeFaint} strokeWidth={0.6} />

      {/* North arrow */}
      <Path
        d="M 40 36 L 46 22 L 52 36 L 46 32 Z"
        stroke={stroke}
        strokeWidth={0.8}
        fill={stroke}
      />

      <Rect width="100%" height="100%" fill="url(#bpFade)" />
    </Svg>
  );
}

/** Townhouse / row-of-units strip — denser, layered. */
function MultiDwellingArt({
  stroke,
  strokeFaint,
}: {
  stroke: string;
  strokeFaint: string;
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 360 130"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheetAbsoluteFill}
    >
      <Defs>
        <SvgLinearGradient id="mdFade" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0E131F" stopOpacity="0.55" />
          <Stop offset="0.5" stopColor="#0E131F" stopOpacity="0" />
          <Stop offset="1" stopColor="#0E131F" stopOpacity="0.55" />
        </SvgLinearGradient>
      </Defs>

      {/* Faint grid — denser to feel structured */}
      {Array.from({ length: 24 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={i * 16}
          y1={0}
          x2={i * 16}
          y2={130}
          stroke={strokeFaint}
          strokeWidth={0.4}
        />
      ))}

      {/* Row of 4 townhouse facades, each with a small pitched roof */}
      {[60, 130, 200, 270].map((x, i) => {
        const height = 36 + (i % 2) * 6; // slight variation
        const top = 100 - height;
        return (
          <g key={`unit-${i}`}>
            <Rect
              x={x}
              y={top}
              width={60}
              height={height}
              stroke={stroke}
              strokeWidth={1.2}
              fill="none"
            />
            <Path
              d={`M ${x} ${top} L ${x + 30} ${top - 12} L ${x + 60} ${top}`}
              stroke={stroke}
              strokeWidth={1.2}
              fill="none"
            />
            {/* Window grid in each unit */}
            <Rect x={x + 8} y={top + 8} width={14} height={12} stroke={stroke} strokeWidth={0.8} fill="none" />
            <Rect x={x + 38} y={top + 8} width={14} height={12} stroke={stroke} strokeWidth={0.8} fill="none" />
            <Rect x={x + 22} y={top + 24} width={16} height={height - 32} stroke={stroke} strokeWidth={0.8} fill="none" />
          </g>
        );
      })}

      {/* Common foundation line */}
      <Line x1={0} y1={102} x2={360} y2={102} stroke={stroke} strokeWidth={0.6} />

      <Rect width="100%" height="100%" fill="url(#mdFade)" />
    </Svg>
  );
}

/** Renovation — warm horizontal "timber grain" stripes + arch detail. */
function RenovationArt({
  stroke,
  strokeFaint,
}: {
  stroke: string;
  strokeFaint: string;
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 360 130"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheetAbsoluteFill}
    >
      <Defs>
        <SvgLinearGradient id="renoFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1a1116" stopOpacity="0" />
          <Stop offset="1" stopColor="#1a1116" stopOpacity="0.6" />
        </SvgLinearGradient>
      </Defs>

      {/* Horizontal "grain" stripes — varying widths */}
      {[10, 22, 38, 52, 68, 82, 96, 114].map((y, i) => (
        <Line
          key={`grain${i}`}
          x1={0}
          y1={y}
          x2={360}
          y2={y}
          stroke={strokeFaint}
          strokeWidth={0.6 + (i % 2) * 0.4}
          opacity={0.6 + (i % 3) * 0.15}
        />
      ))}

      {/* Heritage facade — symmetrical with two arched windows */}
      <Rect
        x={120}
        y={30}
        width={120}
        height={70}
        stroke={stroke}
        strokeWidth={1.4}
        fill="none"
      />
      <Path
        d="M 120 30 L 180 14 L 240 30"
        stroke={stroke}
        strokeWidth={1.4}
        fill="none"
      />
      {/* Arched windows */}
      <Path
        d="M 138 60 L 138 80 L 162 80 L 162 60 A 12 12 0 0 0 138 60 Z"
        stroke={stroke}
        strokeWidth={1}
        fill="none"
      />
      <Path
        d="M 198 60 L 198 80 L 222 80 L 222 60 A 12 12 0 0 0 198 60 Z"
        stroke={stroke}
        strokeWidth={1}
        fill="none"
      />
      {/* Central door */}
      <Rect
        x={170}
        y={64}
        width={20}
        height={36}
        stroke={stroke}
        strokeWidth={1}
        fill="none"
      />

      <Rect width="100%" height="100%" fill="url(#renoFade)" />
    </Svg>
  );
}

/** Extension — existing footprint plus an overlaid extension box. */
function ExtensionArt({
  stroke,
  strokeFaint,
}: {
  stroke: string;
  strokeFaint: string;
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 360 130"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheetAbsoluteFill}
    >
      <Defs>
        <SvgLinearGradient id="extFade" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0E131F" stopOpacity="0.55" />
          <Stop offset="0.5" stopColor="#0E131F" stopOpacity="0" />
          <Stop offset="1" stopColor="#0E131F" stopOpacity="0.55" />
        </SvgLinearGradient>
      </Defs>

      {/* Grid */}
      {Array.from({ length: 16 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={i * 24}
          y1={0}
          x2={i * 24}
          y2={130}
          stroke={strokeFaint}
          strokeWidth={0.4}
        />
      ))}

      {/* Existing footprint — outlined solid */}
      <Rect
        x={120}
        y={36}
        width={90}
        height={66}
        stroke={stroke}
        strokeWidth={1.4}
        fill="none"
      />
      <Path
        d="M 120 36 L 165 18 L 210 36"
        stroke={stroke}
        strokeWidth={1.4}
        fill="none"
      />

      {/* Extension overlay — dashed outline, offset to the right */}
      <Rect
        x={210}
        y={56}
        width={60}
        height={46}
        stroke={stroke}
        strokeWidth={1.2}
        strokeDasharray="4 3"
        fill="none"
      />
      {/* Bridge / joiner line */}
      <Line x1={210} y1={68} x2={210} y2={102} stroke={stroke} strokeWidth={0.8} strokeDasharray="2 2" />

      {/* Plus mark indicating addition */}
      <Line x1={240} y1={70} x2={240} y2={86} stroke={stroke} strokeWidth={1.4} />
      <Line x1={232} y1={78} x2={248} y2={78} stroke={stroke} strokeWidth={1.4} />

      <Rect width="100%" height="100%" fill="url(#extFade)" />
    </Svg>
  );
}
