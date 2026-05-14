/**
 * <OwnerHome /> — premium owner dashboard.
 *
 * Layout, top to bottom:
 *   1. <GlassHeader /> — floating overlay; avatar left, greeting
 *      centre, bell-notif on right. Extends behind the iOS status bar
 *      and fades into the content (no hard horizontal break).
 *   2. Hero greeting block — kicker + Bebas display name + one
 *      sub-line ("3 projects on the go.").
 *   3. Founding-access hero card — gradient with depth.
 *      (Owner-side this lives on builder home; for owners we render
 *      the headline-stat tile instead — Active Projects in display
 *      type.)
 *   4. 3-tile glass stat row — Drafts / Tenders / Unread.
 *   5. Your projects — horizontal swipe carousel.
 *   6. Activity — glass-card timeline.
 *
 * Content scrolls UNDER the floating header. SafeArea is owned by
 * the header — the screen itself uses edges={[]} so no top inset
 * pushes the canvas down.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInUp,
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
  Layers,
  MapPin,
  MessageSquare,
  Plus,
  Sparkles,
  Wrench,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { Avatar } from "@/components/ui/avatar";
import { GlassHeader, useGlassHeaderHeight } from "@/components/ui/glass-header";
import { StatTile } from "@/components/ui/stat-tile";
import { RadarPulse } from "@/components/ui/radar-pulse";
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
const STATUS_COLOR: Record<string, { bg: string; ring: string; text: string }> = {
  draft: {
    bg: "rgba(168, 179, 207, 0.08)",
    ring: "rgba(168, 179, 207, 0.18)",
    text: "#a8b3cf",
  },
  published: {
    bg: "rgba(0, 212, 200, 0.12)",
    ring: "rgba(0, 212, 200, 0.36)",
    text: "#7df5ed",
  },
  tendering: {
    bg: "rgba(0, 212, 200, 0.18)",
    ring: "rgba(0, 212, 200, 0.50)",
    text: "#00d4c8",
  },
  awarded: {
    bg: "rgba(134, 239, 172, 0.14)",
    ring: "rgba(134, 239, 172, 0.36)",
    text: "#86efac",
  },
  archived: {
    bg: "rgba(255, 255, 255, 0.04)",
    ring: "rgba(255, 255, 255, 0.10)",
    text: "#697296",
  },
  rejected: {
    bg: "rgba(255, 122, 138, 0.12)",
    ring: "rgba(255, 122, 138, 0.32)",
    text: "#ff7a8a",
  },
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

function typeIcon(type: string, size = 14, color: string = colors.accentLight) {
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
  const headerHeight = useGlassHeaderHeight();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState(() => timeOfDayGreeting());

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
      <Screen variant="flat" edges={[]}>
        <DashboardSkeleton />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen variant="flat" edges={[]}>
        <ErrorView message={error} onRetry={refetch} />
      </Screen>
    );
  }

  const stats = data?.stats;
  const projects = data?.projects ?? [];
  const activity = data?.activity ?? [];
  const firstName = user?.name?.split(" ")[0] ?? null;
  const tenderTotal = projects.reduce((s, p) => s + p.stats.tenderCount, 0);
  const builderTotal = projects.reduce((s, p) => s + p.stats.unlockCount, 0);

  return (
    <Screen variant="flat" edges={[]}>
      <GlassHeader
        left={<Avatar name={user?.name} size={36} />}
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
              Dashboard
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
              }}
            >
              {firstName ?? "Home"}
            </Text>
          </View>
        }
        right={
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <Bell size={15} color={colors.textMuted} strokeWidth={1.7} />
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
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentLight}
            progressBackgroundColor={colors.bgRaised}
            progressViewOffset={headerHeight}
          />
        }
      >
        {/* Hero greeting */}
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
              fontSize: 52,
              lineHeight: 54,
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
              fontSize: 14.5,
              lineHeight: 21,
              marginTop: 8,
            }}
          >
            {projects.length === 0
              ? "Let's get your first project onboarded."
              : `${projects.length} ${projects.length === 1 ? "project" : "projects"} on the go · ${tenderTotal} tender${tenderTotal === 1 ? "" : "s"} received`}
          </Text>
        </Animated.View>

        {/* Hero stat — active projects (gradient) */}
        <Animated.View
          entering={FadeInUp.delay(220).duration(460).springify()}
          style={{ marginTop: 24 }}
        >
          <HeroStat
            label="Active projects"
            value={stats?.activeProjects ?? 0}
            sub={
              builderTotal > 0
                ? `${builderTotal} builder${builderTotal === 1 ? "" : "s"} engaged`
                : "Onboard one to get started"
            }
          />
        </Animated.View>

        {/* Stat row */}
        <Animated.View
          entering={FadeInUp.delay(280).duration(440).springify()}
          style={{ marginTop: 12, flexDirection: "row", gap: 10 }}
        >
          <StatTile
            label="Drafts"
            value={stats?.draftProjects ?? 0}
            onPress={() => router.push("/(main)/browse")}
          />
          <StatTile
            label="Tenders"
            value={stats?.totalTenders ?? 0}
            tone={(stats?.totalTenders ?? 0) > 0 ? "accent" : "neutral"}
          />
          <StatTile
            label="Unread"
            value={stats?.unreadMessages ?? 0}
            tone={(stats?.unreadMessages ?? 0) > 0 ? "accent" : "neutral"}
            onPress={() => router.push("/(main)/messages")}
          />
        </Animated.View>

        {/* Projects */}
        <Animated.View
          entering={FadeInUp.delay(340).duration(440).springify()}
          style={{ marginTop: 36 }}
        >
          <SectionHeader
            kicker="Your projects"
            title={projects.length === 0 ? "Start the first" : "Swipe through"}
            ctaIcon={<Plus size={13} color={colors.accentLight} strokeWidth={2} />}
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
      </ScrollView>
    </Screen>
  );
}

