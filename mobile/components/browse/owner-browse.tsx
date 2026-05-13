/**
 * <OwnerBrowse /> — owner-side browse.
 *
 * Owners don't have a marketplace to browse; their "browse" tab is
 * effectively a paginated list of their own projects with a top-bar
 * filter for status, and a CTA to start a new one (deep-links to the
 * web wizard for now — native onboarding is a separate ship).
 *
 * Reuses the owner dashboard endpoint (which already returns the full
 * project list up to 20) — for most owners that's more than enough.
 * If a power user has more, a follow-up adds pagination here. Keeping
 * the screen lean for now.
 */
import { useCallback, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import {
  Building,
  ChevronRight,
  Home as HomeIcon,
  Layers,
  MapPin,
  Plus,
  Sparkles,
  Wrench,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { useOwnerDashboard } from "@/lib/dashboard";
import { haptics } from "@/lib/haptics";
import { env } from "@/lib/env";
import type { OwnerProjectListItem } from "@/components/dashboard/types";
import { ErrorView } from "@/components/dashboard/error-view";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "draft", label: "Drafts" },
  { value: "tendering", label: "Tendering" },
  { value: "awarded", label: "Awarded" },
] as const;

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
const STATUS_TONE: Record<string, { bg: string; ring: string; text: string }> = {
  draft: {
    bg: "rgba(238,246,255,0.06)",
    ring: "rgba(238,246,255,0.12)",
    text: "#98b8d0",
  },
  published: {
    bg: "rgba(0,212,200,0.10)",
    ring: "rgba(0,212,200,0.30)",
    text: "#7ef5ed",
  },
  tendering: {
    bg: "rgba(0,212,200,0.14)",
    ring: "rgba(0,212,200,0.45)",
    text: "#00d4c8",
  },
  awarded: {
    bg: "rgba(134,239,172,0.10)",
    ring: "rgba(134,239,172,0.30)",
    text: "#86efac",
  },
  archived: {
    bg: "rgba(238,246,255,0.04)",
    ring: "rgba(238,246,255,0.08)",
    text: "#567080",
  },
  rejected: {
    bg: "rgba(255,122,138,0.10)",
    ring: "rgba(255,122,138,0.30)",
    text: "#ff7a8a",
  },
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

export function OwnerBrowse() {
  const { data, isLoading, error, refetch } = useOwnerDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] =
    useState<(typeof STATUS_FILTERS)[number]["value"]>("all");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void haptics.tap();
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const visible = useMemo(() => {
    const all = data?.projects ?? [];
    if (filter === "all") return all;
    if (filter === "live") {
      return all.filter((p) => p.status === "published" || p.status === "tendering");
    }
    return all.filter((p) => p.status === filter);
  }, [data, filter]);

  if (error && !data) {
    return (
      <Screen variant="flat">
        <ErrorView message={error} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen variant="flat">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 96 }}
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
        {/* Header */}
        <View
          className="px-6 pt-3 pb-3 border-b"
          style={{ borderColor: "rgba(100, 180, 255, 0.06)" }}
        >
          <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium">
            Projects
          </Text>
          <Text className="text-text font-display tracking-[-0.018em] text-[28px] leading-[1.0] mt-0.5">
            All my projects
          </Text>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 8 }}
        >
          {STATUS_FILTERS.map((f) => {
            const selected = filter === f.value;
            return (
              <Pressable
                key={f.value}
                onPress={() => {
                  void haptics.select();
                  setFilter(f.value);
                }}
                className="h-9 px-3.5 rounded-full border items-center justify-center active:opacity-70"
                style={{
                  backgroundColor: selected
                    ? "rgba(0, 212, 200, 0.12)"
                    : "rgba(255, 255, 255, 0.02)",
                  borderColor: selected
                    ? "rgba(0, 212, 200, 0.40)"
                    : "rgba(100, 180, 255, 0.10)",
                }}
              >
                <Text
                  className="text-[12.5px] font-ui"
                  style={{
                    color: selected ? "#7ef5ed" : "#98b8d0",
                    fontWeight: selected ? "600" : "500",
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Project list */}
        {isLoading && !data ? (
          <View className="px-6 gap-3">
            <View className="h-24 rounded-xl bg-surface-1/40" />
            <View className="h-24 rounded-xl bg-surface-1/40" />
            <View className="h-24 rounded-xl bg-surface-1/40" />
          </View>
        ) : visible.length === 0 ? (
          <OwnerEmpty filter={filter} />
        ) : (
          <View className="px-6 gap-3">
            {visible.map((p, i) => (
              <Animated.View
                key={p.id}
                entering={FadeInUp.delay(i * 30).duration(380).springify()}
              >
                <OwnerProjectCard project={p} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating action button — new project */}
      <Pressable
        onPress={() => {
          void haptics.tap();
          void Linking.openURL(`${env.apiBaseUrl}/owner/projects/new`);
        }}
        accessibilityRole="button"
        accessibilityLabel="New project"
        className="absolute bottom-6 right-6 flex-row items-center gap-2 h-12 px-5 rounded-full bg-accent active:bg-accent-active"
        style={{
          shadowColor: "#00d4c8",
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Plus size={16} color="#031118" strokeWidth={2.4} />
        <Text className="text-accent-contrast font-ui font-semibold text-[13.5px] tracking-[0.02em]">
          New project
        </Text>
      </Pressable>
    </Screen>
  );
}

// ── Owner project card ──────────────────────────────────────────────

function OwnerProjectCard({ project }: { project: OwnerProjectListItem }) {
  const status = STATUS_TONE[project.status] ?? STATUS_TONE.archived!;
  const statusLabel = STATUS_LABEL[project.status] ?? project.status;
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;
  const location = [project.suburb, project.state].filter(Boolean).join(", ");

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
            {typeIcon(project.type, 13)}
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
            <View className="flex-row items-center gap-1 mt-0.5">
              <MapPin size={11} color="#98b8d0" strokeWidth={1.6} />
              <Text className="text-text-faint text-[12px]" numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}
        </View>
        <View
          className="px-2.5 h-7 rounded-full justify-center border"
          style={{ backgroundColor: status.bg, borderColor: status.ring }}
        >
          <Text
            className="text-[9.5px] tracking-[0.18em] uppercase font-ui font-semibold"
            style={{ color: status.text }}
          >
            {statusLabel}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-4 mt-3">
        <Stat label="Builders" value={`${project.stats.unlockCount}/3`} />
        <Stat label="Tenders" value={project.stats.tenderCount} />
        <Stat
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

function OwnerEmpty({ filter }: { filter: string }) {
  return (
    <View className="px-8 py-16 items-center">
      <View
        className="size-14 rounded-full border border-border-accent items-center justify-center"
        style={{ backgroundColor: "rgba(0, 212, 200, 0.06)" }}
      >
        <Sparkles size={20} color="#7ef5ed" strokeWidth={1.6} />
      </View>
      <Text className="text-text font-display text-[28px] tracking-[-0.012em] uppercase mt-5">
        {filter === "all" ? "No projects yet" : "Nothing here"}
      </Text>
      <Text className="text-text-muted text-[13.5px] leading-[20px] text-center mt-3 max-w-[280px]">
        {filter === "all"
          ? "Start your first project to onboard builders and receive tenders."
          : "Try a different status filter or tap + below to start a new project."}
      </Text>
    </View>
  );
}
