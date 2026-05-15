/**
 * /(main)/tenders/[id] — owner-side tender detail.
 *
 * Drill-in from the comparison list. Renders:
 *   · Glass header with back + builder name
 *   · Hero block: price + duration + start + status pill
 *   · Builder card: identity, verification chips, track record
 *   · Cost breakdown table (when lines exist) with totals + variance hint
 *   · Pitch / conditions / exclusions
 *   · Sticky action bar at the bottom — state-aware (Shortlist /
 *     Award / Reject / Reopen). Award asks for confirmation and
 *     optionally cascades to reject all other live tenders on the
 *     same project.
 *
 * Closely mirrors the web equivalent. We don't show downloadable
 * tender documents here yet — that lands with native doc preview.
 */
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  CircleDot,
  FileText,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Screen } from "@/components/ui/screen";
import { Avatar } from "@/components/ui/avatar";
import {
  GlassHeader,
  useGlassHeaderHeight,
} from "@/components/ui/glass-header";
import { brandGradient, colors } from "@/lib/theme";
import { haptics } from "@/lib/haptics";
import { useOwnerTenderDetail } from "@/lib/owner-tenders";
import {
  formatAud,
  formatDays,
  formatRelative,
  formatStartMonth,
  formatWeeks,
  STATUS_META,
} from "@/components/owner-tenders/format";
import { sortLines, tradeLabel } from "@/components/owner-tenders/trades";
import type {
  OwnerTenderAction,
  OwnerTenderDetail,
} from "@/components/owner-tenders/types";

