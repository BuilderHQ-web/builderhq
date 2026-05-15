/**
 * /(main)/projects/[slug]/tenders — owner tender comparison list.
 *
 * Lands when the owner taps the "X tenders received" section from
 * their project detail page. Renders:
 *   · Glass header with back button + project title
 *   · Hero analytics strip (price min / median / max + verified ratio)
 *   · Filter chips (All / Submitted / Shortlisted / Awarded / Rejected)
 *   · One comparison card per tender, sorted newest-first
 *
 * Each card shows builder identity, status pill, headline price +
 * duration, completeness ring, verification chips. Tap → detail
 * drill-in at `./[tenderId]`.
 */
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Screen } from "@/components/ui/screen";
import { Avatar } from "@/components/ui/avatar";
import {
  GlassHeader,
  useGlassHeaderHeight,
} from "@/components/ui/glass-header";
import { RadarPulse } from "@/components/ui/radar-pulse";
import { brandGradient, colors } from "@/lib/theme";
import { haptics } from "@/lib/haptics";
import { useOwnerTenderList } from "@/lib/owner-tenders";
import {
  formatAud,
  formatAudCompact,
  formatRelative,
  formatStartMonth,
  formatWeeks,
  STATUS_META,
} from "@/components/owner-tenders/format";
import type {
  OwnerTenderStatus,
  OwnerTenderSummary,
} from "@/components/owner-tenders/types";

type StatusFilter = "all" | "submitted" | "shortlisted" | "awarded" | "rejected";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "submitted", label: "Submitted" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "awarded", label: "Awarded" },
  { id: "rejected", label: "Rejected" },
];

