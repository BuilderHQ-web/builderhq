/**
 * <BuilderHome /> — v2 builder home.
 *
 * Premium glassmorphic dashboard for builders. Layout:
 *   1. Hero greeting + name (Bebas display).
 *   2. FBA gradient hero — the headline number on a brand-gradient
 *      card. Inactive grant shows a muted glass card with the reason.
 *   3. 3-up secondary stats — active tenders, unlocked, saved.
 *   4. "For you" horizontal swipe of service-area-matched projects.
 *   5. "My tenders" vertical glass-card list.
 *   6. Recent activity feed.
 *
 * Same UX rituals as OwnerHome: sticky BlurHeader, pull-to-refresh,
 * Reanimated stagger, haptics, floating tab bar buffer.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  Bell,
  Building,
  ChevronRight,
  FileText,
  Home as HomeIcon,
  Inbox,
  Layers,
  Lock,
  MapPin,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { GlassCard } from "@/components/ui/glass-card";
import { BlurHeader, HeaderTitle } from "@/components/ui/blur-header";
import { useAuth } from "@/lib/auth";
import { haptics } from "@/lib/haptics";
import { useBuilderDashboard } from "@/lib/dashboard";
import { brandGradient, colors } from "@/lib/theme";
import { DashboardSkeleton } from "./skeleton";
import { ErrorView } from "./error-view";
import type {
  ActivityItem,
  BuilderDashboardPayload,
  BuilderProjectListItem,
  BuilderTenderListItem,
} from "./types";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ── Mappings ────────────────────────────────────────────────────────

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
const TENDER_GRAD: Record<string, [string, string]> = {
  draft: ["rgba(168, 179, 207, 0.10)", "rgba(168, 179, 207, 0.18)"],
  submitted: ["rgba(0, 212, 200, 0.20)", "rgba(0, 212, 200, 0.32)"],
  shortlisted: ["rgba(125, 211, 252, 0.20)", "rgba(125, 211, 252, 0.32)"],
  awarded: ["rgba(134, 239, 172, 0.22)", "rgba(134, 239, 172, 0.36)"],
  rejected: ["rgba(255, 122, 138, 0.18)", "rgba(255, 122, 138, 0.30)"],
  withdrawn: ["rgba(255, 255, 255, 0.06)", "rgba(255, 255, 255, 0.10)"],
};
const TENDER_TEXT: Record<string, string> = {
  draft: "#a8b3cf",
  submitted: "#7df5ed",
  shortlisted: "#7dd3fc",
  awarded: "#86efac",
  rejected: "#ff7a8a",
  withdrawn: "#697296",
};
const TENDER_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  shortlisted: "Shortlisted",
  awarded: "Awarded",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function timeOfDayGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (diff < 60) return "just now";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function projectTypeIcon(type: string, size = 14, color: string = colors.accentLight) {
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

function navigateToProject(slug: string) {
  void haptics.tap();
  router.push(`/(main)/projects/${slug}` as never);
}

// ── Screen ──────────────────────────────────────────────────────────

export function BuilderHome() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useBuilderDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState(() => timeOfDayGreeting());

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [60, 110], [0, 1], "clamp"),
  }));
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [80, 130], [0, 1], "clamp"),
    transform: [
      { translateY: interpolate(scrollY.value, [80, 130], [4, 0], "clamp") },
    ],
  }));

  useEffect(() => {
    const id = setInterval(() => setGreeting(timeOfDayGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void haptics.tap();
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (isLoading && !data) {
    return (
      <Screen variant="flat">
        <DashboardSkeleton />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen variant="flat">
        <ErrorView message={error} onRetry={refetch} />
      </Screen>
    );
  }
  if (!data) return null;

  const firstName = user?.name?.split(" ")[0] ?? null;
  const headlineName = data.profile.companyName ?? firstName;

  return (
    <Screen variant="flat" edges={["top"]}>
      <BlurHeader
        hideBack
        backdropStyle={headerBgStyle}
        centerSlot={
          <Animated.View style={headerTitleStyle}>
            <HeaderTitle kicker="Dashboard" title={headlineName ?? "Home"} />
          </Animated.View>
        }
      />

      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 72,
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentLight}
            progressBackgroundColor={colors.bgRaised}
          />
        }
      >
        {/* Hero */}
        <Animated.View entering={FadeInUp.delay(40).duration(420).springify()}>
          <Text
            style={{
              color: colors.accent,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 10.5,
              letterSpacing: 2.6,
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            {greeting}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(100).duration(420).springify()}>
          <Text
            style={{
              color: colors.text,
              fontFamily: "BebasNeue_400Regular",
              fontSize: 44,
              lineHeight: 46,
              letterSpacing: -0.6,
              marginTop: 6,
            }}
          >
            {headlineName ?? "Builder"}
            <Text style={{ color: colors.accentLight }}>.</Text>
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(160).duration(420).springify()}>
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: "DMSans_400Regular",
              fontSize: 15,
              lineHeight: 22,
              marginTop: 8,
            }}
          >
            {subheadCopy(data)}
          </Text>
        </Animated.View>

        {/* FBA hero card */}
        <Animated.View
          entering={FadeInUp.delay(220).duration(460).springify()}
          style={{ marginTop: 24 }}
        >
          <FbaHeroCard fba={data.fba} />
        </Animated.View>

        {/* Secondary stats */}
        <Animated.View
          entering={FadeInUp.delay(280).duration(440).springify()}
          style={{ marginTop: 12, flexDirection: "row", gap: 10 }}
        >
          <MiniStat
            label="Tenders"
            value={data.stats.activeTenders}
            accent={data.stats.activeTenders > 0}
          />
          <MiniStat label="Unlocked" value={data.stats.unlockedProjects} />
          <MiniStat label="Saved" value={data.stats.savedProjects} />
        </Animated.View>

        {/* For you carousel */}
        <Animated.View
          entering={FadeInUp.delay(340).duration(440).springify()}
          style={{ marginTop: 32 }}
        >
          <SectionHeader
            kicker="For you"
            title={
              data.suggested.length === 0
                ? "Nothing matched"
                : "New on the marketplace"
            }
            ctaLabel="Browse all"
            onCta={() => {
              void haptics.tap();
              router.push("/(main)/browse");
            }}
          />
        </Animated.View>

        {data.suggested.length === 0 ? (
          <Animated.View
            entering={FadeInUp.delay(400).duration(440).springify()}
            style={{ marginTop: 14 }}
          >
            <EmptyState
              icon={<Sparkles size={20} color={colors.accentLight} strokeWidth={1.6} />}
              title="No new matches"
              copy="Add or expand your service areas to see more projects here."
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInUp.delay(400).duration(440).springify()}
            style={{ marginTop: 14, marginHorizontal: -20 }}
          >
            <ProjectCarousel projects={data.suggested} />
          </Animated.View>
        )}

        {/* My tenders */}
        <Animated.View
          entering={FadeInUp.delay(480).duration(440).springify()}
          style={{ marginTop: 36 }}
        >
          <SectionHeader
            kicker="My tenders"
            title={
              data.myTenders.length === 0
                ? "No submissions yet"
                : `${data.myTenders.length} in flight`
            }
          />
        </Animated.View>
        {data.myTenders.length === 0 ? (
          <Animated.View
            entering={FadeInUp.delay(520).duration(440).springify()}
            style={{ marginTop: 14 }}
          >
            <EmptyState
              icon={<FileText size={18} color={colors.textDim} strokeWidth={1.6} />}
              copy="Tenders you draft or submit will appear here, sorted by status."
            />
          </Animated.View>
        ) : (
          <View style={{ marginTop: 14, gap: 10 }}>
            {data.myTenders.map((t, i) => (
              <Animated.View
                key={t.id}
                entering={FadeInUp.delay(540 + i * 40).duration(380).springify()}
              >
                <TenderCard tender={t} />
              </Animated.View>
            ))}
          </View>
        )}

        {/* Recently unlocked */}
        {data.unlocked.length > 0 ? (
          <>
            <Animated.View
              entering={FadeInUp.delay(600).duration(440).springify()}
              style={{ marginTop: 36 }}
            >
              <SectionHeader
                kicker="Recently unlocked"
                title="Pick up where you left off"
              />
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(640).duration(440).springify()}
              style={{ marginTop: 14, marginHorizontal: -20 }}
            >
              <ProjectCarousel projects={data.unlocked} />
            </Animated.View>
          </>
        ) : null}

        {/* Activity */}
        <Animated.View
          entering={FadeInUp.delay(700).duration(440).springify()}
          style={{ marginTop: 36 }}
        >
          <SectionHeader
            kicker="Activity"
            title={data.activity.length === 0 ? "Quiet so far" : "Latest updates"}
          />
        </Animated.View>
        {data.activity.length === 0 ? (
          <Animated.View
            entering={FadeInUp.delay(740).duration(440).springify()}
            style={{ marginTop: 14 }}
          >
            <EmptyState
              icon={<Inbox size={18} color={colors.textDim} strokeWidth={1.6} />}
              copy="Tender outcomes, new projects, and messages will land here."
            />
          </Animated.View>
        ) : (
          <View style={{ marginTop: 14, gap: 10 }}>
            {data.activity.map((a, i) => (
              <Animated.View
                key={a.id}
                entering={FadeInUp.delay(760 + i * 30).duration(360).springify()}
              >
                <ActivityRow item={a} />
              </Animated.View>
            ))}
          </View>
        )}
      </AnimatedScrollView>
    </Screen>
  );
}

