/**
 * <BuilderHome /> — v4.1 premium builder dashboard.
 *
 * Same chrome as OwnerHome: sticky <GlassTopBar /> carries identity,
 * scroll content is just content. Narrative tuned for builders:
 *   · Profile gating (not set up / pending / approved)
 *   · FBA founding-access featured prominently when active
 *   · Active tenders surface
 *   · Matched projects feed
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
  ActivityRow,
  AvatarV4,
  BigNumber,
  GlassTopBar,
  Pill,
  Press,
  ProjectCard,
  ScreenV4,
  Surface,
  useTopBarHeight,
} from "@/components/ui/v4";
import { DashboardSkeleton } from "./skeleton";
import { ErrorView } from "./error-view";
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
  if (h < 5) return "Late night";
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
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

  const fName = firstName(user?.name);

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
        {/* Quiet kicker greeting */}
        <Animated.View entering={FadeInDown.duration(420).delay(40)}>
          <Text
            style={{
              ...type.caption,
              color: palette.textDim,
              fontWeight: "600",
              letterSpacing: 2.2,
              marginTop: 4,
            }}
          >
            {timeOfDayGreeting().toUpperCase()}, {fName.toUpperCase()}
          </Text>
        </Animated.View>

        {/* Hero card — picks the right narrative based on builder state */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(140)}
          style={{ marginTop: 16 }}
        >
          <BuilderHeroCard data={data} />
        </Animated.View>

        {/* Stat row */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(240)}
          style={{ marginTop: 12, flexDirection: "row", gap: 10 }}
        >
          <StatTile
            label="Tenders"
            value={data.stats.activeTenders}
            accent={data.stats.activeTenders > 0}
          />
          <StatTile label="Unlocked" value={data.stats.unlockedProjects} />
          <StatTile
            label="Saved"
            value={data.stats.savedProjects}
            onPress={() => router.push("/(main)/projects")}
          />
        </Animated.View>

        {/* My tenders */}
        {data.myTenders.length > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(440).delay(340)}
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

        {/* Matched projects — Airbnb-style ProjectCards */}
        {data.suggested.length > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(440).delay(440)}
            style={{ marginTop: 36 }}
          >
            <SectionHeader
              title="Matched for you"
              meta={`${data.suggested.length} project${data.suggested.length === 1 ? "" : "s"}`}
            />
            <View style={{ marginTop: 14, gap: 12 }}>
              {data.suggested.slice(0, 4).map((p) => (
                <ProjectCard
                  key={p.id}
                  title={p.title}
                  location={projectLocation(p)}
                  typeLabel={TYPE_LABEL[p.type]}
                  statusLabel={
                    p.budgetBand
                      ? BUDGET_LABEL[p.budgetBand] ?? p.budgetBand
                      : undefined
                  }
                  statusTone="accent"
                  stats={{
                    unlockedOf: { current: p.unlockedCount, total: 3 },
                  }}
                  onPress={() =>
                    router.push(`/(main)/projects/${p.slug}`)
                  }
                />
              ))}
            </View>
            <Press
              onPress={() => router.push("/(main)/projects")}
              haptic="tap"
              style={{
                marginTop: 14,
                paddingVertical: 12,
                alignItems: "center",
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
                See all matches →
              </Text>
            </Press>
          </Animated.View>
        ) : null}

        {/* Activity */}
        {data.activity.length > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(440).delay(540)}
            style={{ marginTop: 36 }}
          >
            <SectionHeader title="Recent activity" />
            <Surface padding={0} style={{ marginTop: 14 }}>
              {data.activity.slice(0, 6).map((a, i) => (
                <View key={a.id}>
                  <ActivityRow
                    kind={a.kind}
                    title={a.title}
                    subtitle={a.body ?? undefined}
                    time={relativeTime(a.createdAt)}
                    unread={a.readAt === null}
                  />
                  {i < Math.min(data.activity.length, 6) - 1 ? (
                    <RowDivider />
                  ) : null}
                </View>
              ))}
            </Surface>
          </Animated.View>
        ) : null}

        {/* Sign out */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(640)}
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

// ── Hero card variants ──────────────────────────────────────────────────