// ── Hero stat (gradient card) ───────────────────────────────────────

function HeroStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <View
      style={{
        borderRadius: 28,
        overflow: "hidden",
        shadowColor: colors.accent,
        shadowOpacity: 0.32,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 14 },
        elevation: 10,
      }}
    >
      <LinearGradient
        colors={brandGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 22 }}
      >
        {/* Inner top highlight */}
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
        {/* Soft inner border */}
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.18)",
          }}
        />
        {/* Soft light bloom — top-right */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: "rgba(255, 255, 255, 0.10)",
          }}
        />

        <Text
          style={{
            color: "rgba(3, 17, 24, 0.72)",
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 10.5,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: colors.textInverse,
            fontFamily: "BebasNeue_400Regular",
            fontSize: 84,
            lineHeight: 84,
            letterSpacing: -1.2,
            marginTop: 8,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            color: "rgba(3, 17, 24, 0.72)",
            fontFamily: "DMSans_400Regular",
            fontSize: 13,
            marginTop: 4,
          }}
        >
          {sub}
        </Text>
      </LinearGradient>
    </View>
  );
}

// ── Section header ──────────────────────────────────────────────────

function SectionHeader({
  kicker,
  title,
  ctaIcon,
  ctaLabel,
  onCta,
}: {
  kicker: string;
  title: string;
  ctaIcon?: React.ReactNode;
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
            fontWeight: "600",
            letterSpacing: -0.2,
            marginTop: 4,
          }}
        >
          {title}
        </Text>
      </View>
      {ctaLabel && onCta ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            height: 32,
            paddingHorizontal: 12,
            borderRadius: 16,
            backgroundColor: "rgba(0, 212, 200, 0.10)",
            borderWidth: 1,
            borderColor: "rgba(0, 212, 200, 0.34)",
          }}
        >
          {ctaIcon}
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
        </View>
      ) : null}
    </View>
  );
}

// ── Carousel + project card ─────────────────────────────────────────

