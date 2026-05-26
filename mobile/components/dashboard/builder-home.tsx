/**
 * <BuilderHome /> — v4.2 builder home, rebuilt from user feedback.
 *
 * Composition top-to-bottom:
 *
 *   ┌─ GLASS TOP BAR  (avatar · Home · bell) ─────────────────┐
 *   │                                                          │
 *   │              HERO BLOCK (centered)                       │
 *   │                                                          │
 *   │              Good afternoon,                             │
 *   │              Smith.   ← Instrument Serif italic accent   │
 *   │                                                          │
 *   │       Typewriter live-update line (cycles)               │
 *   │                                                          │
 *   │            [  Browse projects  ]   ← glowing CTA         │
 *   │                                                          │
 *   │─────────────────────────────────────────────────────────│
 *   │  FOUNDING ACCESS                                         │
 *   │  ┌─ progress ring + stats + cycle bar ───────────────┐   │
 *   │  └────────────────────────────────────────────────────┘   │
 *   │─────────────────────────────────────────────────────────│
 *   │  STATS STRIP — Active / Win rate / Total submitted       │
 *   │─────────────────────────────────────────────────────────│
 *   │  SUGGESTED FOR YOU                                       │
 *   │  ┌─ SuggestedProjectCard ────────────────────────────┐   │
 *   │  └────────────────────────────────────────────────────┘   │
 *   │─────────────────────────────────────────────────────────│
 *   │  YOUR TENDERS                                            │
 *   │  ┌─ tender rows ─────────────────────────────────────┐   │
 *   │  └────────────────────────────────────────────────────┘   │
 *   │─────────────────────────────────────────────────────────│
 *   │  RECENTLY UNLOCKED  →                                    │
 *   │  ▣▣▣▣▣  horizontal carousel of UnlockedMiniCards         │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Sentences in the typewriter are derived live from the dashboard
 * payload so the user sees their actual current state cycle.
 */

import * as React from "react";
import { Animated as RNAnimated, FlatList, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useSharedValue } from "react-native-reanimated";

import { useAuth } from "@/lib/auth";
import { useBuilderDashboard } from "@/lib/dashboard";
import { Icon } from "@/lib/icons";
import { palette, type } from "@/lib/theme";
import { haptics } from "@/lib/haptics";

import {
  AvatarV4,
  GlassTopBar,
  Pill,
  Press,
  ScreenV4,
  Surface,
  useTopBarHeight,
} from "@/components/ui/v4";
import { DashboardSkeleton } from "./skeleton";
import { ErrorView } from "./error-view";
import { TypewriterGreeting } from "./typewriter-greeting";
import { BrowseProjectsCTA } from "./browse-projects-cta";
import { FoundingAccessCard } from "./founding-access-card";
import { SuggestedProjectCard } from "./suggested-project-card";
import {
  UNLOCKED_CARD_WIDTH,
  UnlockedMiniCard,
} from "./unlocked-mini-card";
import { ActivityRow } from "@/components/ui/v4";
import type {
  BuilderDashboardPayload,
  BuilderProjectListItem,
  BuilderTenderListItem,
} from "./types";

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

const TENDER_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  shortlisted: "Shortlisted",
  awarded: "Awarded",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const TENDER_STATUS_TONE: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger"
> = {
  draft: "neutral",
  submitted: "accent",
  shortlisted: "warning",
  awarded: "success",
  rejected: "danger",
  withdrawn: "neutral",
};

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.split(/\s+/)[0] ?? name;
}

function projectLocation(p: BuilderProjectListItem): string {
  const parts = [p.suburb, p.state].filter(Boolean);
  if (parts.length === 0) return TYPE_LABEL[p.type] ?? p.type;
  return parts.join(", ");
}

