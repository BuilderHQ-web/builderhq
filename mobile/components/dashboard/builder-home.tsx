/**
 * <BuilderHome /> — v4 premium builder dashboard.
 *
 * Composition top-to-bottom:
 *
 *   1. ScreenHeader — collapsible "Home" title with avatar trailing
 *   2. Hero — kicker (greeting) + plain title + Instrument italic accent
 *      ("Your tenders." / "Find work." depending on state)
 *   3. HeroNumberCard — the day's most-actionable metric
 *      · Active tenders waiting on owner  → big number + "view tenders"
 *      · FBA founding access active       → remaining free unlocks
 *      · Matched projects                 → "N projects matched"
 *      · Onboarding                       → "Complete your profile"
 *   4. StatRow — Active tenders / Unlocked / Saved
 *   5. Suggested projects — Surface list of matched projects
 *   6. My tenders — Surface list with status pills
 *   7. Recent activity
 *
 * Builder-specific bits:
 *   · Profile gating — if approval pending / rejected, hero swaps to a
 *     status-aware card that explains the state without dead-ending.
 *   · FBA emphasis — when founding access is active, the free-unlock
 *     count is featured prominently. Time-limited offer = urgency.
 */

import * as React from "react";
import { Text, View } from "react-native";
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
  BigNumber,
  Hero,
  Pill,
  Press,
  Row,
  ScreenHeader,
  ScreenV4,
  Surface,
} from "@/components/ui/v4";
import { DashboardSkeleton } from "./skeleton";
import { ErrorView } from "./error-view";
import type {
  ActivityItem,
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

function timeOfDayGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.split(/\s+/)[0] ?? name;
}