function subheadCopy(data: BuilderDashboardPayload): string {
  if (data.suggested.length > 0) {
    return `${data.suggested.length} ${data.suggested.length === 1 ? "project" : "projects"} matching your area.`;
  }
  if (data.profile.serviceAreas.length === 0) {
    return "Set your service areas to see matching projects.";
  }
  if (data.stats.unlockedProjects > 0) {
    return "No new matches right now — your unlocked projects are below.";
  }
  return "Stay tuned — new projects land here as soon as they're live.";
}

// ── FBA hero ────────────────────────────────────────────────────────

function FbaHeroCard({ fba }: { fba: BuilderDashboardPayload["fba"] }) {
  if (!fba.active) {
    const reason =
      fba.reason === "no_grant"
        ? "Founding Builder Access isn't active yet."
        : fba.reason === "expired"
          ? "Your Founding Builder Access has ended."
          : "Founding Builder Access was revoked.";
    return (
      <GlassCard padding={22} radius={28}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Zap size={14} color={colors.textDim} strokeWidth={1.6} />
          <Text
            style={{
              color: colors.textFaint,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 10.5,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            Founding access
          </Text>
        </View>
        <Text
          style={{
            color: colors.textMuted,
            fontFamily: "DMSans_400Regular",
            fontSize: 13.5,
            lineHeight: 19,
            marginTop: 10,
          }}
        >
          {reason} Unlocks are charged per project.
        </Text>
      </GlassCard>
    );
  }

  return (
    <View
      style={{
        borderRadius: 28,
        overflow: "hidden",
        shadowColor: colors.accent,
        shadowOpacity: 0.40,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
      }}
    >
      <LinearGradient
        colors={brandGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 22 }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: "rgba(255, 255, 255, 0.30)",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.18)",
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Zap size={14} color={colors.textInverse} strokeWidth={2} />
          <Text
            style={{
              color: "rgba(3, 17, 24, 0.75)",
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 10.5,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              fontWeight: "700",
            }}
          >
            Founding access · Cycle {fba.cycleIndex + 1}/{fba.totalCycles}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            marginTop: 10,
          }}
        >
          <Text
            style={{
              color: colors.textInverse,
              fontFamily: "BebasNeue_400Regular",
              fontSize: 78,
              lineHeight: 78,
              letterSpacing: -1,
            }}
          >
            {fba.remainingThisCycle}
          </Text>
          <Text
            style={{
              color: "rgba(3, 17, 24, 0.65)",
              fontFamily: "DMSans_400Regular",
              fontSize: 13,
              marginLeft: 8,
              marginBottom: 10,
            }}
          >
            / {fba.monthlyQuota} free unlocks left
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text
            style={{
              color: "rgba(3, 17, 24, 0.72)",
              fontFamily: "DMSans_400Regular",
              fontSize: 12.5,
            }}
          >
            Refresh in {fba.daysToRefresh} {fba.daysToRefresh === 1 ? "day" : "days"}
          </Text>
          {fba.totalSavedAud > 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <TrendingUp size={11} color="rgba(3, 17, 24, 0.65)" strokeWidth={2} />
              <Text
                style={{
                  color: "rgba(3, 17, 24, 0.72)",
                  fontFamily: "DMSans_400Regular",
                  fontSize: 12.5,
                }}
              >
                Saved ${fba.totalSavedAud.toLocaleString("en-AU")}
              </Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

// ── Secondary stat tile (glass) ─────────────────────────────────────

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <GlassCard variant={accent ? "accent" : "default"} padding={14} radius={18}>
        <Text
          style={{
            color: colors.textFaint,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 9.5,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: accent ? colors.accentLight : colors.text,
            fontFamily: "BebasNeue_400Regular",
            fontSize: 32,
            lineHeight: 34,
            letterSpacing: -0.4,
            marginTop: 6,
          }}
        >
          {value}
        </Text>
      </GlassCard>
    </View>
  );
}