export default function OwnerTendersScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const projectSlug = typeof slug === "string" ? slug : null;
  const { data, isLoading, error, refresh, isRefreshing } =
    useOwnerTenderList(projectSlug);
  const headerHeight = useGlassHeaderHeight();
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.tenders;
    return data.tenders.filter((t) => t.status === filter);
  }, [data, filter]);

  // Lowest priced tender — earns the "Best price" badge on the card.
  const bestPriceTenderId = useMemo(() => {
    if (!data) return null;
    let best: { id: string; price: number } | null = null;
    for (const t of data.tenders) {
      if (t.totalPriceAud != null && t.totalPriceAud > 0) {
        if (!best || t.totalPriceAud < best.price) {
          best = { id: t.id, price: t.totalPriceAud };
        }
      }
    }
    return best?.id ?? null;
  }, [data]);

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
              Tenders
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
              {data?.projectTitle ?? "Comparison"}
            </Text>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 4,
          paddingHorizontal: 20,
          paddingBottom: 140,
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
        <Animated.View entering={FadeInUp.delay(40).duration(420).springify()}>
          <Text
            style={{
              color: colors.accent,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 11,
              letterSpacing: 2.6,
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            Comparison
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(100).duration(420).springify()}>
          <Text
            style={{
              color: colors.text,
              fontFamily: "BebasNeue_400Regular",
              fontSize: 52,
              lineHeight: 54,
              letterSpacing: -0.6,
              marginTop: 6,
            }}
          >
            {data ? `${data.analytics.count} tender${data.analytics.count === 1 ? "" : "s"}` : "Tenders"}
            <Text style={{ color: colors.accentLight }}>.</Text>
          </Text>
        </Animated.View>

        {isLoading && !data ? (
          <View style={{ marginTop: 32, gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  height: 140,
                  borderRadius: 22,
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.06)",
                }}
              />
            ))}
          </View>
        ) : error && !data ? (
          <EmptyState
            title="Couldn't load"
            copy={error}
            ctaLabel="Try again"
            onCta={() => void refresh()}
          />
        ) : !data?.tenders.length ? (
          <EmptyState
            title="No tenders yet"
            copy="Verified builders who unlock this project can submit tenders. They'll appear here, side-by-side, ready to compare."
          />
        ) : (
          <>
            <Animated.View
              entering={FadeInUp.delay(160).duration(420).springify()}
              style={{ marginTop: 28 }}
            >
              <AnalyticsStrip data={data} />
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(220).duration(420).springify()}
              style={{ marginTop: 18 }}
            >
              <FilterChips
                current={filter}
                onChange={(f) => {
                  void haptics.tap();
                  setFilter(f);
                }}
                counts={countByStatus(data.tenders)}
              />
            </Animated.View>

            {filtered.length === 0 ? (
              <View
                style={{
                  marginTop: 24,
                  padding: 18,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <Text style={{ color: colors.textSubtle, fontFamily: "DMSans_400Regular", fontSize: 13 }}>
                  No tenders match this filter.
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 18, gap: 12 }}>
                {filtered.map((t, i) => (
                  <Animated.View
                    key={t.id}
                    entering={FadeInUp.delay(260 + i * 50).duration(380).springify()}
                  >
                    <TenderCard
                      tender={t}
                      isBestPrice={t.id === bestPriceTenderId}
                    />
                  </Animated.View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// ── Analytics strip ─────────────────────────────────────────────────

function AnalyticsStrip({ data }: { data: NonNullable<ReturnType<typeof useOwnerTenderList>["data"]> }) {
  const a = data.analytics;
  return (
    <View
      style={{
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(0, 212, 200, 0.30)",
        backgroundColor: "rgba(0, 212, 200, 0.06)",
      }}
    >
      <LinearGradient
        colors={[
          "rgba(0, 212, 200, 0.18)",
          "rgba(59, 130, 246, 0.12)",
          "rgba(7, 13, 24, 0.0)",
        ]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18, gap: 14 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                color: colors.accentLight,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 10,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                fontWeight: "600",
              }}
            >
              Price range
            </Text>
            <Text
              style={{
                color: colors.text,
                fontFamily: "BebasNeue_400Regular",
                fontSize: 32,
                lineHeight: 34,
                letterSpacing: -0.4,
                marginTop: 4,
              }}
            >
              {formatAudCompact(a.price.min)} – {formatAudCompact(a.price.max)}
            </Text>
            {a.price.median != null ? (
              <Text
                style={{
                  color: colors.textSubtle,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Median {formatAud(a.price.median)}
              </Text>
            ) : null}
          </View>
          {a.price.spread != null ? (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <TrendingDown size={11} color={colors.accentLight} strokeWidth={1.8} />
              <Text
                style={{
                  color: colors.text,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {Math.round(a.price.spread * 100)}% spread
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: "rgba(255,255,255,0.10)",
          }}
        />

        <View style={{ flexDirection: "row", gap: 18 }}>
          <Metric label="Builders" value={`${a.uniqueBuilders}`} />
          <Metric
            label="Duration"
            value={
              a.duration.median != null
                ? `${a.duration.median} wks`
                : "—"
            }
          />
          <Metric
            label="Verified"
            value={`${Math.round(a.verifiedRatio * 100)}%`}
          />
          {a.daysSinceLatest != null ? (
            <Metric
              label="Latest"
              value={a.daysSinceLatest === 0 ? "Today" : `${a.daysSinceLatest}d ago`}
            />
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
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
          fontSize: 14,
          fontWeight: "600",
          marginTop: 3,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Filter chips ────────────────────────────────────────────────────

function countByStatus(
  tenders: OwnerTenderSummary[],
): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: tenders.length,
    submitted: 0,
    shortlisted: 0,
    awarded: 0,
    rejected: 0,
  };
  for (const t of tenders) {
    if (t.status in counts) {
      counts[t.status as StatusFilter] += 1;
    }
  }
  return counts;
}

function FilterChips({
  current,
  onChange,
  counts,
}: {
  current: StatusFilter;
  onChange: (f: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 20 }}
    >
      {FILTERS.map((f) => {
        const active = f.id === current;
        const count = counts[f.id];
        const disabled = f.id !== "all" && count === 0;
        return (
          <Pressable
            key={f.id}
            onPress={() => !disabled && onChange(f.id)}
            disabled={disabled}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active
                ? "rgba(0, 212, 200, 0.55)"
                : "rgba(255,255,255,0.10)",
              backgroundColor: active
                ? "rgba(0, 212, 200, 0.14)"
                : "rgba(255,255,255,0.04)",
              opacity: disabled ? 0.4 : 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text
              style={{
                color: active ? colors.accentLight : colors.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 12.5,
                fontWeight: active ? "700" : "600",
              }}
            >
              {f.label}
            </Text>
            <Text
              style={{
                color: active ? colors.accentLight : colors.textDim,
                fontFamily: "DMSans_400Regular",
                fontSize: 11,
              }}
            >
              {count}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Tender card ─────────────────────────────────────────────────────

function TenderCard({
  tender,
  isBestPrice,
}: {
  tender: OwnerTenderSummary;
  isBestPrice: boolean;
}) {
  const verified = tender.builder.abnVerified && tender.builder.anyLicenceVerified;

  return (
    <Pressable
      onPress={() => {
        void haptics.tap();
        router.push(`/(main)/tenders/${tender.id}` as never);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open tender from ${tender.builder.displayName}`}
      style={{
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor:
          tender.status === "awarded"
            ? "rgba(0, 212, 200, 0.50)"
            : "rgba(255, 255, 255, 0.08)",
        backgroundColor: "rgba(255, 255, 255, 0.035)",
      }}
    >
      {/* Top hairline highlight */}
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

      {tender.status === "awarded" ? (
        <LinearGradient
          colors={[
            "rgba(0, 212, 200, 0.16)",
            "rgba(59, 130, 246, 0.08)",
            "rgba(7,13,24,0)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
      ) : null}

      <View style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Avatar
            name={tender.builder.displayName}
            initials={tender.builder.initials}
            size={42}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              {tender.builder.displayName}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 2,
              }}
            >
              {tender.builder.state ? (
                <>
                  <MapPin size={10} color={colors.textDim} strokeWidth={1.8} />
                  <Text
                    style={{
                      color: colors.textSubtle,
                      fontFamily: "DMSans_400Regular",
                      fontSize: 11,
                    }}
                  >
                    {tender.builder.state}
                  </Text>
                </>
              ) : null}
              {tender.builder.yearsInOperation ? (
                <>
                  <Text style={{ color: colors.textDim, fontSize: 11 }}>·</Text>
                  <Text
                    style={{
                      color: colors.textSubtle,
                      fontFamily: "DMSans_400Regular",
                      fontSize: 11,
                    }}
                  >
                    {tender.builder.yearsInOperation} yr
                    {tender.builder.yearsInOperation === 1 ? "" : "s"}
                  </Text>
                </>
              ) : null}
              {tender.builder.awardedCount > 0 ? (
                <>
                  <Text style={{ color: colors.textDim, fontSize: 11 }}>·</Text>
                  <Text
                    style={{
                      color: colors.accentLight,
                      fontFamily: "DMSans_400Regular",
                      fontSize: 11,
                      fontWeight: "600",
                    }}
                  >
                    Won {tender.builder.awardedCount}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
          <StatusPill status={tender.status} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 18, marginTop: 18 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                color: colors.textFaint,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 9.5,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                fontWeight: "600",
              }}
            >
              Total price
            </Text>
            <Text
              style={{
                color: colors.text,
                fontFamily: "BebasNeue_400Regular",
                fontSize: 32,
                lineHeight: 34,
                letterSpacing: -0.3,
                marginTop: 3,
              }}
            >
              {formatAud(tender.totalPriceAud)}
            </Text>
          </View>
          <View>
            <Text
              style={{
                color: colors.textFaint,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 9.5,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                fontWeight: "600",
                textAlign: "right",
              }}
            >
              Duration
            </Text>
            <Text
              style={{
                color: colors.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 16,
                fontWeight: "600",
                marginTop: 6,
                textAlign: "right",
              }}
            >
              {formatWeeks(tender.durationWeeks)}
            </Text>
          </View>
          <View>
            <Text
              style={{
                color: colors.textFaint,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 9.5,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                fontWeight: "600",
                textAlign: "right",
              }}
            >
              Starts
            </Text>
            <Text
              style={{
                color: colors.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 13.5,
                fontWeight: "600",
                marginTop: 6,
                textAlign: "right",
              }}
            >
              {formatStartMonth(tender.proposedStartMonth)}
            </Text>
          </View>
        </View>

        {/* Completeness meter */}
        <View style={{ marginTop: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                color: colors.textFaint,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 9.5,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                fontWeight: "600",
              }}
            >
              Completeness
            </Text>
            <Text
              style={{
                color: colors.textSubtle,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              {tender.completeness.filled} / {tender.completeness.total}
            </Text>
          </View>
          <View
            style={{
              height: 4,
              borderRadius: 4,
              backgroundColor: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: `${Math.max(8, tender.completeness.score * 100)}%`,
                height: "100%",
                borderRadius: 4,
              }}
            />
          </View>
        </View>

        {/* Badges row */}
        {(isBestPrice || verified || tender.submittedAtIso) && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 14,
              alignItems: "center",
            }}
          >
            {isBestPrice ? (
              <Badge
                icon={
                  <Sparkles size={10} color={colors.accentLight} strokeWidth={1.9} />
                }
                label="Best price"
                tone="accent"
              />
            ) : null}
            {verified ? (
              <Badge
                icon={
                  <ShieldCheck size={10} color={colors.accentLight} strokeWidth={1.9} />
                }
                label="Verified"
                tone="accent"
              />
            ) : null}
            <View style={{ flex: 1 }} />
            {tender.submittedAtIso ? (
              <Text
                style={{
                  color: colors.textDim,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 11,
                }}
              >
                {formatRelative(tender.submittedAtIso)}
              </Text>
            ) : null}
            <ChevronRight size={14} color={colors.textDim} strokeWidth={1.8} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function StatusPill({ status }: { status: OwnerTenderStatus }) {
  const m = STATUS_META[status];
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: m.border,
        backgroundColor: m.bg,
      }}
    >
      <Text
        style={{
          color: m.text,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 9.5,
          letterSpacing: 1.8,
          textTransform: "uppercase",
          fontWeight: "700",
        }}
      >
        {m.label}
      </Text>
    </View>
  );
}

function Badge({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "accent" | "neutral";
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor:
          tone === "accent"
            ? "rgba(0, 212, 200, 0.35)"
            : "rgba(255,255,255,0.10)",
        backgroundColor:
          tone === "accent"
            ? "rgba(0, 212, 200, 0.10)"
            : "rgba(255,255,255,0.04)",
      }}
    >
      {icon}
      <Text
        style={{
          color: tone === "accent" ? colors.accentLight : colors.text,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 10.5,
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Empty state ─────────────────────────────────────────────────────

function EmptyState({
  title,
  copy,
  ctaLabel,
  onCta,
}: {
  title: string;
  copy: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View style={{ marginTop: 48, alignItems: "center" }}>
      <RadarPulse size={140} />
      <Text
        style={{
          color: colors.text,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 18,
          fontWeight: "700",
          marginTop: 24,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.textSubtle,
          fontFamily: "DMSans_400Regular",
          fontSize: 13.5,
          lineHeight: 19,
          textAlign: "center",
          marginTop: 8,
          paddingHorizontal: 24,
        }}
      >
        {copy}
      </Text>
      {ctaLabel && onCta ? (
        <Pressable
          onPress={onCta}
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
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
      {/* Quiet TS unused */}
      <Inbox size={0} color="transparent" />
    </View>
  );
}