function suburbLineOf(p: BuilderProjectListItem): string {
  const parts = [p.suburb, p.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : TYPE_LABEL[p.type] ?? p.type;
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
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

// ── Component ───────────────────────────────────────────────────────────

export function BuilderHome() {
  const { user, signOut } = useAuth();
  const { data, isLoading, error, refetch } = useBuilderDashboard();
  const [refreshing, setRefreshing] = React.useState(false);
  const scrollY = useSharedValue(0);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    void haptics.tap();
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !data) {
    return (
      <ScreenV4 variant="flat">
        <DashboardSkeleton />
      </ScreenV4>
    );
  }

  if (error && !data) {
    return (
      <ScreenV4 variant="flat">
        <ErrorView message={error} onRetry={() => void refetch()} />
      </ScreenV4>
    );
  }

  if (!data) {
    return <ScreenV4 variant="flat"><View /></ScreenV4>;
  }

  const greeting = timeOfDayGreeting();
  const fName = firstName(user?.name);
  const stats = data.stats;

  // Pick the screen's narrative based on builder state.
  const heroNarrative = pickBuilderNarrative(data);

  return (
    <ScreenV4
      variant="scroll"
      scrollY={scrollY}
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      <ScreenHeader
        title="Home"
        scrollY={scrollY}
        trailing={
          <Press
            onPress={() => router.push("/(main)/profile")}
            haptic="tap"
            accessibilityLabel="Open profile"
          >
            <AvatarV4
              name={data.profile.companyName ?? user?.name ?? "Builder"}
              size={36}
              verified={data.profile.approvalStatus === "approved"}
            />
          </Press>
        }
      />

      {/* Hero */}
      <Animated.View entering={FadeInDown.duration(420).delay(40)}>
        <Hero
          kicker={`${greeting.toUpperCase()}, ${fName.toUpperCase()}`}
          title={heroNarrative.heroTitle}
          accent={heroNarrative.heroAccent}
          sub={heroNarrative.heroSub}
        />
      </Animated.View>

      {/* Hero number card */}
      <Animated.View
        entering={FadeInDown.duration(440).delay(160)}
        style={{ marginTop: 28 }}
      >
        <HeroNumberCard data={data} />
      </Animated.View>

      {/* Stat row */}
      <Animated.View
        entering={FadeInDown.duration(440).delay(260)}
        style={{ marginTop: 16, flexDirection: "row", gap: 10 }}
      >
        <StatTileBlock
          label="Tenders"
          value={stats.activeTenders}
          accent={stats.activeTenders > 0}
        />
        <StatTileBlock label="Unlocked" value={stats.unlockedProjects} />
        <StatTileBlock
          label="Saved"
          value={stats.savedProjects}
          onPress={() => router.push("/(main)/browse")}
        />
      </Animated.View>

      {/* My tenders */}
      {data.myTenders.length > 0 ? (
        <Animated.View
          entering={FadeInDown.duration(440).delay(360)}
          style={{ marginTop: 40 }}
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

      {/* Suggested / matched */}
      {data.suggested.length > 0 ? (
        <Animated.View
          entering={FadeInDown.duration(440).delay(440)}
          style={{ marginTop: 40 }}
        >
          <SectionHeader
            title="Matched for you"
            meta={`${data.suggested.length} project${data.suggested.length === 1 ? "" : "s"}`}
          />
          <Surface padding={0} style={{ marginTop: 14 }}>
            {data.suggested.slice(0, 5).map((p, i) => (
              <View key={p.id}>
                <Press
                  onPress={() => router.push(`/(main)/projects/${p.slug}`)}
                  haptic="soft"
                  scaleTo={0.99}
                >
                  <SuggestedRow project={p} />
                </Press>
                {i < Math.min(data.suggested.length, 5) - 1 ? (
                  <RowDivider />
                ) : null}
              </View>
            ))}
          </Surface>
          <Press
            onPress={() => router.push("/(main)/browse")}
            haptic="tap"
            style={{
              marginTop: 12,
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 10,
              paddingHorizontal: 18,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: palette.accent,
                letterSpacing: 0.2,
              }}
            >
              See all matches
            </Text>
            <Icon.ArrowRight size={14} color={palette.accent} />
          </Press>
        </Animated.View>
      ) : null}

      {/* Activity */}
      {data.activity.length > 0 ? (
        <Animated.View
          entering={FadeInDown.duration(440).delay(520)}
          style={{ marginTop: 40 }}
        >
          <SectionHeader title="Recent activity" />
          <Surface padding={0} style={{ marginTop: 14 }}>
            {data.activity.slice(0, 6).map((a, i) => (
              <View key={a.id}>
                <ActivityRow item={a} />
                {i < Math.min(data.activity.length, 6) - 1 ? (
                  <RowDivider />
                ) : null}
              </View>
            ))}
          </Surface>
        </Animated.View>
      ) : null}

      {/* Sign out — quiet */}
      <Animated.View
        entering={FadeInDown.duration(440).delay(620)}
        style={{ marginTop: 48, alignItems: "center" }}
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
  );
}

// ── Hero narrative selection ────────────────────────────────────────────

interface HeroNarrative {
  heroTitle: string;
  heroAccent: string;
  heroSub?: string;
}

function pickBuilderNarrative(
  data: BuilderDashboardPayload,
): HeroNarrative {
  // Profile not yet set up — must complete onboarding first.
  if (!data.profile.hasProfile) {
    return {
      heroTitle: "Set up your",
      heroAccent: "profile.",
      heroSub: "Tell us about your business so we can match you with projects.",
    };
  }

  // Approval pending — verification in flight
  if (data.profile.approvalStatus === "pending") {
    return {
      heroTitle: "Verification",
      heroAccent: "in flight.",
      heroSub: "We're checking your ABN and licence. Usually under 24 hours.",
    };
  }

  // Active tenders → focus there
  if (data.stats.activeTenders > 0) {
    return {
      heroTitle: "Your",
      heroAccent: "tenders.",
      heroSub: `${data.stats.activeTenders} ${data.stats.activeTenders === 1 ? "tender" : "tenders"} in play.`,
    };
  }

  // No tenders yet → focus on finding work
  return {
    heroTitle: "Find your next",
    heroAccent: "build.",
    heroSub:
      data.suggested.length > 0
        ? `${data.suggested.length} project${data.suggested.length === 1 ? "" : "s"} matched today.`
        : "We'll match you with verified projects in your service area.",
  };
}

// ── Sub-components ──────────────────────────────────────────────────────

function HeroNumberCard({ data }: { data: BuilderDashboardPayload }) {
  // Pre-approval state: gate by profile setup.
  if (!data.profile.hasProfile) {
    return (
      <Surface variant="accent" padding={28} hairline>
        <Text style={{ ...type.kicker, color: palette.accent, fontWeight: "600" }}>
          Action required
        </Text>
        <Text
          style={{
            ...type.titleLarge,
            color: palette.text,
            fontWeight: "600",
            marginTop: 16,
            maxWidth: 280,
          }}
        >
          Complete your profile to start.
        </Text>
        <Text style={{ ...type.body, color: palette.textMuted, marginTop: 12 }}>
          Add your ABN, licence, and service area on web.
        </Text>
      </Surface>
    );
  }

  if (data.profile.approvalStatus === "pending") {
    return (
      <Surface padding={28} hairline>
        <Text style={{ ...type.kicker, color: palette.warning, fontWeight: "600" }}>
          Pending verification
        </Text>
        <Text
          style={{
            ...type.titleLarge,
            color: palette.text,
            fontWeight: "600",
            marginTop: 16,
          }}
        >
          We&apos;re reviewing your ABN.
        </Text>
        <Text style={{ ...type.body, color: palette.textMuted, marginTop: 12 }}>
          You can browse projects while you wait. Unlocks open once verified.
        </Text>
      </Surface>
    );
  }

  // FBA active — feature founding access prominently
  if (data.fba.active) {
    return (
      <Surface variant="accent" padding={28} hairline>
        <Text style={{ ...type.kicker, color: palette.accent, fontWeight: "600" }}>
          Founding access
        </Text>
        <View
          style={{
            marginTop: 14,
            flexDirection: "row",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <BigNumber value={data.fba.remainingThisCycle} size="lg" color={palette.text} />
          <Text style={{ ...type.body, color: palette.textMuted }}>
            free unlock{data.fba.remainingThisCycle === 1 ? "" : "s"} left
          </Text>
        </View>
        <Text
          style={{
            ...type.bodySmall,
            color: palette.textMuted,
            marginTop: 10,
          }}
        >
          Refreshes in {data.fba.daysToRefresh} day
          {data.fba.daysToRefresh === 1 ? "" : "s"} · grant ends in{" "}
          {data.fba.daysToGrantEnd} days
        </Text>
        {data.fba.totalSavedAud > 0 ? (
          <Pill tone="accent" size="md" style={{ marginTop: 16 }}>
            Saved {formatAud(data.fba.totalSavedAud)} so far
          </Pill>
        ) : null}
      </Surface>
    );
  }

  // Active tenders — surface count + nudge
  if (data.stats.activeTenders > 0) {
    return (
      <Surface variant="accent" padding={28} hairline>
        <Text style={{ ...type.kicker, color: palette.accent, fontWeight: "600" }}>
          Tenders in play
        </Text>
        <View
          style={{
            marginTop: 14,
            flexDirection: "row",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <BigNumber value={data.stats.activeTenders} size="lg" color={palette.text} />
          <Text style={{ ...type.body, color: palette.textMuted }}>
            awaiting decision
          </Text>
        </View>
        <Text style={{ ...type.bodySmall, color: palette.textMuted, marginTop: 10 }}>
          Median time to decision · 5-10 days
        </Text>
      </Surface>
    );
  }

  // Default — promote browsing
  return (
    <Surface padding={28} hairline>
      <Text style={{ ...type.kicker, color: palette.accent, fontWeight: "600" }}>
        Discover
      </Text>
      <View
        style={{
          marginTop: 14,
          flexDirection: "row",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <BigNumber value={data.suggested.length} size="lg" color={palette.text} />
        <Text style={{ ...type.body, color: palette.textMuted }}>
          {data.suggested.length === 1 ? "match" : "matches"} for you
        </Text>
      </View>
      <Press
        onPress={() => router.push("/(main)/browse")}
        haptic="select"
        style={{
          marginTop: 22,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          alignSelf: "flex-start",
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: 999,
          backgroundColor: palette.accent,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: palette.accentContrast,
          }}
        >
          Browse projects
        </Text>
        <Icon.ArrowRight size={16} color={palette.accentContrast} />
      </Press>
    </Surface>
  );
}

function StatTileBlock({
  label,
  value,
  accent = false,
  onPress,
}: {
  label: string;
  value: number;
  accent?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <Surface
      variant={accent ? "accent" : "default"}
      padding={16}
      style={{ flex: 1, alignItems: "flex-start" }}
    >
      <Text
        style={{
          ...type.kicker,
          color: accent ? palette.accent : palette.textDim,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          ...type.numericLarge,
          color: accent ? palette.accentLight : palette.text,
          fontVariant: ["tabular-nums"],
          fontWeight: "600",
          marginTop: 10,
        }}
      >
        {value}
      </Text>
    </Surface>
  );
  if (!onPress) return body;
  return (
    <View style={{ flex: 1 }}>
      <Press onPress={onPress} haptic="soft" scaleTo={0.98}>
        {body}
      </Press>
    </View>
  );
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
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
        }}
      >
        {title}
      </Text>
      {meta ? (
        <Text
          style={{
            ...type.caption,
            color: palette.textDim,
            letterSpacing: 0.6,
            fontWeight: "600",
          }}
        >
          {meta.toUpperCase()}
        </Text>
      ) : null}
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
            style={{ ...type.titleSmall, color: palette.text, fontWeight: "600" }}
          >
            {tender.projectTitle}
          </Text>
          {tender.totalPriceAud != null ? (
            <Text
              style={{
                ...type.bodySmall,
                color: palette.textMuted,
                marginTop: 4,
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

function SuggestedRow({ project }: { project: BuilderProjectListItem }) {
  return (
    <View style={{ paddingHorizontal: 18, paddingVertical: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ ...type.titleSmall, color: palette.text, fontWeight: "600" }}
          >
            {project.title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              ...type.bodySmall,
              color: palette.textMuted,
              marginTop: 4,
            }}
          >
            {suburbLineOf(project)}
            {project.budgetBand
              ? ` · ${BUDGET_LABEL[project.budgetBand] ?? project.budgetBand}`
              : ""}
          </Text>
        </View>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          {project.unlockedCount > 0 ? (
            <Pill tone="neutral">{project.unlockedCount}/3 unlocked</Pill>
          ) : null}
          <Icon.ChevronRight size={16} color={palette.textDim} />
        </View>
      </View>
    </View>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const unread = item.readAt === null;
  const iconColor = unread ? palette.accent : palette.textDim;
  return (
    <Row
      paddingX={18}
      paddingY={14}
      leading={
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: unread ? palette.accentMuted : palette.surfaceElev,
            borderWidth: 1,
            borderColor: unread ? palette.hairlineAccent : palette.hairline,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {iconForActivityKind(item.kind, iconColor)}
        </View>
      }
      title={item.title}
      subtitle={item.body ?? undefined}
      trailing={
        <Text
          style={{
            ...type.caption,
            color: palette.textDim,
            letterSpacing: 0.3,
          }}
        >
          {relativeTime(item.createdAt)}
        </Text>
      }
    />
  );
}

function iconForActivityKind(kind: string, color: string): React.ReactNode {
  switch (kind) {
    case "tender_submitted":
      return <Icon.Tender size={16} color={color} />;
    case "tender_shortlisted":
      return <Icon.CheckCircle size={16} color={color} />;
    case "tender_awarded":
      return <Icon.Trophy size={16} color={color} />;
    case "tender_rejected":
      return <Icon.Close size={16} color={color} />;
    case "tender_withdrawn":
      return <Icon.Close size={16} color={color} />;
    default:
      return <Icon.Bell size={16} color={color} />;
  }
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