function ProjectCarousel({ projects }: { projects: OwnerProjectListItem[] }) {
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
            <OwnerProjectCard project={p} />
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

function OwnerProjectCard({ project }: { project: OwnerProjectListItem }) {
  const statusColor =
    STATUS_COLOR[project.status] ?? STATUS_COLOR.archived!;
  const statusLabel = STATUS_LABEL[project.status] ?? project.status;
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;
  const location = [project.suburb, project.state].filter(Boolean).join(", ");

  return (
    <View
      style={{
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.07)",
      }}
    >
      {/* Inner top highlight */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(255, 255, 255, 0.12)",
        }}
      />
      <View style={{ padding: 18 }}>
        {/* Top row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              {typeIcon(project.type, 12)}
              <Text
                style={{
                  color: colors.textMuted,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 11,
                  fontWeight: "500",
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

          {/* Status chip */}
          <View
            style={{
              paddingHorizontal: 10,
              height: 26,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: statusColor.bg,
              borderWidth: 1,
              borderColor: statusColor.ring,
            }}
          >
            <Text
              style={{
                color: statusColor.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Stats footer */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginTop: 16,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.06)",
          }}
        >
          <Stat label="Builders" value={`${project.stats.unlockCount}/3`} />
          <Stat label="Tenders" value={project.stats.tenderCount} />
          <Stat
            label="Unread"
            value={project.stats.unreadMessages}
            highlight={project.stats.unreadMessages > 0}
          />
          <View style={{ marginLeft: "auto" }}>
            <ChevronRight size={16} color={colors.textDim} strokeWidth={1.7} />
          </View>
        </View>
      </View>
    </View>
  );
}

function Stat({
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
          fontSize: 9,
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
    if (item.kind.includes("tender") || item.kind.includes("award")) return FileText;
    if (item.kind.includes("unlock")) return Sparkles;
    return Bell;
  }, [item.kind]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 14,
        borderRadius: 18,
        backgroundColor: unread
          ? "rgba(0, 212, 200, 0.06)"
          : "rgba(255, 255, 255, 0.035)",
        borderWidth: 1,
        borderColor: unread
          ? "rgba(0, 212, 200, 0.28)"
          : "rgba(255, 255, 255, 0.07)",
        overflow: "hidden",
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
          backgroundColor: "rgba(255, 255, 255, 0.10)",
        }}
      />
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
          borderColor: unread
            ? "rgba(0, 212, 200, 0.34)"
            : "rgba(255, 255, 255, 0.08)",
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
  );
}

// ── Empty states ────────────────────────────────────────────────────

function EmptyProjects() {
  return (
    <View
      style={{
        padding: 28,
        borderRadius: 24,
        backgroundColor: "rgba(255, 255, 255, 0.035)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.07)",
        alignItems: "center",
        overflow: "hidden",
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
          backgroundColor: "rgba(255, 255, 255, 0.10)",
        }}
      />
      <RadarPulse size={96} />
      <Text
        style={{
          color: colors.text,
          fontFamily: "BebasNeue_400Regular",
          fontSize: 26,
          letterSpacing: -0.3,
          marginTop: 18,
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
          marginTop: 8,
          maxWidth: 240,
        }}
      >
        Onboard your first project to start receiving tenders.
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: 36,
          paddingHorizontal: 16,
          borderRadius: 18,
          backgroundColor: "rgba(0, 212, 200, 0.14)",
          borderWidth: 1,
          borderColor: "rgba(0, 212, 200, 0.40)",
          marginTop: 16,
        }}
      >
        <Plus size={13} color={colors.accentLight} strokeWidth={2} />
        <Text
          style={{
            color: colors.accentLight,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 12.5,
            fontWeight: "600",
          }}
        >
          Onboard a project
        </Text>
        <ArrowRight size={11} color={colors.accentLight} strokeWidth={2} />
      </View>
    </View>
  );
}

function EmptyActivity() {
  return (
    <View
      style={{
        padding: 18,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.035)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.07)",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        overflow: "hidden",
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
          backgroundColor: "rgba(255, 255, 255, 0.10)",
        }}
      />
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.04)",
        }}
      >
        <Sparkles size={14} color={colors.textDim} strokeWidth={1.6} />
      </View>
      <Text
        style={{
          flex: 1,
          color: colors.textMuted,
          fontFamily: "DMSans_400Regular",
          fontSize: 12.5,
          lineHeight: 18,
        }}
      >
        No activity yet. Builder unlocks, tenders, and messages land here.
      </Text>
    </View>
  );
}