// ── Section header ──────────────────────────────────────────────────

function SectionHeader({
  kicker,
  title,
  ctaLabel,
  onCta,
}: {
  kicker: string;
  title: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
      }}
    >
      <View>
        <Text
          style={{
            color: colors.accent,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 10,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            fontWeight: "600",
          }}
        >
          {kicker}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 18,
            letterSpacing: -0.2,
            fontWeight: "600",
            marginTop: 4,
          }}
        >
          {title}
        </Text>
      </View>
      {ctaLabel && onCta ? (
        <Pressable
          onPress={onCta}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            height: 32,
            paddingHorizontal: 12,
            borderRadius: 16,
            backgroundColor: colors.accentMuted,
            borderWidth: 1,
            borderColor: colors.borderAccent,
          }}
        >
          <Text
            style={{
              color: colors.accentLight,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {ctaLabel}
          </Text>
          <ArrowRight size={11} color={colors.accentLight} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Project carousel + card ─────────────────────────────────────────

function ProjectCarousel({
  projects,
}: {
  projects: BuilderProjectListItem[];
}) {
  const [page, setPage] = useState(0);
  const onScrollEnd = useCallback(
    (e: {
      nativeEvent: {
        contentOffset: { x: number };
        layoutMeasurement: { width: number };
      };
    }) => {
      const idx = Math.round(
        e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width,
      );
      if (idx !== page) {
        setPage(idx);
        void haptics.select();
      }
    },
    [page],
  );
  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="start"
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {projects.map((p) => (
          <View key={p.id} style={{ width: 320 }}>
            <BuilderProjectCard project={p} />
          </View>
        ))}
      </ScrollView>
      {projects.length > 1 ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            marginTop: 14,
          }}
        >
          {projects.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === page ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  i === page ? colors.accentLight : "rgba(255, 255, 255, 0.16)",
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function BuilderProjectCard({ project }: { project: BuilderProjectListItem }) {
  const isFull = project.unlockedCount >= 3;
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;
  const budgetLabel = project.budgetBand
    ? BUDGET_LABEL[project.budgetBand]
    : null;
  const location = [project.suburb, project.state].filter(Boolean).join(", ");

  return (
    <GlassCard
      onPress={() => navigateToProject(project.slug)}
      padding={18}
      radius={24}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {projectTypeIcon(project.type, 12)}
            <Text
              style={{
                color: colors.textMuted,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 11,
              }}
            >
              {typeLabel}
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={{
              color: colors.text,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 18,
              fontWeight: "600",
              letterSpacing: -0.2,
              marginTop: 8,
            }}
          >
            {project.title}
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
        </View>

        {/* Slot pill */}
        <SlotPill unlockedCount={project.unlockedCount} isFull={isFull} />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          marginTop: 16,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
        }}
      >
        {budgetLabel ? <StatChip label="Budget" value={budgetLabel} /> : null}
        {project.bedrooms != null ? (
          <StatChip label="Bed" value={project.bedrooms} />
        ) : null}
        {project.bathrooms != null ? (
          <StatChip label="Bath" value={project.bathrooms} />
        ) : null}
        <View style={{ marginLeft: "auto" }}>
          <ChevronRight size={16} color={colors.textDim} strokeWidth={1.7} />
        </View>
      </View>
    </GlassCard>
  );
}

function SlotPill({
  unlockedCount,
  isFull,
}: {
  unlockedCount: number;
  isFull: boolean;
}) {
  if (isFull) {
    return (
      <View
        style={{
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={["rgba(255, 122, 138, 0.18)", "rgba(255, 122, 138, 0.30)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.16)",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Lock size={10} color={colors.danger} strokeWidth={2} />
          <Text
            style={{
              color: colors.danger,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 9.5,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              fontWeight: "700",
            }}
          >
            Full
          </Text>
        </LinearGradient>
      </View>
    );
  }
  return (
    <View style={{ borderRadius: 14, overflow: "hidden" }}>
      <LinearGradient
        colors={["rgba(0, 212, 200, 0.20)", "rgba(0, 212, 200, 0.34)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.18)",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
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
                    : "rgba(125, 245, 237, 0.25)",
              }}
            />
          ))}
        </View>
        <Text
          style={{
            color: colors.accentLight,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 9.5,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            fontWeight: "700",
          }}
        >
          {unlockedCount}/3
        </Text>
      </LinearGradient>
    </View>
  );
}

function StatChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View>
      <Text
        style={{
          color: colors.textFaint,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 8.5,
          letterSpacing: 1.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 12.5,
          fontWeight: "600",
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Tender card ─────────────────────────────────────────────────────

function TenderCard({ tender }: { tender: BuilderTenderListItem }) {
  const grad = TENDER_GRAD[tender.status] ?? TENDER_GRAD.draft!;
  const textColor = TENDER_TEXT[tender.status] ?? "#a8b3cf";
  const label = TENDER_LABEL[tender.status] ?? tender.status;
  return (
    <GlassCard
      onPress={() => navigateToProject(tender.projectSlug)}
      padding={16}
      radius={20}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.text,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14.5,
              fontWeight: "600",
            }}
          >
            {tender.projectTitle}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            {tender.totalPriceAud != null ? (
              <Text
                style={{
                  color: colors.textMuted,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 12,
                }}
              >
                ${tender.totalPriceAud.toLocaleString("en-AU")}
              </Text>
            ) : null}
            {tender.durationWeeks != null ? (
              <>
                {tender.totalPriceAud != null ? (
                  <Text style={{ color: colors.textDim, fontSize: 12 }}>·</Text>
                ) : null}
                <Text
                  style={{
                    color: colors.textMuted,
                    fontFamily: "DMSans_400Regular",
                    fontSize: 12,
                  }}
                >
                  {tender.durationWeeks} wks
                </Text>
              </>
            ) : null}
            {tender.submittedAt ? (
              <>
                <Text style={{ color: colors.textDim, fontSize: 12 }}>·</Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontFamily: "DMSans_400Regular",
                    fontSize: 12,
                  }}
                >
                  {relativeTime(tender.submittedAt)}
                </Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={{ borderRadius: 14, overflow: "hidden" }}>
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.16)",
            }}
          >
            <Text
              style={{
                color: textColor,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 9.5,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                fontWeight: "700",
              }}
            >
              {label}
            </Text>
          </LinearGradient>
        </View>
      </View>
    </GlassCard>
  );
}

