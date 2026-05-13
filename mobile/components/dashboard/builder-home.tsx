/**
 * <BuilderHome /> — the builder mobile dashboard.
 *
 * Hierarchy of attention:
 *   1. Hero — time-of-day greeting + company name in Bebas display.
 *   2. FBA card — the single most important read for a builder: do I
 *      have free credits left this cycle? Highly visible band with the
 *      remaining count + days to refresh. Renders an "inactive" state
 *      when the grant has lapsed or never existed.
 *   3. Stat tiles — active tenders, unlocked projects, saved projects.
 *      Tap-targets ready for the corresponding screens once they land.
 *   4. New for you — top suggested in-area projects. The "open the app
 *      to see what's new" surface that drives daily return visits.
 *   5. My tenders — active submissions with status pills.
 *   6. Recently unlocked — quick re-entry into projects already opened.
 *   7. Activity — last 10 notifications.
 *
 * Native UX rituals identical to OwnerHome — pull-to-refresh, light
 * haptic on every tap, staggered Reanimated FadeInUp entrances,
 * skeleton on first paint, dedicated empty states per section.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import {
  Building,
  ChevronRight,
  FileText,
  Home as HomeIcon,
  Inbox,
  Layers,
  Sparkles,
  Wrench,
  Zap,
  TrendingUp,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { haptics } from "@/lib/haptics";
import { useBuilderDashboard } from "@/lib/dashboard";

import { DashboardSkeleton } from "./skeleton";
import { ErrorView } from "./error-view";
import type {
  ActivityItem,
  BuilderDashboardPayload,
  BuilderProjectListItem,
  BuilderTenderListItem,
} from "./types";

// ── Helpers ──────────────────────────────────────────────────────────

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

const TENDER_TONE: Record<string, { bg: string; ring: string; text: string }> = {
  draft: { bg: "rgba(238,246,255,0.06)", ring: "rgba(238,246,255,0.12)", text: "#98b8d0" },
  submitted: { bg: "rgba(0,212,200,0.10)", ring: "rgba(0,212,200,0.30)", text: "#7ef5ed" },
  shortlisted: { bg: "rgba(125,211,252,0.10)", ring: "rgba(125,211,252,0.30)", text: "#7dd3fc" },
  awarded: { bg: "rgba(134,239,172,0.10)", ring: "rgba(134,239,172,0.30)", text: "#86efac" },
  rejected: { bg: "rgba(255,122,138,0.10)", ring: "rgba(255,122,138,0.30)", text: "#ff7a8a" },
  withdrawn: { bg: "rgba(238,246,255,0.04)", ring: "rgba(238,246,255,0.08)", text: "#567080" },
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
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function projectTypeIcon(type: string, size = 14) {
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

function navigateToProject(slug: string) {
  void haptics.tap();
  router.push(`/(main)/projects/${slug}` as never);
}

// ── Screen ───────────────────────────────────────────────────────────

export function BuilderHome() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useBuilderDashboard();
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
  const companyName = data.profile.companyName;
  const headlineName = companyName ?? firstName;

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
            {headlineName ? (
              <>
                {", "}
                <Text className="text-accent-light">{headlineName}</Text>
              </>
            ) : null}
            <Text className="text-accent-light">.</Text>
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(160).duration(420).springify()}>
          <Text className="text-text-muted text-[15px] leading-[22px] mt-3">
            {subheadCopy(data)}
          </Text>
        </Animated.View>

        {/* FBA strip */}
        <Animated.View
          entering={FadeInUp.delay(220).duration(440).springify()}
          className="mt-8"
        >
          <FbaCard fba={data.fba} />
        </Animated.View>

        {/* Stat strip */}
        <Animated.View
          entering={FadeInUp.delay(280).duration(440).springify()}
          className="mt-4"
        >
          <View className="flex-row gap-3">
            <StatTile
              label="Active tenders"
              value={data.stats.activeTenders}
              tone={data.stats.activeTenders > 0 ? "accent" : "neutral"}
            />
            <StatTile
              label="Unlocked"
              value={data.stats.unlockedProjects}
              tone="neutral"
            />
            <StatTile
              label="Saved"
              value={data.stats.savedProjects}
              tone="neutral"
            />
          </View>
        </Animated.View>

        {/* New for you */}
        <Animated.View
          entering={FadeInUp.delay(340).duration(440).springify()}
          className="mt-10"
        >
          <SectionHeader
            kicker="For you"
            title={
              data.suggested.length === 0
                ? "Nothing in your area yet"
                : "New on the marketplace"
            }
            ctaLabel="Browse all"
            ctaIcon={<Sparkles size={14} color="#031118" strokeWidth={2} />}
            onCta={() => {
              void haptics.tap();
              router.push("/(main)/browse");
            }}
          />
          {data.suggested.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={20} color="#7ef5ed" strokeWidth={1.6} />}
              title="No new matches"
              copy="Add or expand your service areas to see more projects here."
            />
          ) : (
            <View className="mt-4 gap-3">
              {data.suggested.map((p, i) => (
                <Animated.View
                  key={p.id}
                  entering={FadeInUp.delay(380 + i * 50)
                    .duration(420)
                    .springify()}
                >
                  <MarketProjectCard project={p} />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* My tenders */}
        <Animated.View
          entering={FadeInUp.delay(440).duration(440).springify()}
          className="mt-10"
        >
          <SectionHeader
            kicker="My tenders"
            title={
              data.myTenders.length === 0
                ? "No active submissions"
                : `${data.myTenders.length} in flight`
            }
          />
          {data.myTenders.length === 0 ? (
            <EmptyState
              icon={<FileText size={18} color="#567080" strokeWidth={1.6} />}
              copy="Tenders you draft or submit will appear here, ranked by status."
            />
          ) : (
            <View className="mt-4 gap-2">
              {data.myTenders.map((t, i) => (
                <Animated.View
                  key={t.id}
                  entering={FadeInUp.delay(480 + i * 40)
                    .duration(380)
                    .springify()}
                >
                  <TenderRow tender={t} />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Recently unlocked */}
        <Animated.View
          entering={FadeInUp.delay(540).duration(440).springify()}
          className="mt-10"
        >
          <SectionHeader
            kicker="Recently unlocked"
            title={
              data.unlocked.length === 0
                ? "Nothing yet"
                : "Pick up where you left off"
            }
          />
          {data.unlocked.length === 0 ? (
            <EmptyState
              icon={<Zap size={18} color="#567080" strokeWidth={1.6} />}
              copy="Projects you unlock will live here for quick re-entry."
            />
          ) : (
            <View className="mt-4 gap-3">
              {data.unlocked.map((p, i) => (
                <Animated.View
                  key={p.id}
                  entering={FadeInUp.delay(580 + i * 40)
                    .duration(380)
                    .springify()}
                >
                  <MarketProjectCard project={p} />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Activity */}
        <Animated.View
          entering={FadeInUp.delay(640).duration(440).springify()}
          className="mt-10"
        >
          <SectionHeader
            kicker="Activity"
            title={
              data.activity.length === 0 ? "Quiet so far" : "Recent updates"
            }
          />
          {data.activity.length === 0 ? (
            <EmptyState
              icon={<Inbox size={18} color="#567080" strokeWidth={1.6} />}
              copy="Tender outcomes, new projects, and messages will land here."
            />
          ) : (
            <View className="mt-4">
              {data.activity.map((a, i) => (
                <Animated.View
                  key={a.id}
                  entering={FadeInUp.delay(680 + i * 30)
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
  return "Stay tuned — new projects land here as soon as they go live.";
}

// ── FBA card ─────────────────────────────────────────────────────────

function FbaCard({ fba }: { fba: BuilderDashboardPayload["fba"] }) {
  if (!fba.active) {
    const reason =
      fba.reason === "no_grant"
        ? "Founding Builder Access isn't active yet."
        : fba.reason === "expired"
          ? "Your Founding Builder Access has ended."
          : "Founding Builder Access was revoked.";
    return (
      <View
        className="rounded-xl border bg-surface-1/40 px-4 py-4"
        style={{ borderColor: "rgba(100,180,255,0.10)" }}
      >
        <View className="flex-row items-center gap-2">
          <Zap size={14} color="#567080" strokeWidth={1.6} />
          <Text className="text-text-faint text-[10.5px] tracking-[0.22em] uppercase font-ui font-medium">
            Founding access
          </Text>
        </View>
        <Text className="text-text-muted text-[13.5px] leading-[19px] mt-2.5">
          {reason} Unlocks are charged per project.
        </Text>
      </View>
    );
  }

  // Active grant — show the headline number plus a refresh stat.
  return (
    <View
      className="rounded-xl border px-4 py-4"
      style={{
        backgroundColor: "rgba(0, 212, 200, 0.06)",
        borderColor: "rgba(0, 212, 200, 0.30)",
      }}
    >
      <View className="flex-row items-center gap-2">
        <Zap size={14} color="#7ef5ed" strokeWidth={1.6} />
        <Text className="text-accent text-[10.5px] tracking-[0.22em] uppercase font-ui font-medium">
          Founding access
        </Text>
        <Text className="text-text-dim text-[10.5px]">·</Text>
        <Text className="text-text-faint text-[10.5px] tracking-[0.16em] uppercase font-ui">
          Cycle {fba.cycleIndex + 1} / {fba.totalCycles}
        </Text>
      </View>

      <View className="flex-row items-end gap-4 mt-3">
        <View>
          <Text className="font-display text-[44px] leading-[0.9] text-accent-light tracking-[-0.005em]">
            {fba.remainingThisCycle}
          </Text>
          <Text className="text-text-muted text-[11.5px] mt-1">
            of {fba.monthlyQuota} free unlocks left
          </Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-text-faint text-[10px] tracking-[0.18em] uppercase font-ui">
            Refresh in
          </Text>
          <Text className="text-text font-ui font-semibold text-[14.5px] mt-1">
            {fba.daysToRefresh} {fba.daysToRefresh === 1 ? "day" : "days"}
          </Text>
        </View>
      </View>

      {fba.totalSavedAud > 0 ? (
        <View className="flex-row items-center gap-1.5 mt-3">
          <TrendingUp size={11} color="#86efac" strokeWidth={1.6} />
          <Text className="text-text-muted text-[11.5px]">
            Saved ${fba.totalSavedAud.toLocaleString("en-AU")} so far
          </Text>
        </View>
      ) : null}
    </View>
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

// ── Stat tile ────────────────────────────────────────────────────────

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
      className="flex-1 rounded-xl border bg-surface-1/40 px-3.5 py-3.5"
      style={{
        borderColor: accent
          ? "rgba(0, 212, 200, 0.30)"
          : "rgba(100, 180, 255, 0.10)",
      }}
    >
      <Text className="text-text-faint text-[9px] tracking-[0.16em] uppercase font-ui font-medium">
        {label}
      </Text>
      <Text
        className="font-display text-[28px] leading-[1.0] mt-1.5 tracking-[-0.005em]"
        style={{ color: accent ? "#7ef5ed" : "#eef6ff" }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Project card ─────────────────────────────────────────────────────

function MarketProjectCard({ project }: { project: BuilderProjectListItem }) {
  const isFull = project.unlockedCount >= 3;
  const location = [project.suburb, project.state].filter(Boolean).join(", ");
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;
  const budgetLabel = project.budgetBand
    ? BUDGET_LABEL[project.budgetBand] ?? project.budgetBand
    : null;

  return (
    <Pressable
      onPress={() => navigateToProject(project.slug)}
      accessibilityRole="button"
      accessibilityLabel={`${project.title}, ${typeLabel}`}
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

        {isFull ? (
          <View
            className="px-2.5 h-7 rounded-full justify-center border"
            style={{
              backgroundColor: "rgba(255, 122, 138, 0.10)",
              borderColor: "rgba(255, 122, 138, 0.30)",
            }}
          >
            <Text
              className="text-[9.5px] tracking-[0.18em] uppercase font-ui font-semibold"
              style={{ color: "#ff7a8a" }}
            >
              Full
            </Text>
          </View>
        ) : (
          <View
            className="px-2.5 h-7 rounded-full justify-center border"
            style={{
              backgroundColor: "rgba(0, 212, 200, 0.10)",
              borderColor: "rgba(0, 212, 200, 0.30)",
            }}
          >
            <Text
              className="text-[9.5px] tracking-[0.18em] uppercase font-ui font-semibold"
              style={{ color: "#7ef5ed" }}
            >
              {project.unlockedCount}/3
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-4 mt-4">
        {budgetLabel ? (
          <ProjectStat label="Budget" value={budgetLabel} />
        ) : null}
        {project.bedrooms != null ? (
          <ProjectStat label="Bed" value={project.bedrooms} />
        ) : null}
        {project.bathrooms != null ? (
          <ProjectStat label="Bath" value={project.bathrooms} />
        ) : null}
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
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View>
      <Text className="text-text-faint text-[9px] tracking-[0.16em] uppercase font-ui">
        {label}
      </Text>
      <Text className="font-ui font-semibold text-[12.5px] mt-0.5 text-text">
        {value}
      </Text>
    </View>
  );
}

// ── Tender row ───────────────────────────────────────────────────────

function TenderRow({ tender }: { tender: BuilderTenderListItem }) {
  const tone = TENDER_TONE[tender.status] ?? TENDER_TONE.draft!;
  const label = TENDER_LABEL[tender.status] ?? tender.status;
  return (
    <Pressable
      onPress={() => navigateToProject(tender.projectSlug)}
      className="rounded-xl border border-border bg-surface-1/40 px-4 py-3.5 active:bg-surface-1/70"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 min-w-0">
          <Text
            className="text-text font-ui font-semibold text-[14px]"
            numberOfLines={1}
          >
            {tender.projectTitle}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            {tender.totalPriceAud != null ? (
              <Text className="text-text-faint text-[11.5px]">
                ${tender.totalPriceAud.toLocaleString("en-AU")}
              </Text>
            ) : null}
            {tender.durationWeeks != null ? (
              <>
                {tender.totalPriceAud != null ? (
                  <Text className="text-text-dim text-[11.5px]">·</Text>
                ) : null}
                <Text className="text-text-faint text-[11.5px]">
                  {tender.durationWeeks} wks
                </Text>
              </>
            ) : null}
            {tender.submittedAt ? (
              <>
                <Text className="text-text-dim text-[11.5px]">·</Text>
                <Text className="text-text-faint text-[11.5px]">
                  {relativeTime(tender.submittedAt)}
                </Text>
              </>
            ) : null}
          </View>
        </View>
        <View
          className="px-2 h-6 rounded-full justify-center border"
          style={{ backgroundColor: tone.bg, borderColor: tone.ring }}
        >
          <Text
            className="text-[9.5px] tracking-[0.16em] uppercase font-ui font-semibold"
            style={{ color: tone.text }}
          >
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Activity row ─────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const unread = !item.readAt;
  return (
    <Pressable
      onPress={() => {
        void haptics.tap();
        if (!item.actionUrl) return;
        try {
          const u = new URL(item.actionUrl);
          router.push(u.pathname as never);
        } catch {}
      }}
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
        <FileText size={14} color={unread ? "#7ef5ed" : "#98b8d0"} strokeWidth={1.6} />
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

// ── Empty state ──────────────────────────────────────────────────────

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
    <View className="mt-4 rounded-xl border border-border-subtle bg-surface-1/30 px-5 py-6 items-center">
      <View
        className="size-10 rounded-full border border-border-subtle items-center justify-center"
        style={{ backgroundColor: "rgba(255,255,255,0.018)" }}
      >
        {icon}
      </View>
      {title ? (
        <Text className="text-text font-display text-[18px] tracking-[-0.005em] uppercase mt-3">
          {title}
        </Text>
      ) : null}
      <Text className="text-text-muted text-[12.5px] leading-[19px] text-center mt-2 max-w-[280px]">
        {copy}
      </Text>
    </View>
  );
}