export default function OwnerTenderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tenderId = typeof id === "string" ? id : null;
  const {
    data,
    isLoading,
    isRefreshing,
    error,
    refresh,
    decide,
  } = useOwnerTenderDetail(tenderId);
  const headerHeight = useGlassHeaderHeight();
  const [busyAction, setBusyAction] = useState<OwnerTenderAction | null>(null);

  const tender = data?.tender ?? null;

  const handleDecide = useCallback(
    async (action: OwnerTenderAction, options?: { rejectOthers?: boolean }) => {
      if (!tender || busyAction) return;
      setBusyAction(action);
      void haptics.impact();
      const r = await decide(action, options);
      setBusyAction(null);
      if (r.ok) {
        void haptics.success();
        if (action === "award" && (r.value.rejectedIds?.length ?? 0) > 0) {
          Alert.alert(
            "Tender awarded",
            `${tender.builder.displayName} is your builder. ${r.value.rejectedIds!.length} other tender${r.value.rejectedIds!.length === 1 ? " was" : "s were"} auto-rejected.`,
          );
        }
      } else {
        void haptics.error();
        Alert.alert("Couldn't update", r.error);
      }
    },
    [tender, decide, busyAction],
  );

  const onAwardPress = useCallback(() => {
    if (!tender) return;
    Alert.alert(
      "Award this tender?",
      `${tender.builder.displayName} will be locked in as your builder. You can optionally reject every other tender so the comparison closes out clean.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Award only",
          onPress: () => void handleDecide("award"),
        },
        {
          text: "Award + reject others",
          style: "destructive",
          onPress: () => void handleDecide("award", { rejectOthers: true }),
        },
      ],
    );
  }, [tender, handleDecide]);

  return (
    <Screen variant="flat" edges={[]}>
      <GlassHeader
        left={
          <Pressable
            onPress={() => {
              void haptics.tap();
              router.back();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            <ChevronLeft size={20} color={colors.text} strokeWidth={1.8} />
          </Pressable>
        }
        center={
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: colors.textFaint,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 9.5,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                fontWeight: "600",
              }}
            >
              Tender
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 15,
                fontWeight: "600",
                letterSpacing: -0.1,
                marginTop: 1,
                maxWidth: 220,
              }}
            >
              {tender?.builder.displayName ?? "—"}
            </Text>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 4,
          paddingHorizontal: 20,
          paddingBottom: 200, // leave room for sticky action bar
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void haptics.tap();
              void refresh();
            }}
            tintColor={colors.accentLight}
            progressBackgroundColor={colors.bgRaised}
            progressViewOffset={headerHeight}
          />
        }
      >
        {isLoading && !tender ? (
          <View style={{ marginTop: 24, gap: 16 }}>
            <SkeletonBlock height={180} />
            <SkeletonBlock height={120} />
            <SkeletonBlock height={200} />
          </View>
        ) : error && !tender ? (
          <View
            style={{
              marginTop: 48,
              alignItems: "center",
              paddingHorizontal: 24,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              Couldn&apos;t load
            </Text>
            <Text
              style={{
                color: colors.textSubtle,
                fontFamily: "DMSans_400Regular",
                fontSize: 13.5,
                lineHeight: 19,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {error}
            </Text>
            <Pressable
              onPress={() => void refresh()}
              style={{
                marginTop: 20,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: "rgba(0, 212, 200, 0.16)",
                borderWidth: 1,
                borderColor: "rgba(0, 212, 200, 0.40)",
              }}
            >
              <Text
                style={{
                  color: colors.accentLight,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Try again
              </Text>
            </Pressable>
          </View>
        ) : tender ? (
          <>
            <Animated.View entering={FadeInUp.delay(40).duration(420).springify()}>
              <Hero tender={tender} />
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(100).duration(420).springify()}
              style={{ marginTop: 16 }}
            >
              <BuilderCard tender={tender} />
            </Animated.View>
            {tender.costLines.length > 0 ? (
              <Animated.View
                entering={FadeInUp.delay(160).duration(420).springify()}
                style={{ marginTop: 16 }}
              >
                <CostBreakdown tender={tender} />
              </Animated.View>
            ) : null}
            {tender.pitch ? (
              <Animated.View
                entering={FadeInUp.delay(220).duration(420).springify()}
                style={{ marginTop: 16 }}
              >
                <TextSection
                  kicker="Pitch"
                  icon={
                    <Sparkles
                      size={12}
                      color={colors.accentLight}
                      strokeWidth={1.9}
                    />
                  }
                  body={tender.pitch}
                />
              </Animated.View>
            ) : null}
            {tender.conditions ? (
              <Animated.View
                entering={FadeInUp.delay(260).duration(420).springify()}
                style={{ marginTop: 16 }}
              >
                <TextSection
                  kicker="Conditions"
                  icon={
                    <CircleDot
                      size={12}
                      color={colors.accentLight}
                      strokeWidth={1.9}
                    />
                  }
                  body={tender.conditions}
                />
              </Animated.View>
            ) : null}
            {tender.exclusions && tender.exclusions.length > 0 ? (
              <Animated.View
                entering={FadeInUp.delay(300).duration(420).springify()}
                style={{ marginTop: 16 }}
              >
                <ExclusionsSection items={tender.exclusions} />
              </Animated.View>
            ) : null}
            <Animated.View
              entering={FadeInUp.delay(340).duration(420).springify()}
              style={{ marginTop: 16 }}
            >
              <ValiditySection tender={tender} />
            </Animated.View>
          </>
        ) : null}
      </ScrollView>

      {tender ? (
        <ActionBar
          tender={tender}
          busyAction={busyAction}
          onShortlist={() => void handleDecide("shortlist")}
          onReject={() => void handleDecide("reject")}
          onAward={onAwardPress}
          onReopen={() => void handleDecide("reopen")}
        />
      ) : null}
    </Screen>
  );
}

// ── Hero ────────────────────────────────────────────────────────────

function Hero({ tender }: { tender: OwnerTenderDetail }) {
  const meta = STATUS_META[tender.status];
  const isAwarded = tender.status === "awarded";

  return (
    <View
      style={{
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: isAwarded
          ? "rgba(0, 212, 200, 0.55)"
          : "rgba(255, 255, 255, 0.10)",
        backgroundColor: "rgba(255,255,255,0.035)",
      }}
    >
      <LinearGradient
        colors={
          isAwarded
            ? [
                "rgba(0, 212, 200, 0.22)",
                "rgba(59, 130, 246, 0.12)",
                "rgba(7,13,24,0)",
              ]
            : [
                "rgba(0, 212, 200, 0.10)",
                "rgba(59, 130, 246, 0.06)",
                "rgba(7,13,24,0)",
              ]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text
            style={{
              color: colors.accent,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 10.5,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              fontWeight: "700",
            }}
          >
            Total price
          </Text>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: meta.border,
              backgroundColor: meta.bg,
            }}
          >
            <Text
              style={{
                color: meta.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 9.5,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                fontWeight: "700",
              }}
            >
              {meta.label}
            </Text>
          </View>
        </View>
        <Text
          style={{
            color: colors.text,
            fontFamily: "BebasNeue_400Regular",
            fontSize: 56,
            lineHeight: 58,
            letterSpacing: -0.8,
            marginTop: 6,
          }}
        >
          {formatAud(tender.totalPriceAud)}
        </Text>
        <View
          style={{
            height: 1,
            backgroundColor: "rgba(255,255,255,0.10)",
            marginTop: 16,
          }}
        />
        <View style={{ flexDirection: "row", gap: 18, marginTop: 14 }}>
          <HeroMetric label="Duration" value={formatWeeks(tender.durationWeeks)} />
          <HeroMetric label="Validity" value={formatDays(tender.validityDays)} />
          <HeroMetric
            label="Proposed start"
            value={formatStartMonth(tender.proposedStartMonth)}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        style={{
          color: colors.textFaint,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 9.5,
          letterSpacing: 2,
          textTransform: "uppercase",
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: colors.text,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 13.5,
          fontWeight: "600",
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Builder card ────────────────────────────────────────────────────

function BuilderCard({ tender }: { tender: OwnerTenderDetail }) {
  const b = tender.builder;
  const verified = b.abnVerified && b.anyLicenceVerified;
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.035)",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(255,255,255,0.10)",
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar name={b.displayName} initials={b.initials} size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.text,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            {b.displayName}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 3,
              flexWrap: "wrap",
            }}
          >
            {b.state ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <MapPin size={10} color={colors.textDim} strokeWidth={1.8} />
                <Text
                  style={{
                    color: colors.textSubtle,
                    fontFamily: "DMSans_400Regular",
                    fontSize: 11.5,
                  }}
                >
                  {b.state}
                </Text>
              </View>
            ) : null}
            {b.yearsInOperation ? (
              <>
                <Text style={{ color: colors.textDim, fontSize: 11 }}>·</Text>
                <Text
                  style={{
                    color: colors.textSubtle,
                    fontFamily: "DMSans_400Regular",
                    fontSize: 11.5,
                  }}
                >
                  {b.yearsInOperation} yr{b.yearsInOperation === 1 ? "" : "s"} in operation
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
      {(verified || b.awardedCount > 0) && (
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          {verified ? (
            <Chip
              icon={
                <ShieldCheck
                  size={11}
                  color={colors.accentLight}
                  strokeWidth={1.9}
                />
              }
              label="ABN + Licence verified"
            />
          ) : (
            <>
              {b.abnVerified ? (
                <Chip
                  icon={
                    <CheckCircle2
                      size={11}
                      color={colors.accentLight}
                      strokeWidth={1.9}
                    />
                  }
                  label="ABN verified"
                />
              ) : null}
              {b.anyLicenceVerified ? (
                <Chip
                  icon={
                    <CheckCircle2
                      size={11}
                      color={colors.accentLight}
                      strokeWidth={1.9}
                    />
                  }
                  label="Licence verified"
                />
              ) : null}
            </>
          )}
          {b.awardedCount > 0 ? (
            <Chip
              icon={
                <Trophy
                  size={11}
                  color={colors.accentLight}
                  strokeWidth={1.9}
                />
              }
              label={`Won ${b.awardedCount} on BuilderHQ`}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(0, 212, 200, 0.30)",
        backgroundColor: "rgba(0, 212, 200, 0.08)",
      }}
    >
      {icon}
      <Text
        style={{
          color: colors.accentLight,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 11,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Cost breakdown ──────────────────────────────────────────────────

function CostBreakdown({ tender }: { tender: OwnerTenderDetail }) {
  const sortedLines = useMemo(() => sortLines(tender.costLines), [tender.costLines]);
  const sum = useMemo(
    () => tender.costLines.reduce((s, l) => s + l.amountAud, 0),
    [tender.costLines],
  );
  const variance =
    tender.totalPriceAud != null ? sum - tender.totalPriceAud : null;

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.035)",
      }}
    >
      <SectionHeader
        kicker="Cost breakdown"
        right={`${tender.costLines.length} line${tender.costLines.length === 1 ? "" : "s"}`}
      />
      <View style={{ marginTop: 12, gap: 2 }}>
        {sortedLines.map((line, i) => (
          <View
            key={line.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 9,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: "rgba(255,255,255,0.06)",
            }}
          >
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontFamily: "DMSans_400Regular",
                fontSize: 13,
              }}
              numberOfLines={1}
            >
              {line.label ?? tradeLabel(line.trade)}
            </Text>
            <Text
              style={{
                color: colors.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {formatAud(line.amountAud)}
            </Text>
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginTop: 10,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.10)",
        }}
      >
        <Text
          style={{
            flex: 1,
            color: colors.textSubtle,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 11,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            fontWeight: "700",
          }}
        >
          Breakdown sum
        </Text>
        <Text
          style={{
            color: colors.text,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {formatAud(sum)}
        </Text>
      </View>
      {variance != null && variance !== 0 ? (
        <View
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 12,
            backgroundColor: "rgba(251, 184, 64, 0.08)",
            borderWidth: 1,
            borderColor: "rgba(251, 184, 64, 0.30)",
          }}
        >
          <Text
            style={{
              color: "#fbb840",
              fontFamily: "DMSans_400Regular",
              fontSize: 12,
              lineHeight: 17,
            }}
          >
            {variance > 0
              ? `Breakdown is ${formatAud(variance)} above the headline total.`
              : `Breakdown is ${formatAud(Math.abs(variance))} below the headline total.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Text sections ───────────────────────────────────────────────────

function TextSection({
  kicker,
  icon,
  body,
}: {
  kicker: string;
  icon: React.ReactNode;
  body: string;
}) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.035)",
      }}
    >
      <SectionHeader kicker={kicker} icon={icon} />
      <Text
        style={{
          color: colors.text,
          fontFamily: "DMSans_400Regular",
          fontSize: 13.5,
          lineHeight: 21,
          marginTop: 10,
        }}
      >
        {body}
      </Text>
    </View>
  );
}