// ── Activity ────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const unread = !item.readAt;
  const Icon = useMemo(() => {
    if (item.kind.includes("message")) return Bell;
    if (item.kind.includes("tender") || item.kind.includes("award"))
      return FileText;
    if (item.kind.includes("unlock")) return Sparkles;
    return Bell;
  }, [item.kind]);

  const onPress = useCallback(() => {
    void haptics.tap();
    if (!item.actionUrl) return;
    try {
      const u = new URL(item.actionUrl);
      router.push(u.pathname as never);
    } catch {}
  }, [item.actionUrl]);

  return (
    <GlassCard
      onPress={item.actionUrl ? onPress : undefined}
      padding={14}
      radius={18}
      variant={unread ? "accent" : "default"}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: unread
              ? "rgba(0, 212, 200, 0.18)"
              : "rgba(255, 255, 255, 0.05)",
            borderWidth: 1,
            borderColor: unread ? colors.borderAccent : colors.borderSubtle,
          }}
        >
          <Icon
            size={15}
            color={unread ? colors.accentLight : colors.textMuted}
            strokeWidth={1.6}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={2}
            style={{
              color: colors.text,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 13.5,
              lineHeight: 18,
              fontWeight: unread ? "600" : "500",
            }}
          >
            {item.title}
          </Text>
          {item.body ? (
            <Text
              numberOfLines={1}
              style={{
                color: colors.textFaint,
                fontFamily: "DMSans_400Regular",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {item.body}
            </Text>
          ) : null}
        </View>
        <Text
          style={{
            color: colors.textDim,
            fontFamily: "DMSans_400Regular",
            fontSize: 10.5,
            marginTop: 2,
          }}
        >
          {relativeTime(item.createdAt)}
        </Text>
      </View>
    </GlassCard>
  );
}

// ── Empty state ─────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title?: string;
  copy: string;
}) {
  return (
    <GlassCard padding={24} radius={20}>
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: "rgba(255, 255, 255, 0.04)",
          }}
        >
          {icon}
        </View>
        {title ? (
          <Text
            style={{
              color: colors.text,
              fontFamily: "BebasNeue_400Regular",
              fontSize: 22,
              letterSpacing: -0.3,
              marginTop: 12,
              textTransform: "uppercase",
            }}
          >
            {title}
          </Text>
        ) : null}
        <Text
          style={{
            color: colors.textMuted,
            fontFamily: "DMSans_400Regular",
            fontSize: 12.5,
            lineHeight: 19,
            textAlign: "center",
            marginTop: 6,
            maxWidth: 260,
          }}
        >
          {copy}
        </Text>
      </View>
    </GlassCard>
  );
}