function formatAud(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function relativeTime(iso: string): string {
  const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

/** Derive the typewriter sentences from live dashboard data. */
function deriveSentences(data: BuilderDashboardPayload): string[] {
  const lines: string[] = [];
  const n = data.suggested.length;
  const tenders = data.myTenders.length;

  if (tenders > 0) {
    const liveCount = data.myTenders.filter(
      (t) => t.status === "submitted" || t.status === "shortlisted",
    ).length;
    if (liveCount > 0) {
      lines.push(
        `You have ${liveCount} live tender${liveCount === 1 ? "" : "s"} in play.`,
      );
    }
  }

  if (n > 0) {
    lines.push(
      `${n} new project${n === 1 ? "" : "s"} matched your area today.`,
    );
  }

  if (data.fba.active) {
    lines.push(
      `${data.fba.remainingThisCycle} free unlock${data.fba.remainingThisCycle === 1 ? "" : "s"} left this cycle.`,
    );
    if (data.fba.totalSavedAud > 0) {
      lines.push(
        `You've saved ${formatAud(data.fba.totalSavedAud)} as a founding member.`,
      );
    }
  }

  if (data.profile.serviceAreas.length > 0) {
    const areas = data.profile.serviceAreas
      .slice(0, 2)
      .map((a) => a.suburb ?? a.state)
      .filter(Boolean)
      .join(", ");
    if (areas) {
      lines.push(`Watching for new work in ${areas}.`);
    }
  }

  if (data.activity.length > 0) {
    const unread = data.activity.filter((a) => a.readAt === null).length;
    if (unread > 0) {
      lines.push(`${unread} new update${unread === 1 ? "" : "s"} since last login.`);
    }
  }

  if (lines.length === 0) {
    lines.push("Welcome to BuilderHQ — find your next build.");
  }
  return lines;
}

// ── Component ───────────────────────────────────────────────────────────

export function BuilderHome() {
  const { user, signOut } = useAuth();
  const { data, isLoading, error, refetch } = useBuilderDashboard();
  const [refreshing, setRefreshing] = React.useState(false);
  const scrollY = useSharedValue(0);
  const topBarHeight = useTopBarHeight();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    void haptics.tap();
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const chrome = (
    <GlassTopBar
      title="Home"
      leading={
        <Press
          onPress={() => router.push("/(main)/profile")}
          haptic="tap"
          accessibilityLabel="Open profile"
        >
          <AvatarV4
            name={data?.profile.companyName ?? user?.name ?? "Builder"}
            size={32}
            verified={data?.profile.approvalStatus === "approved"}
          />
        </Press>
      }
      trailing={
        <Press
          onPress={() => router.push("/(main)/messages")}
          haptic="tap"
          accessibilityLabel="Open inbox"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.hairline,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon.Bell size={17} color={palette.text} />
        </Press>
      }
    />
  );

  if (isLoading && !data) {
    return (
      <>
        {chrome}
        <ScreenV4 variant="flat" topBarHeight={topBarHeight}>
          <DashboardSkeleton />
        </ScreenV4>
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        {chrome}
        <ScreenV4 variant="flat" topBarHeight={topBarHeight}>
          <ErrorView message={error} onRetry={() => void refetch()} />
        </ScreenV4>
      </>
    );
  }

  if (!data) {
    return (
      <>
        {chrome}
        <ScreenV4 variant="flat" topBarHeight={topBarHeight}>
          <View />
        </ScreenV4>
      </>
    );
  }

  const fName = firstName(
    data.profile.companyName?.split(/\s+/)[0] ?? user?.name,
  );
  const sentences = deriveSentences(data);

  // Tender pipeline stats (derived). Win rate = awarded / settled
  // (awarded+rejected); 0 settled returns null and we hide the stat.
  const wonCount = data.myTenders.filter((t) => t.status === "awarded").length;
  const settledCount = data.myTenders.filter(
    (t) => t.status === "awarded" || t.status === "rejected",
  ).length;
  const winRate =
    settledCount > 0 ? Math.round((wonCount / settledCount) * 100) : null;

  return (
    <>
      {chrome}
      <ScreenV4
        variant="scroll"
        scrollY={scrollY}
        onRefresh={onRefresh}
        refreshing={refreshing}
        topBarHeight={topBarHeight}
      >
        {/* ── HERO BLOCK ──────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(540).delay(60)}
          style={{ marginTop: 32, marginBottom: 8 }}
        >
          <TypewriterGreeting
            greeting={timeOfDayGreeting()}
            name={fName}
            sentences={sentences}
          />
          <BrowseProjectsCTA
            onPress={() => {
              void haptics.select();
              router.push("/(main)/projects");
            }}
          />
        </Animated.View>

        {/* ── FOUNDING ACCESS ─────────────────────────────────────── */}
        {data.fba.active ? (
          <Animated.View
            entering={FadeInDown.duration(440).delay(240)}
            style={{ marginTop: 44 }}
          >
            <SectionLabel kicker="Founding access" />
            <View style={{ marginTop: 14 }}>
              <FoundingAccessCard
                remaining={data.fba.remainingThisCycle}
                monthlyQuota={data.fba.monthlyQuota}
                daysToRefresh={data.fba.daysToRefresh}
                daysToGrantEnd={data.fba.daysToGrantEnd}
                cycleIndex={data.fba.cycleIndex}
                totalCycles={data.fba.totalCycles}
                totalSavedAud={data.fba.totalSavedAud}
                lifetimeUnlocks={data.stats.unlockedProjects}
                windowEnd={
                  new Date(
                    Date.now() +
                      data.fba.daysToGrantEnd * 24 * 60 * 60 * 1000,
                  )
                }
              />
            </View>
          </Animated.View>
        ) : null}

        {/* ── PIPELINE STATS STRIP ────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(320)}
          style={{ marginTop: 32 }}
        >
          <SectionLabel kicker="Your pipeline" />
          <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
            <PipelineStat
              label="Active"
              value={String(data.stats.activeTenders)}
              icon={<Icon.Tender size={14} color={palette.accent} />}
              accent={data.stats.activeTenders > 0}
            />
            <PipelineStat
              label="Win rate"
              value={winRate !== null ? `${winRate}%` : "—"}
              icon={<Icon.Trophy size={14} color={palette.accent} />}
            />
            <PipelineStat
              label="Submitted"
              value={String(data.myTenders.length)}
              icon={<Icon.Document size={14} color={palette.accent} />}
            />
          </View>
        </Animated.View>

        {/* ── SUGGESTED FOR YOU ───────────────────────────────────── */}
        {data.suggested.length > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(440).delay(400)}
            style={{ marginTop: 36 }}
          >
            <SectionHeader
              title="Suggested for you"
              meta={`${data.suggested.length} ${data.suggested.length === 1 ? "match" : "matches"}`}
              onSeeAll={() => router.push("/(main)/projects")}
            />
            <View style={{ marginTop: 14, gap: 14 }}>
              {data.suggested.slice(0, 3).map((p) => (
                <SuggestedProjectCard
                  key={p.id}
                  title={p.title}
                  typeLabel={TYPE_LABEL[p.type]}
                  location={projectLocation(p)}
                  budgetLabel={
                    p.budgetBand
                      ? BUDGET_LABEL[p.budgetBand] ?? p.budgetBand
                      : undefined
                  }
                  bedrooms={p.bedrooms ?? undefined}
                  bathrooms={p.bathrooms ?? undefined}
                  unlockedCount={p.unlockedCount}
                  isNew={isNewlyPublished(p.publishedAt)}
                  onPress={() => router.push(`/(main)/projects/${p.slug}`)}
                />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* ── YOUR TENDERS ────────────────────────────────────────── */}
        {data.myTenders.length > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(440).delay(480)}
            style={{ marginTop: 36 }}
          >
            <SectionHeader
              title="Your tenders"
              meta={`${data.myTenders.length} active`}
            />
            <Surface padding={0} style={{ marginTop: 14 }}>
              {data.myTenders.slice(0, 5).map((t, i) => (
                <View key={t.id}>
                  <Press
                    onPress={() => router.push(`/(main)/tenders/${t.id}`)}
                    haptic="soft"
                    scaleTo={0.99}
                  >
                    <TenderRow tender={t} />
                  </Press>
                  {i < Math.min(data.myTenders.length, 5) - 1 ? (
                    <RowDivider />
                  ) : null}
                </View>
              ))}
            </Surface>
          </Animated.View>
        ) : null}

        {/* ── RECENTLY UNLOCKED (horizontal scroll) ───────────────── */}
        {data.unlocked.length > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(440).delay(560)}
            // Negative side margin so the carousel can extend full-bleed
            // beyond the screen's page padding.
            style={{ marginTop: 36, marginHorizontal: -20 }}
          >
            <View style={{ paddingHorizontal: 20 }}>
              <SectionHeader
                title="Recently unlocked"
                meta="Swipe →"
                onSeeAll={() => router.push("/(main)/projects")}
              />
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={data.unlocked.slice(0, 8)}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 14,
                gap: 12,
              }}
              snapToInterval={UNLOCKED_CARD_WIDTH + 12}
              decelerationRate="fast"
              renderItem={({ item }) => (
                <UnlockedMiniCard
                  title={item.title}
                  typeKey={item.type}
                  typeLabel={TYPE_LABEL[item.type] ?? item.type}
                  location={projectLocation(item)}
                  budgetLabel={
                    item.budgetBand
                      ? BUDGET_LABEL[item.budgetBand] ?? item.budgetBand
                      : undefined
                  }
                  bedrooms={item.bedrooms}
                  bathrooms={item.bathrooms}
                  onPress={() =>
                    router.push(`/(main)/projects/${item.slug}`)
                  }
                />
              )}
            />
          </Animated.View>
        ) : null}

        {/* ── ACTIVITY ────────────────────────────────────────────── */}
        {data.activity.length > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(440).delay(640)}
            style={{ marginTop: 36 }}
          >
            <SectionHeader title="Recent activity" />
            <Surface padding={0} style={{ marginTop: 14 }}>
              {data.activity.slice(0, 5).map((a, i) => (
                <View key={a.id}>
                  <ActivityRow
                    kind={a.kind}
                    title={a.title}
                    subtitle={a.body ?? undefined}
                    time={relativeTime(a.createdAt)}
                    unread={a.readAt === null}
                  />
                  {i < Math.min(data.activity.length, 5) - 1 ? (
                    <RowDivider />
                  ) : null}
                </View>
              ))}
            </Surface>
          </Animated.View>
        ) : null}

        {/* Sign out — quiet */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(720)}
          style={{ marginTop: 40, alignItems: "center" }}
        >
          <Press
            onPress={async () => {
              void haptics.tap();
              await signOut();
              router.replace("/(auth)/login");
            }}
            haptic="none"
            style={{ paddingVertical: 12, paddingHorizontal: 24 }}
          >
            <Text
              style={{
                fontSize: 13,
                color: palette.textDim,
                letterSpacing: 0.3,
              }}
            >
              Sign out
            </Text>
          </Press>
        </Animated.View>
      </ScreenV4>
    </>
  );
}