function ExclusionsSection({ items }: { items: string[] }) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.035)",
      }}
    >
      <SectionHeader
        kicker="Exclusions"
        icon={<X size={12} color="rgba(255, 160, 160, 0.95)" strokeWidth={2.2} />}
        right={`${items.length}`}
      />
      <View style={{ marginTop: 10, gap: 8 }}>
        {items.map((ex, i) => (
          <View
            key={`${ex}-${i}`}
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}
          >
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(255, 160, 160, 0.85)",
                marginTop: 8,
              }}
            />
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontFamily: "DMSans_400Regular",
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              {ex}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ValiditySection({ tender }: { tender: OwnerTenderDetail }) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.035)",
      }}
    >
      <SectionHeader
        kicker="Timing"
        icon={<FileText size={12} color={colors.accentLight} strokeWidth={1.9} />}
      />
      <View style={{ flexDirection: "row", gap: 18, marginTop: 12 }}>
        <HeroMetric
          label="Submitted"
          value={tender.submittedAtIso ? formatRelative(tender.submittedAtIso) : "—"}
        />
        <HeroMetric
          label="Decided"
          value={tender.decidedAtIso ? formatRelative(tender.decidedAtIso) : "—"}
        />
        <HeroMetric
          label="Documents"
          value={`${tender.documentCount}`}
        />
      </View>
    </View>
  );
}

