/**
 * <BuilderHome /> — premium builder dashboard.
 *
 * Same architecture as owner-home (GlassHeader floats above scrollable
 * content), but the hero stat is FBA credits + a tighter section
 * sequence: FBA hero → 3 stats → For-you carousel → My tenders →
 * Recently unlocked → Activity.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
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
  Lock,
  MapPin,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { Avatar } from "@/components/ui/avatar";
import { GlassHeader, useGlassHeaderHeight } from "@/components/ui/glass-header";
import { StatTile } from "@/components/ui/stat-tile";
import { RadarPulse } from "@/components/ui/radar-pulse";
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
  over_5m: "$5M+",
};
const TENDER_COLOR: Record<string, { bg: string; ring: string; text: string }> = {
  draft: {
    bg: "rgba(168, 179, 207, 0.08)",
    ring: "rgba(168, 179, 207, 0.18)",
    text: "#a8b3cf",
  },
  submitted: {
    bg: "rgba(0, 212, 200, 0.12)",
    ring: "rgba(0, 212, 200, 0.36)",
    text: "#7df5ed",
  },
  shortlisted: {
    bg: "rgba(125, 211, 252, 0.12)",
    ring: "rgba(125, 211, 252, 0.36)",
    text: "#7dd3fc",
  },
  awarded: {
    bg: "rgba(134, 239, 172, 0.14)",
    ring: "rgba(134, 239, 172, 0.40)",
    text: "#86efac",
  },
  rejected: {
    bg: "rgba(255, 122, 138, 0.12)",
    ring: "rgba(255, 122, 138, 0.32)",
    text: "#ff7a8a",
  },
  withdrawn: {
    bg: "rgba(255, 255, 255, 0.04)",
    ring: "rgba(255, 255, 255, 0.10)",
    text: "#697296",
  },
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

function navigateToProject(slug: string) {
  void haptics.tap();
  router.push(`/(main)/projects/${slug}` as never);
}

// ── Screen ──────────────────────────────────────────────────────────

export function BuilderHome() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useBuilderDashboard();
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
  if (!data) return null;

  const firstName = user?.name?.split(" ")[0] ?? null;
  const subCompany = data.profile.companyName;

  return (
    <Screen variant="flat" edges={[]}>
      <GlassHeader
        left={
          <Avatar
            name={data.profile.companyName ?? user?.name}
            size={36}
          />
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
            {firstName ?? "Builder"}
            <Text style={{ color: colors.accentLight }}>.</Text>
          </Text>
        </Animated.View>
        {subCompany ? (
          <Animated.View entering={FadeInUp.delay(140).duration(420).springify()}>
            <Text
              numberOfLines={1}
              style={{
                color: colors.textFaint,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 12,
                fontWeight: "500",
                letterSpacing: 0.04,
                marginTop: 4,
              }}
            >
              {subCompany}
            </Text>
          </Animated.View>
        ) : null}
        <Animated.View entering={FadeInUp.delay(180).duration(420).springify()}>
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: "DMSans_400Regular",
              fontSize: 14.5,
              lineHeight: 21,
              marginTop: 10,
            }}
          >
            {subheadCopy(data)}
          </Text>
        </Animated.View>

        {/* FBA hero */}
        <Animated.View
          entering={FadeInUp.delay(240).duration(460).springify()}
          style={{ marginTop: 24 }}
        >
          <FbaHero fba={data.fba} />
        </Animated.View>

        {/* Stat row */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(440).springify()}
          style={{ marginTop: 12, flexDirection: "row", gap: 10 }}
        >
          <StatTile
            label="Tenders"
            value={data.stats.activeTenders}
            tone={data.stats.activeTenders > 0 ? "accent" : "neutral"}
          />
          <StatTile label="Unlocked" value={data.stats.unlockedProjects} />
          <StatTile label="Saved" value={data.stats.savedProjects} />
        </Animated.View>

        {/* For you */}
        <Animated.View
          entering={FadeInUp.delay(360).duration(440).springify()}
          style={{ marginTop: 36 }}
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
            entering={FadeInUp.delay(420).duration(440).springify()}
            style={{ marginTop: 14 }}
          >
            <EmptyMatches />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInUp.delay(420).duration(440).springify()}
            style={{ marginTop: 14, marginHorizontal: -20 }}
          >
            <ProjectCarousel projects={data.suggested} />
          </Animated.View>
        )}

        {/* My tenders */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(440).springify()}
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
            entering={FadeInUp.delay(540).duration(440).springify()}
            style={{ marginTop: 14 }}
          >
            <EmptyCard
              icon={<FileText size={18} color={colors.textDim} strokeWidth={1.6} />}
              copy="Tenders you draft or submit will appear here, sorted by status."
            />
          </Animated.View>
        ) : (
          <View style={{ marginTop: 14, gap: 10 }}>
            {data.myTenders.map((t, i) => (
              <Animated.View
                key={t.id}
                entering={FadeInUp.delay(560 + i * 40).duration(380).springify()}
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
              entering={FadeInUp.delay(620).duration(440).springify()}
              style={{ marginTop: 36 }}
            >
              <SectionHeader
                kicker="Recently unlocked"
                title="Pick up where you left off"
              />
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(660).duration(440).springify()}
              style={{ marginTop: 14, marginHorizontal: -20 }}
            >
              <ProjectCarousel projects={data.unlocked} />
            </Animated.View>
          </>
        ) : null}

        {/* Activity */}
        <Animated.View
          entering={FadeInUp.delay(720).duration(440).springify()}
          style={{ marginTop: 36 }}
        >
          <SectionHeader
            kicker="Activity"
            title={
              data.activity.length === 0 ? "Quiet so far" : "Latest updates"
            }
          />
        </Animated.View>
        {data.activity.length === 0 ? (
          <Animated.View
            entering={FadeInUp.delay(760).duration(440).springify()}
            style={{ marginTop: 14 }}
          >
            <EmptyCard
              icon={<Sparkles size={18} color={colors.textDim} strokeWidth={1.6} />}
              copy="Tender outcomes, new projects, and messages will land here."
            />
          </Animated.View>
        ) : (
          <View style={{ marginTop: 14, gap: 10 }}>
            {data.activity.map((a, i) => (
              <Animated.View
                key={a.id}
                entering={FadeInUp.delay(780 + i * 30).duration(360).springify()}
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

function FbaHero({ fba }: { fba: BuilderDashboardPayload["fba"] }) {
  if (!fba.active) {
    const reason =
      fba.reason === "no_grant"
        ? "Founding Builder Access isn't active yet."
        : fba.reason === "expired"
          ? "Your Founding Builder Access has ended."
          : "Founding Builder Access was revoked.";
    return (
      <View
        style={{
          padding: 22,
          borderRadius: 28,
          backgroundColor: "rgba(255, 255, 255, 0.035)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
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
            marginTop: 12,
          }}
        >
          {reason} Unlocks are charged per project.
        </Text>
      </View>
    );
  }

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

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Zap size={13} color={colors.textInverse} strokeWidth={2} />
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
              fontSize: 84,
              lineHeight: 84,
              letterSpacing: -1.2,
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
              marginBottom: 12,
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
              <TrendingUp
                size={11}
                color="rgba(3, 17, 24, 0.65)"
                strokeWidth={2}
              />
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
        </View>
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
    <View
      style={{
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "rgba(255, 255, 255, 0.035)",
        borderWidth: 1,
        borderColor: isFull
          ? "rgba(255, 122, 138, 0.18)"
          : "rgba(255, 255, 255, 0.08)",
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
          backgroundColor: "rgba(255, 255, 255, 0.12)",
        }}
      />
      <View style={{ padding: 18 }}>
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
            borderTopColor: "rgba(255, 255, 255, 0.06)",
          }}
        >
          {budgetLabel ? <Stat label="Budget" value={budgetLabel} /> : null}
          {project.bedrooms != null ? (
            <Stat label="Bed" value={project.bedrooms} />
          ) : null}
          {project.bathrooms != null ? (
            <Stat label="Bath" value={project.bathrooms} />
          ) : null}
          <View style={{ marginLeft: "auto" }}>
            <ChevronRight size={16} color={colors.textDim} strokeWidth={1.7} />
          </View>
        </View>
      </View>
    </View>
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
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 10,
          height: 26,
          borderRadius: 13,
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
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        height: 26,
        borderRadius: 13,
        backgroundColor: "rgba(0, 212, 200, 0.10)",
        borderWidth: 1,
        borderColor: "rgba(0, 212, 200, 0.30)",
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

function Stat({
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
          fontSize: 9,
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
  const tone = TENDER_COLOR[tender.status] ?? TENDER_COLOR.draft!;
  const label = TENDER_LABEL[tender.status] ?? tender.status;
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.035)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.07)",
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
        <View
          style={{
            paddingHorizontal: 10,
            height: 26,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tone.bg,
            borderWidth: 1,
            borderColor: tone.ring,
          }}
        >
          <Text
            style={{
              color: tone.text,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Activity row ────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const unread = !item.readAt;
  const Icon = useMemo(() => {
    if (item.kind.includes("message")) return Bell;
    if (item.kind.includes("tender") || item.kind.includes("award"))
      return FileText;
    if (item.kind.includes("unlock")) return Sparkles;
    return Bell;
  }, [item.kind]);

  return (
    <View
      style={{
        padding: 14,
        borderRadius: 18,
        backgroundColor: unread
          ? "rgba(0, 212, 200, 0.06)"
          : "rgba(255, 255, 255, 0.035)",
        borderWidth: 1,
        borderColor: unread
          ? "rgba(0, 212, 200, 0.28)"
          : "rgba(255, 255, 255, 0.07)",
        flexDirection: "row",
        alignItems: "flex-start",
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

function EmptyMatches() {
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
        No new matches
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: "DMSans_400Regular",
          fontSize: 13,
          textAlign: "center",
          lineHeight: 19,
          marginTop: 8,
          maxWidth: 260,
        }}
      >
        Add or expand your service areas to see more projects here.
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
        <Text
          style={{
            color: colors.accentLight,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 12.5,
            fontWeight: "600",
          }}
        >
          Expand service areas
        </Text>
        <ArrowRight size={11} color={colors.accentLight} strokeWidth={2} />
      </View>
    </View>
  );
}

function EmptyCard({
  icon,
  copy,
}: {
  icon: React.ReactNode;
  copy: string;
}) {
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
        {icon}
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
        {copy}
      </Text>
    </View>
  );
}