function BuilderHeroCard({ data }: { data: BuilderDashboardPayload }) {
  if (!data.profile.hasProfile) {
    return (
      <Surface variant="accent" padding={24} hairline>
        <Text
          style={{
            ...type.caption,
            color: palette.accent,
            fontWeight: "600",
            letterSpacing: 2,
          }}
        >
          ACTION REQUIRED
        </Text>
        <Text
          style={{
            ...type.titleLarge,
            color: palette.text,
            fontWeight: "600",
            marginTop: 14,
            maxWidth: 280,
          }}
        >
          Complete your profile.
        </Text>
        <Text style={{ ...type.body, color: palette.textMuted, marginTop: 10 }}>
          Add your ABN, licence, and service area on web.
        </Text>
      </Surface>
    );
  }

  if (data.profile.approvalStatus === "pending") {
    return (
      <Surface padding={24} hairline>
        <Text
          style={{
            ...type.caption,
            color: palette.warning,
            fontWeight: "600",
            letterSpacing: 2,
          }}
        >
          PENDING VERIFICATION
        </Text>
        <Text
          style={{
            ...type.titleLarge,
            color: palette.text,
            fontWeight: "600",
            marginTop: 14,
          }}
        >
          We&apos;re reviewing your ABN.
        </Text>
        <Text style={{ ...type.body, color: palette.textMuted, marginTop: 10 }}>
          You can browse projects while you wait. Unlocks open once verified.
        </Text>
      </Surface>
    );
  }

  if (data.fba.active) {
    return (
      <Surface variant="accent" padding={24} hairline>
        <Text
          style={{
            ...type.caption,
            color: palette.accent,
            fontWeight: "600",
            letterSpacing: 2,
          }}
        >
          FOUNDING ACCESS
        </Text>
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <BigNumber
            value={data.fba.remainingThisCycle}
            size="lg"
            color={palette.text}
          />
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
          <Pill tone="accent" size="md" style={{ marginTop: 14 }}>
            Saved {formatAud(data.fba.totalSavedAud)} so far
          </Pill>
        ) : null}
      </Surface>
    );
  }

  if (data.stats.activeTenders > 0) {
    return (
      <Surface variant="accent" padding={24} hairline>
        <Text
          style={{
            ...type.caption,
            color: palette.accent,
            fontWeight: "600",
            letterSpacing: 2,
          }}
        >
          TENDERS IN PLAY
        </Text>
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <BigNumber
            value={data.stats.activeTenders}
            size="lg"
            color={palette.text}
          />
          <Text style={{ ...type.body, color: palette.textMuted }}>
            awaiting decision
          </Text>
        </View>
        <Text
          style={{ ...type.bodySmall, color: palette.textMuted, marginTop: 10 }}
        >
          Median time to decision · 5-10 days
        </Text>
      </Surface>
    );
  }

  return (
    <Surface padding={24} hairline>
      <Text
        style={{
          ...type.caption,
          color: palette.accent,
          fontWeight: "600",
          letterSpacing: 2,
        }}
      >
        DISCOVER
      </Text>
      <View
        style={{
          marginTop: 12,
          flexDirection: "row",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <BigNumber
          value={data.suggested.length}
          size="lg"
          color={palette.text}
        />
        <Text style={{ ...type.body, color: palette.textMuted }}>
          {data.suggested.length === 1 ? "match" : "matches"} for you
        </Text>
      </View>
      <Press
        onPress={() => router.push("/(main)/projects")}
        haptic="select"
        style={{
          marginTop: 20,
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

// ── Small bits ──────────────────────────────────────────────────────────

function StatTile({
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
      padding={14}
      style={{ flex: 1, alignItems: "flex-start" }}
    >
      <Text
        style={{
          ...type.caption,
          color: accent ? palette.accent : palette.textDim,
          fontWeight: "600",
          letterSpacing: 1.6,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          ...type.numericLarge,
          fontSize: 26,
          lineHeight: 30,
          color: accent ? palette.accentLight : palette.text,
          fontVariant: ["tabular-nums"],
          fontWeight: "600",
          marginTop: 8,
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
          letterSpacing: -0.15,
        }}
      >
        {title}
      </Text>
      {meta ? (
        <Text
          style={{
            ...type.caption,
            color: palette.textDim,
            letterSpacing: 1.4,
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
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
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