// ── Section header ──────────────────────────────────────────────────

function SectionHeader({
  kicker,
  icon,
  right,
}: {
  kicker: string;
  icon?: React.ReactNode;
  right?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {icon}
        <Text
          style={{
            color: colors.accentLight,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 10.5,
            letterSpacing: 2.4,
            textTransform: "uppercase",
            fontWeight: "700",
          }}
        >
          {kicker}
        </Text>
      </View>
      {right ? (
        <Text
          style={{
            color: colors.textDim,
            fontFamily: "DMSans_400Regular",
            fontSize: 11,
          }}
        >
          {right}
        </Text>
      ) : null}
    </View>
  );
}

// ── Action bar (sticky) ─────────────────────────────────────────────

function ActionBar({
  tender,
  busyAction,
  onShortlist,
  onReject,
  onAward,
  onReopen,
}: {
  tender: OwnerTenderDetail;
  busyAction: OwnerTenderAction | null;
  onShortlist: () => void;
  onReject: () => void;
  onAward: () => void;
  onReopen: () => void;
}) {
  // Possible actions based on current status. Mirrors the service's
  // allowedFrom + the web comparison page UX.
  const can = useMemo(() => {
    switch (tender.status) {
      case "submitted":
        return { shortlist: true, award: true, reject: true, reopen: false };
      case "shortlisted":
        return { shortlist: false, award: true, reject: true, reopen: true };
      case "awarded":
        return { shortlist: false, award: false, reject: true, reopen: true };
      case "rejected":
        return { shortlist: false, award: false, reject: false, reopen: true };
      default:
        return { shortlist: false, award: false, reject: false, reopen: false };
    }
  }, [tender.status]);

  // No actions to surface — e.g. draft / withdrawn. Render nothing.
  if (!can.shortlist && !can.award && !can.reject && !can.reopen) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingBottom: 28,
        paddingTop: 14,
      }}
    >
      <LinearGradient
        colors={[
          "rgba(7, 13, 24, 0)",
          "rgba(7, 13, 24, 0.55)",
          "rgba(7, 13, 24, 0.92)",
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
        pointerEvents="none"
      />
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: 8,
          borderRadius: 22,
          backgroundColor: "rgba(255,255,255,0.05)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        {can.reopen ? (
          <ActionButton
            kind="ghost"
            label="Reopen"
            icon={<RotateCcw size={14} color={colors.text} strokeWidth={1.9} />}
            busy={busyAction === "reopen"}
            onPress={onReopen}
          />
        ) : null}
        {can.shortlist ? (
          <ActionButton
            kind="ghost"
            label="Shortlist"
            icon={
              <Sparkles
                size={14}
                color={colors.accentLight}
                strokeWidth={1.9}
              />
            }
            busy={busyAction === "shortlist"}
            onPress={onShortlist}
          />
        ) : null}
        {can.reject ? (
          <ActionButton
            kind="ghost"
            label="Reject"
            icon={
              <X size={14} color="rgba(255, 160, 160, 0.95)" strokeWidth={2.0} />
            }
            busy={busyAction === "reject"}
            tone="danger"
            onPress={onReject}
          />
        ) : null}
        {can.award ? (
          <ActionButton
            kind="primary"
            label="Award"
            icon={
              <Award size={14} color="#031118" strokeWidth={2.2} />
            }
            busy={busyAction === "award"}
            onPress={onAward}
          />
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  kind,
  tone,
  busy,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  kind: "primary" | "ghost";
  tone?: "danger";
  busy: boolean;
  onPress: () => void;
}) {
  const isPrimary = kind === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flex: 1, borderRadius: 14, overflow: "hidden", opacity: busy ? 0.6 : 1 }}
    >
      {isPrimary ? (
        <LinearGradient
          colors={brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {icon}
          <Text
            style={{
              color: "#031118",
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 13,
              fontWeight: "700",
              letterSpacing: 0.3,
            }}
          >
            {busy ? "Working…" : label}
          </Text>
        </LinearGradient>
      ) : (
        <View
          style={{
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor:
              tone === "danger"
                ? "rgba(255, 120, 120, 0.10)"
                : "rgba(255, 255, 255, 0.04)",
            borderWidth: 1,
            borderColor:
              tone === "danger"
                ? "rgba(255, 120, 120, 0.32)"
                : "rgba(255, 255, 255, 0.10)",
            borderRadius: 14,
          }}
        >
          {icon}
          <Text
            style={{
              color:
                tone === "danger"
                  ? "rgba(255, 160, 160, 0.95)"
                  : colors.text,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 13,
              fontWeight: "700",
              letterSpacing: 0.3,
            }}
          >
            {busy ? "Working…" : label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────

function SkeletonBlock({ height }: { height: number }) {
  return (
    <View
      style={{
        height,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
      }}
    />
  );
}
