/**
 * <OwnerHome /> — v2 owner home.
 *
 * Premium glassmorphic dashboard. Layout:
 *   1. Hero greeting — kicker + name in display type + status pill.
 *   2. Brand-gradient hero stat card with the headline number (active
 *      projects). Drop shadow + inner highlight read as "hero".
 *   3. 3-up secondary stat tiles (glass cards) — drafts, tenders,
 *      unread. Tap into the respective tab.
 *   4. "Your projects" horizontal swipe carousel of glass cards —
 *      premium-feel paging. Project title, status pill, three inline
 *      stats. Pagination dots underneath.
 *   5. "Recent activity" glass feed list.
 *
 * UX rituals:
 *   · Horizontal swipe on projects (Uber/Airbnb-style)
 *   · Pull-to-refresh
 *   · Light haptics on every tap
 *   · Sticky animated BlurHeader (fills in as user scrolls past the
 *     hero) with kicker + name in the centre slot
 *   · Reanimated FadeInUp stagger on every section
 *
 * Content padding accounts for the floating tab bar at the bottom
 * (88px buffer).
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
  MapPin,
  MessageSquare,
  Sparkles,
  Wrench,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { GlassCard } from "@/components/ui/glass-card";
import { BlurHeader, HeaderTitle } from "@/components/ui/blur-header";
import { useAuth } from "@/lib/auth";
import { haptics } from "@/lib/haptics";
import { useOwnerDashboard } from "@/lib/dashboard";
import { brandGradient, colors } from "@/lib/theme";
import { DashboardSkeleton } from "./skeleton";
import { ErrorView } from "./error-view";
import type {
  ActivityItem,
  OwnerProjectListItem,
} from "./types";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ── Mapping tables ──────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Live",
  tendering: "Tendering",
  awarded: "Awarded",
  archived: "Archived",
  rejected: "Rejected",
};
const STATUS_GRAD: Record<string, [string, string]> = {
  draft: ["rgba(168, 179, 207, 0.10)", "rgba(168, 179, 207, 0.18)"],
  published: ["rgba(0, 212, 200, 0.18)", "rgba(0, 212, 200, 0.32)"],
  tendering: ["rgba(0, 212, 200, 0.25)", "rgba(59, 130, 246, 0.30)"],
  awarded: ["rgba(134, 239, 172, 0.20)", "rgba(134, 239, 172, 0.34)"],
  archived: ["rgba(255, 255, 255, 0.06)", "rgba(255, 255, 255, 0.10)"],
  rejected: ["rgba(255, 122, 138, 0.18)", "rgba(255, 122, 138, 0.30)"],
};
const STATUS_TEXT: Record<string, string> = {
  draft: "#a8b3cf",
  published: "#7df5ed",
  tendering: "#7df5ed",
  awarded: "#86efac",
  archived: "#697296",
  rejected: "#ff7a8a",
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

function projectTypeIcon(type: string, size = 14, color: string = colors.text) {
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

// ── Screen ──────────────────────────────────────────────────────────

export function OwnerHome() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useOwnerDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState(() => timeOfDayGreeting());

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Sticky header materialises past 100px of scroll.
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

  const stats = data?.stats;
  const projects = data?.projects ?? [];
  const activity = data?.activity ?? [];
  const firstName = user?.name?.split(" ")[0] ?? null;

  return (
    <Screen variant="flat" edges={["top"]}>
      <BlurHeader
        hideBack
        backdropStyle={headerBgStyle}
        centerSlot={
          <Animated.View style={headerTitleStyle}>
            <HeaderTitle kicker="Dashboard" title={firstName ?? "Home"} />
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
          paddingBottom: 120, // floating tab bar buffer
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
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{
              color: colors.text,
              fontFamily: "BebasNeue_400Regular",
              fontSize: 48,
              lineHeight: 50,
              letterSpacing: -0.6,
              marginTop: 6,
            }}
          >
            {firstName ?? "Welcome"}
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
            {projects.length === 0
              ? "Let's get your first project onboarded."
              : `${projects.length} ${projects.length === 1 ? "project" : "projects"} on the go.`}
          </Text>
        </Animated.View>

        {/* Hero stat card — brand gradient */}
        <Animated.View
          entering={FadeInUp.delay(220).duration(460).springify()}
          style={{ marginTop: 24 }}
        >
          <HeroStatCard stats={stats} projects={projects} />
        </Animated.View>

        {/* Secondary stats */}
        <Animated.View
          entering={FadeInUp.delay(280).duration(440).springify()}
          style={{ marginTop: 12, flexDirection: "row", gap: 10 }}
        >
          <MiniStat
            label="Drafts"
            value={stats?.draftProjects ?? 0}
            onPress={() => {
              void haptics.tap();
              router.push("/(main)/browse");
            }}
          />
          <MiniStat
            label="Tenders"
            value={stats?.totalTenders ?? 0}
            accent={(stats?.totalTenders ?? 0) > 0}
          />
          <MiniStat
            label="Unread"
            value={stats?.unreadMessages ?? 0}
            accent={(stats?.unreadMessages ?? 0) > 0}
            onPress={() => {
              void haptics.tap();
              router.push("/(main)/messages");
            }}
          />
        </Animated.View>

        {/* Projects carousel */}
        <Animated.View
          entering={FadeInUp.delay(340).duration(440).springify()}
          style={{ marginTop: 32 }}
        >
          <SectionHeader
            kicker="Your projects"
            title={projects.length === 0 ? "Start the first" : "Swipe through"}
            ctaLabel={projects.length === 0 ? "New" : undefined}
            onCta={
              projects.length === 0
                ? () => {
                    void haptics.tap();
                    router.push("/(main)/browse");
                  }
                : undefined
            }
          />
        </Animated.View>

        {projects.length === 0 ? (
          <Animated.View
            entering={FadeInUp.delay(400).duration(440).springify()}
            style={{ marginTop: 14 }}
          >
            <EmptyProjects />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInUp.delay(400).duration(440).springify()}
            style={{ marginTop: 14, marginHorizontal: -20 }}
          >
            <ProjectCarousel projects={projects} />
          </Animated.View>
        )}

        {/* Activity */}
        <Animated.View
          entering={FadeInUp.delay(480).duration(440).springify()}
          style={{ marginTop: 36 }}
        >
          <SectionHeader
            kicker="Activity"
            title={activity.length === 0 ? "Quiet so far" : "Latest updates"}
          />
        </Animated.View>
        {activity.length === 0 ? (
          <Animated.View
            entering={FadeInUp.delay(520).duration(440).springify()}
            style={{ marginTop: 14 }}
          >
            <EmptyActivity />
          </Animated.View>
        ) : (
          <View style={{ marginTop: 14, gap: 10 }}>
            {activity.map((a, i) => (
              <Animated.View
                key={a.id}
                entering={FadeInUp.delay(540 + i * 40).duration(380).springify()}
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

// ── Hero stat card (gradient) ───────────────────────────────────────

function HeroStatCard({
  stats,
  projects,
}: {
  stats: { activeProjects: number } | undefined;
  projects: OwnerProjectListItem[];
}) {
  // Sum across all live/tendering projects.
  const tenderCount = projects.reduce((s, p) => s + p.stats.tenderCount, 0);
  const builderCount = projects.reduce(
    (s, p) => s + p.stats.unlockCount,
    0,
  );

  return (
    <View
      style={{
        borderRadius: 28,
        overflow: "hidden",
        shadowColor: colors.accent,
        shadowOpacity: 0.4,
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
        {/* Inner highlight — gives the gradient depth */}
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

        <Text
          style={{
            color: "rgba(3, 17, 24, 0.65)",
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: "700",
          }}
        >
          Active projects
        </Text>
        <Text
          style={{
            color: colors.textInverse,
            fontFamily: "BebasNeue_400Regular",
            fontSize: 78,
            lineHeight: 78,
            letterSpacing: -1,
            marginTop: 6,
          }}
        >
          {stats?.activeProjects ?? 0}
        </Text>
        <Text
          style={{
            color: "rgba(3, 17, 24, 0.72)",
            fontFamily: "DMSans_400Regular",
            fontSize: 13,
            marginTop: 6,
          }}
        >
          {tenderCount} tender{tenderCount === 1 ? "" : "s"} · {builderCount} builder{builderCount === 1 ? "" : "s"} engaged
        </Text>
      </LinearGradient>
    </View>
  );
}

// ── Mini stat (glass card) ──────────────────────────────────────────

function MiniStat({
  label,
  value,
  accent,
  onPress,
}: {
  label: string;
  value: number;
  accent?: boolean;
  onPress?: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <GlassCard
        onPress={onPress}
        variant={accent ? "accent" : "default"}
        padding={14}
        radius={18}
      >
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
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
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

// ── Project carousel (horizontal swipe) ─────────────────────────────

function ProjectCarousel({ projects }: { projects: OwnerProjectListItem[] }) {
  const [page, setPage] = useState(0);
  const onScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number }; layoutMeasurement: { width: number } } }) => {
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
            <ProjectCard project={p} />
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

function ProjectCard({ project }: { project: OwnerProjectListItem }) {
  const statusGrad =
    STATUS_GRAD[project.status] ?? STATUS_GRAD.archived!;
  const statusText = STATUS_TEXT[project.status] ?? "#697296";
  const statusLabel = STATUS_LABEL[project.status] ?? project.status;
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;
  const location = [project.suburb, project.state].filter(Boolean).join(", ");

  const onPress = useCallback(() => {
    void haptics.tap();
    router.push(`/(main)/projects/${project.slug}` as never);
  }, [project.slug]);

  return (
    <GlassCard onPress={onPress} padding={18} radius={24}>
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
            {projectTypeIcon(project.type, 12, colors.accentLight)}
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

        {/* Status pill — gradient fill */}
        <View
          style={{
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={statusGrad}
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
                color: statusText,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 9.5,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                fontWeight: "700",
              }}
            >
              {statusLabel}
            </Text>
          </LinearGradient>
        </View>
      </View>

      {/* Inline stats */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 18,
          marginTop: 16,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
        }}
      >
        <StatChip label="Builders" value={`${project.stats.unlockCount}/3`} />
        <StatChip label="Tenders" value={project.stats.tenderCount} />
        <StatChip
          label="Unread"
          value={project.stats.unreadMessages}
          highlight={project.stats.unreadMessages > 0}
        />
        <View style={{ marginLeft: "auto" }}>
          <ChevronRight size={16} color={colors.textDim} strokeWidth={1.7} />
        </View>
      </View>
    </GlassCard>
  );
}

function StatChip({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
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
          color: highlight ? colors.accentLight : colors.text,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14,
          fontWeight: "600",
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Activity ────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const unread = !item.readAt;
  const Icon = useMemo(() => {
    if (item.kind.includes("message")) return MessageSquare;
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

// ── Empty states ────────────────────────────────────────────────────

function EmptyProjects() {
  return (
    <GlassCard padding={28} radius={24}>
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.borderAccent,
            backgroundColor: colors.accentMuted,
          }}
        >
          <HomeIcon size={22} color={colors.accentLight} strokeWidth={1.6} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontFamily: "BebasNeue_400Regular",
            fontSize: 24,
            letterSpacing: -0.3,
            marginTop: 14,
            textTransform: "uppercase",
          }}
        >
          No projects yet
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontFamily: "DMSans_400Regular",
            fontSize: 13,
            textAlign: "center",
            lineHeight: 19,
            marginTop: 6,
            maxWidth: 240,
          }}
        >
          Onboard your first project to start receiving tenders.
        </Text>
      </View>
    </GlassCard>
  );
}

function EmptyActivity() {
  return (
    <GlassCard padding={22} radius={18}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Inbox size={16} color={colors.textDim} strokeWidth={1.5} />
        <Text
          style={{
            color: colors.textMuted,
            fontFamily: "DMSans_400Regular",
            fontSize: 12.5,
            flex: 1,
          }}
        >
          No activity yet. Builder unlocks, tenders, and messages land here.
        </Text>
      </View>
    </GlassCard>
  );
}