// ── small sub-components ────────────────────────────────────────────────

function SectionLabel({ kicker }: { kicker: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: palette.accent,
        }}
      />
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: "700",
          letterSpacing: 1.8,
          color: palette.accent,
        }}
      >
        {kicker.toUpperCase()}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  meta,
  onSeeAll,
}: {
  title: string;
  meta?: string;
  onSeeAll?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          ...type.title,
          color: palette.text,
          fontWeight: "600",
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>
      {onSeeAll ? (
        <Press
          onPress={onSeeAll}
          haptic="tap"
          style={{ paddingVertical: 4, paddingHorizontal: 4 }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.4,
              color: palette.accent,
            }}
          >
            {(meta ?? "SEE ALL").toUpperCase()}
          </Text>
        </Press>
      ) : meta ? (
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 1.4,
            color: palette.textDim,
          }}
        >
          {meta.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

function PipelineStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: accent ? palette.hairlineAccent : palette.hairline,
        backgroundColor: accent ? palette.accentMuted : palette.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {icon}
        <Text
          style={{
            fontSize: 9.5,
            fontWeight: "700",
            letterSpacing: 1.6,
            color: accent ? palette.accent : palette.textDim,
          }}
        >
          {label.toUpperCase()}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 22,
          lineHeight: 26,
          fontWeight: "700",
          color: accent ? palette.accentLight : palette.text,
          fontVariant: ["tabular-nums"],
          marginTop: 10,
          letterSpacing: -0.3,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function TenderRow({ tender }: { tender: BuilderTenderListItem }) {
  const tone = TENDER_STATUS_TONE[tender.status] ?? "neutral";
  const statusLabel = TENDER_STATUS_LABEL[tender.status] ?? tender.status;
  return (
    <View style={{ paddingHorizontal: 18, paddingVertical: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              ...type.titleSmall,
              color: palette.text,
              fontWeight: "600",
            }}
          >
            {tender.projectTitle}
          </Text>
          {tender.totalPriceAud != null ? (
            <Text
              style={{
                ...type.bodySmall,
                color: palette.textMuted,
                marginTop: 4,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatAud(tender.totalPriceAud)}
              {tender.durationWeeks ? ` · ${tender.durationWeeks}w` : ""}
            </Text>
          ) : null}
        </View>
        <Pill tone={tone}>{statusLabel}</Pill>
      </View>
    </View>
  );
}

function RowDivider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: palette.hairline,
        marginHorizontal: 18,
      }}
    />
  );
}

function isNewlyPublished(iso: string | null): boolean {
  if (!iso) return false;
  const diffMs = Date.now() - new Date(iso).getTime();
  return diffMs < 1000 * 60 * 60 * 48; // < 48 hours
}
