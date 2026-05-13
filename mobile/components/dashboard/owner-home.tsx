/**
 * <OwnerHome /> — the project-owner mobile dashboard.
 *
 * Hierarchy of attention (top to bottom):
 *   1. Hero — "Good morning, Aryan." Time-of-day-aware greeting in
 *      Bebas display so the surface feels editorial, not SaaS.
 *   2. Stat strip — 2×2 grid of the only four numbers an owner asks
 *      themselves: active projects, drafts, tenders received, unread
 *      messages. Tappable, with subtle gradient borders for the live
 *      teal one (unread > 0 / tenders > 0).
 *   3. Projects — vertical cards, each tap → project detail (route
 *      lands in the next pass). Status pill, suburb, three inline
 *      stats per card.
 *   4. Activity — timeline of the last 8-12 notifications. Soft
 *      icons per kind, relative time ("2h ago"), tap → action url.
 *
 * Native UX rituals baked in:
 *   · SafeArea on top + bottom (Screen wrapper)
 *   · Pull-to-refresh (RefreshControl + haptic burst on release)
 *   · Light haptic on every nav tap
 *   · Reanimated entrance — staggered FadeInUp on each section
 *   · prefers-reduced-motion friendly (animations short, idle state
 *     fully accessible)
 *   · Empty states: illustrative, never a blank screen
 *
 * Data: useOwnerDashboard hook owns the fetch + refresh state. Empty
 * arrays render dedicated empty-state cards. No spinners — only
 * skeletons during initial load.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import {
  Bell,
  ChevronRight,
  FileText,
  Home as HomeIcon,
  Inbox,
  Layers,
  MessageSquare,
  Plus,
  Sparkles,
  Wrench,
  Building,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { haptics } from "@/lib/haptics";
import { useOwnerDashboard } from "@/lib/dashboard";

import { DashboardSkeleton } from "./skeleton";
import { ErrorView } from "./error-view";
import type {
  ActivityItem,
  OwnerDashboardStats,
  OwnerProjectListItem,
} from "./types";

// ── Helpers ──────────────────────────────────────────────────────────

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

/** Status pill colour tokens. */
const STATUS_TONE: Record<string, { bg: string; ring: string; text: string }> = {
  draft: {
    bg: "rgba(238, 246, 255, 0.06)",
    ring: "rgba(238, 246, 255, 0.12)",
    text: "#98b8d0",
  },
  published: {
    bg: "rgba(0, 212, 200, 0.10)",
    ring: "rgba(0, 212, 200, 0.30)",
    text: "#7ef5ed",
  },
  tendering: {
    bg: "rgba(0, 212, 200, 0.14)",
    ring: "rgba(0, 212, 200, 0.45)",
    text: "#00d4c8",
  },
  awarded: {
    bg: "rgba(134, 239, 172, 0.10)",
    ring: "rgba(134, 239, 172, 0.30)",
    text: "#86efac",
  },
  archived: {
    bg: "rgba(238, 246, 255, 0.04)",
    ring: "rgba(238, 246, 255, 0.08)",
    text: "#567080",
  },
  rejected: {
    bg: "rgba(255, 122, 138, 0.10)",
    ring: "rgba(255, 122, 138, 0.30)",
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
  const diffSec = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (diffSec < 60) return "just now";
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function projectTypeIcon(type: string) {
  const props = { size: 16, color: "#7ef5ed", strokeWidth: 1.6 };
  switch (type) {
    case "single_dwelling":
      return <HomeIcon {...props} />;
    case "multi_dwelling":
      return <Building {...props} />;
    case "renovation":
      return <Wrench {...props} />;
    case "extension":
      return <Layers {...props} />;
    default:
      return <HomeIcon {...props} />;
  }
}

function activityIcon(kind: string) {
  const props = { size: 14, color: "#98b8d0", strokeWidth: 1.7 };
  if (kind.includes("message")) return <MessageSquare {...props} />;
  if (kind.includes("tender") || kind.includes("award"))
    return <FileText {...props} />;
  if (kind.includes("unlock")) return <Sparkles {...props} />;
  return <Bell {...props} />;
}

// ── Screen ───────────────────────────────────────────────────────────

export function OwnerHome() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useOwnerDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState(() => timeOfDayGreeting());

  // Recompute greeting every minute so it stays correct across the
  // morning→afternoon→evening boundaries while the user has the app open.
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

  // ── Initial load skeleton ──
  if (isLoading && !data) {
    return (
      <Screen variant="flat">
        <DashboardSkeleton />
      </Screen>
    );
  }

  // ── Hard error ──
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
    <Screen variant="flat">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 56,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7ef5ed"
            colors={["#7ef5ed"]}
            progressBackgroundColor="#0c1726"
          />
        }
      >
        {/* Hero */}
        <Animated.View entering={FadeInUp.delay(40).duration(420).springify()}>
          <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium">
            Dashboard
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(100).duration(420).springify()}>
          <Text className="text-text font-display tracking-[-0.018em] text-[44px] leading-[0.95] mt-3">
            {greeting}
            {firstName ? (
              <>
                {", "}
                <Text className="text-accent-light">{firstName}</Text>
              </>
            ) : null}
            <Text className="text-accent-light">.</Text>
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(160).duration(420).springify()}>
          <Text className="text-text-muted text-[15px] leading-[22px] mt-3">
            {projects.length === 0
              ? "Let's get your first project onboarded."
              : `${projects.length} ${projects.length === 1 ? "project" : "projects"} on the go.`}
          </Text>
        </Animated.View>

        {/* Stat strip */}
        <Animated.View
          entering={FadeInUp.delay(220).duration(440).springify()}
          className="mt-8"
        >
          <StatRow stats={stats} />
        </Animated.View>

        {/* Projects */}
        <Animated.View
          entering={FadeInUp.delay(280).duration(440).springify()}
          className="mt-10"
        >
          <SectionHeader
            kicker="Your projects"
            title={
              projects.length === 0 ? "Nothing here yet" : "Tap to dive in"
            }
            ctaLabel="New"
            ctaIcon={<Plus size={14} color="#031118" strokeWidth={2.5} />}
            onCta={() => {
              void haptics.tap();
              router.push("/(main)/browse");
            }}
          />
          {projects.length === 0 ? (
            <EmptyProjects />
          ) : (
            <View className="mt-4 gap-3">
              {projects.map((p, i) => (
                <Animated.View
                  key={p.id}
                  entering={FadeInUp.delay(320 + i * 50)
                    .duration(420)
                    .springify()}
                >
                  <OwnerProjectCard project={p} />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Activity */}
        <Animated.View
          entering={FadeInUp.delay(380).duration(440).springify()}
          className="mt-10"
        >
          <SectionHeader
            kicker="Activity"
            title={activity.length === 0 ? "Quiet so far" : "Recent updates"}
          />
          {activity.length === 0 ? (
            <EmptyActivity />
          ) : (
            <View className="mt-4">
              {activity.map((a, i) => (
                <Animated.View
                  key={a.id}
                  entering={FadeInUp.delay(420 + i * 30)
                    .duration(360)
                    .springify()}
                >
                  <ActivityRow item={a} />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

// ── Section header ───────────────────────────────────────────────────

function SectionHeader({
  kicker,
  title,
  ctaLabel,
  ctaIcon,
  onCta,
}: {
  kicker: string;
  title: string;
  ctaLabel?: string;
  ctaIcon?: React.ReactNode;
  onCta?: () => void;
}) {
  return (
    <View className="flex-row items-end justify-between">
      <View>
        <Text className="text-accent text-[10px] tracking-[0.22em] uppercase font-ui font-medium">
          {kicker}
        </Text>
        <Text className="text-text font-ui font-semibold text-[16px] tracking-[-0.005em] mt-1">
          {title}
        </Text>
      </View>
      {ctaLabel && onCta ? (
        <Pressable
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          className="flex-row items-center gap-1.5 h-9 px-3 rounded-md bg-accent active:bg-accent-active"
        >
          {ctaIcon}
          <Text className="text-accent-contrast font-ui font-semibold text-[12.5px]">
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Stat row ─────────────────────────────────────────────────────────

function StatRow({ stats }: { stats: OwnerDashboardStats | undefined }) {
  if (!stats) return null;
  return (
    <View>
      <View className="flex-row gap-3">
        <StatTile
          label="Active projects"
          value={stats.activeProjects}
          tone={stats.activeProjects > 0 ? "accent" : "neutral"}
        />
        <StatTile
          label="Drafts"
          value={stats.draftProjects}
          tone="neutral"
        />
      </View>
      <View className="flex-row gap-3 mt-3">
        <StatTile
          label="Tenders received"
          value={stats.totalTenders}
          tone={stats.totalTenders > 0 ? "accent" : "neutral"}
        />
        <StatTile
          label="Unread messages"
          value={stats.unreadMessages}
          tone={stats.unreadMessages > 0 ? "accent" : "neutral"}
        />
      </View>
    </View>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "accent";
}) {
  const accent = tone === "accent";
  return (
    <View
      className="flex-1 rounded-xl border bg-surface-1/40 px-4 py-4"
      style={{
        borderColor: accent
          ? "rgba(0, 212, 200, 0.30)"
          : "rgba(100, 180, 255, 0.10)",
      }}
    >
      <Text className="text-text-faint text-[9.5px] tracking-[0.18em] uppercase font-ui font-medium">
        {label}
      </Text>
      <Text
        className="font-display text-[36px] leading-[1.0] mt-2 tracking-[-0.005em]"
        style={{ color: accent ? "#7ef5ed" : "#eef6ff" }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Project card ─────────────────────────────────────────────────────

function OwnerProjectCard({ project }: { project: OwnerProjectListItem }) {
  const status = STATUS_TONE[project.status] ?? STATUS_TONE.archived!;
  const location = [project.suburb, project.state].filter(Boolean).join(", ");
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;
  const statusLabel = STATUS_LABEL[project.status] ?? project.status;

  const onPress = useCallback(() => {
    void haptics.tap();
    router.push(`/(main)/projects/${project.slug}` as never);
  }, [project.slug]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${project.title}, ${statusLabel}`}
      className="rounded-xl border border-border bg-surface-1/40 px-4 py-4 active:bg-surface-1/70"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2">
            {projectTypeIcon(project.type)}
            <Text className="text-text-muted text-[11.5px] font-ui">
              {typeLabel}
            </Text>
          </View>
          <Text
            className="text-text font-ui font-semibold text-[16px] tracking-[-0.005em] mt-1.5"
            numberOfLines={1}
          >
            {project.title}
          </Text>
          {location ? (
            <Text className="text-text-faint text-[12.5px] mt-0.5" numberOfLines={1}>
              {location}
            </Text>
          ) : null}
        </View>

        <View
          className="px-2.5 h-7 rounded-full justify-center border"
          style={{
            backgroundColor: status.bg,
            borderColor: status.ring,
          }}
        >
          <Text
            className="text-[9.5px] tracking-[0.18em] uppercase font-ui font-semibold"
            style={{ color: status.text }}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-4 mt-4">
        <ProjectStat label="Builders" value={`${project.stats.unlockCount}/3`} />
        <ProjectStat label="Tenders" value={project.stats.tenderCount} />
        <ProjectStat
          label="Unread"
          value={project.stats.unreadMessages}
          highlight={project.stats.unreadMessages > 0}
        />
        <View className="ml-auto">
          <ChevronRight size={16} color="#567080" strokeWidth={1.7} />
        </View>
      </View>
    </Pressable>
  );
}

function ProjectStat({
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
      <Text className="text-text-faint text-[9px] tracking-[0.16em] uppercase font-ui">
        {label}
      </Text>
      <Text
        className="font-ui font-semibold text-[14px] mt-0.5"
        style={{ color: highlight ? "#7ef5ed" : "#eef6ff" }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Activity row ─────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const unread = !item.readAt;

  const onPress = useCallback(() => {
    void haptics.tap();
    if (item.actionUrl) {
      // For now we route by stripping the host; in the next pass we
      // map kinds → typed routes. Activity rows without an actionUrl
      // are non-interactive (status pings).
      try {
        const u = new URL(item.actionUrl);
        router.push(u.pathname as never);
      } catch {
        /* malformed url — leave it */
      }
    }
  }, [item.actionUrl]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!item.actionUrl}
      className="flex-row items-start gap-3 py-3 active:bg-surface-1/30 rounded-md"
    >
      <View
        className="size-7 rounded-full items-center justify-center border"
        style={{
          backgroundColor: unread
            ? "rgba(0, 212, 200, 0.10)"
            : "rgba(100, 180, 255, 0.04)",
          borderColor: unread
            ? "rgba(0, 212, 200, 0.30)"
            : "rgba(100, 180, 255, 0.10)",
        }}
      >
        {activityIcon(item.kind)}
      </View>
      <View className="flex-1 min-w-0">
        <Text
          className="text-text font-ui text-[13.5px] leading-[18px]"
          numberOfLines={2}
          style={{ fontWeight: unread ? "600" : "400" }}
        >
          {item.title}
        </Text>
        {item.body ? (
          <Text
            className="text-text-faint text-[12px] leading-[16px] mt-0.5"
            numberOfLines={1}
          >
            {item.body}
          </Text>
        ) : null}
      </View>
      <Text className="text-text-dim text-[10.5px] mt-1">
        {relativeTime(item.createdAt)}
      </Text>
    </Pressable>
  );
}

// ── Empty states ─────────────────────────────────────────────────────

function EmptyProjects() {
  return (
    <View className="mt-4 rounded-xl border border-border-subtle bg-surface-1/30 px-5 py-8 items-center">
      <View
        className="size-12 rounded-full border border-border-accent items-center justify-center"
        style={{ backgroundColor: "rgba(0, 212, 200, 0.06)" }}
      >
        <HomeIcon size={20} color="#7ef5ed" strokeWidth={1.6} />
      </View>
      <Text className="text-text font-display text-[20px] tracking-[-0.005em] uppercase mt-4">
        No projects yet
      </Text>
      <Text className="text-text-muted text-[13px] leading-[19px] text-center mt-2 max-w-[260px]">
        Onboard your first project to start receiving tenders from vetted builders.
      </Text>
    </View>
  );
}

function EmptyActivity() {
  return (
    <View className="mt-4 rounded-xl border border-border-subtle bg-surface-1/30 px-5 py-6 items-center">
      <Inbox size={18} color="#567080" strokeWidth={1.5} />
      <Text className="text-text-muted text-[12.5px] leading-[19px] text-center mt-2 max-w-[260px]">
        No activity yet. When builders unlock, tender, or message you, it lands here.
      </Text>
    </View>
  );
}
