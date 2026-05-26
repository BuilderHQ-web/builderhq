/**
 * <OwnerHome /> — v4.1 premium owner dashboard.
 *
 * Page identity lives in the sticky <GlassTopBar /> (avatar | "Home"
 * | bell). The first thing in scroll is content that EARNS the user's
 * attention — not another block of "Home / GOOD AFTERNOON / Your
 * projects." chrome.
 *
 * Composition top-to-bottom:
 *   1. GlassTopBar — sticky chrome, avatar + "Home" + bell
 *   2. Quiet welcome line — "Afternoon, Ryan." (small kicker text)
 *   3. HeroCard — the single most-actionable surface for today
 *      · Tenders to review (animated big number + CTA)
 *      · OR "Your projects are live, waiting on builders"
 *      · OR onboarding push
 *   4. StatRow — three premium tile cards
 *   5. Projects section — list of <ProjectCard /> with breathing room
 *   6. Recent activity — premium <ActivityRow /> with kind-tinted icons
 *
 * Goals:
 *   · Header carries identity → no display title block in scroll
 *   · Projects are easy to scan and feel like content, not chrome
 *   · Activity at a glance: kind = colored icon background
 */

import * as React from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useSharedValue } from "react-native-reanimated";

import { useAuth } from "@/lib/auth";
import { useOwnerDashboard } from "@/lib/dashboard";
import { Icon } from "@/lib/icons";
import { palette, type } from "@/lib/theme";
import { haptics } from "@/lib/haptics";

import {
  ActivityRow,
  AvatarV4,
  BigNumber,
  GlassTopBar,
  Press,
  ProjectCard,
  ScreenV4,
  Surface,
  useTopBarHeight,
} from "@/components/ui/v4";
import { DashboardSkeleton } from "./skeleton";
import { ErrorView } from "./error-view";
import type { OwnerProjectListItem } from "./types";

// ── Mapping tables ──────────────────────────────────────────────────────

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

const STATUS_TONE: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger"
> = {
  draft: "neutral",
  published: "accent",
  tendering: "accent",
  awarded: "success",
  archived: "neutral",
  rejected: "danger",
};

function timeOfDayGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.split(/\s+/)[0] ?? name;
}

function locationLine(p: OwnerProjectListItem): string {
  const parts = [p.suburb, p.state, p.postcode].filter(Boolean);
  if (parts.length === 0) return TYPE_LABEL[p.type] ?? p.type;
  return parts.join(" · ");
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

export function OwnerHome() {
  const { user, signOut } = useAuth();
  const { data, isLoading, error, refetch } = useOwnerDashboard();
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
          <AvatarV4 name={user?.name ?? "BuilderHQ"} size={32} />
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
          {data && data.stats.unreadMessages > 0 ? (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 9,
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: palette.accent,
                borderWidth: 1.5,
                borderColor: palette.surface,
              }}
            />
          ) : null}
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
  const stats = data.stats;
  const projects = data.projects;
  const activity = data.activity;

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
        {/* Quiet welcome — small kicker text, not a display title. The
            sticky bar above already carries the page identity. */}
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

        {/* Hero card — single, focused, the day's main action */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(140)}
          style={{ marginTop: 16 }}
        >
          <HeroCard
            tenderCount={stats.totalTenders}
            activeProjects={stats.activeProjects}
            draftProjects={stats.draftProjects}
            onPressTenders={() => {
              const target = projects.find((p) => p.stats.tenderCount > 0);
              if (target) {
                void haptics.select();
                router.push(`/(main)/projects/${target.slug}`);
              }
            }}
            onPressBrowse={() => {
              void haptics.select();
              router.push("/(main)/projects");
            }}
          />
        </Animated.View>

        {/* Stat row */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(240)}
          style={{ marginTop: 12, flexDirection: "row", gap: 10 }}
        >
          <StatTile label="Active" value={stats.activeProjects} />
          <StatTile label="Drafts" value={stats.draftProjects} />
          <StatTile
            label="Unread"
            value={stats.unreadMessages}
            accent={stats.unreadMessages > 0}
            onPress={() => router.push("/(main)/messages")}
          />
        </Animated.View>

        {/* Projects */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(340)}
          style={{ marginTop: 36 }}
        >
          <SectionHeader
            title="Your projects"
            meta={
              projects.length > 0
                ? `${projects.length} ${projects.length === 1 ? "project" : "projects"}`
                : undefined
            }
          />
          {projects.length === 0 ? (
            <EmptyProjects />
          ) : (
            <View style={{ marginTop: 14, gap: 12 }}>
              {projects.slice(0, 4).map((p, i) => (
                <ProjectCard
                  key={p.id}
                  title={p.title}
                  location={locationLine(p)}
                  typeLabel={TYPE_LABEL[p.type]}
                  statusLabel={STATUS_LABEL[p.status]}
                  statusTone={STATUS_TONE[p.status] ?? "neutral"}
                  stats={{
                    tenders: p.stats.tenderCount,
                    unlocks: p.stats.unlockCount,
                    unread: p.stats.unreadMessages,
                  }}
                  featured={i === 0 && p.stats.tenderCount > 0}
                  onPress={() =>
                    router.push(`/(main)/projects/${p.slug}`)
                  }
                />
              ))}
              {projects.length > 4 ? (
                <Press
                  onPress={() => router.push("/(main)/projects")}
                  haptic="tap"
                  style={{
                    paddingVertical: 14,
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
                    See all {projects.length} projects →
                  </Text>
                </Press>
              ) : null}
            </View>
          )}
        </Animated.View>

        {/* Activity */}
        {activity.length > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(440).delay(440)}
            style={{ marginTop: 36 }}
          >
            <SectionHeader title="Recent activity" />
            <Surface padding={0} style={{ marginTop: 14 }}>
              {activity.slice(0, 6).map((a, i) => (
                <View key={a.id}>
                  <ActivityRow
                    kind={a.kind}
                    title={a.title}
                    subtitle={a.body ?? undefined}
                    time={relativeTime(a.createdAt)}
                    unread={a.readAt === null}
                  />
                  {i < Math.min(activity.length, 6) - 1 ? (
                    <RowDivider />
                  ) : null}
                </View>
              ))}
            </Surface>
          </Animated.View>
        ) : null}

        {/* Sign out — quiet */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(560)}
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

// ── Sub-components ──────────────────────────────────────────────────────

/** The single hero surface — state-aware. */
function HeroCard({
  tenderCount,
  activeProjects,
  draftProjects,
  onPressTenders,
  onPressBrowse,
}: {
  tenderCount: number;
  activeProjects: number;
  draftProjects: number;
  onPressTenders: () => void;
  onPressBrowse: () => void;
}) {
  if (tenderCount > 0) {
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
          TENDERS TO REVIEW
        </Text>
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <BigNumber value={tenderCount} size="lg" color={palette.text} />
          <Text style={{ ...type.body, color: palette.textMuted }}>
            {tenderCount === 1 ? "tender" : "tenders"} in
          </Text>
        </View>
        <Press
          onPress={onPressTenders}
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
            Review tenders
          </Text>
          <Icon.ArrowRight size={16} color={palette.accentContrast} />
        </Press>
      </Surface>
    );
  }

  if (activeProjects > 0) {
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
          YOUR PROJECTS ARE LIVE
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
          Waiting on builders to tender.
        </Text>
        <Text
          style={{ ...type.body, color: palette.textMuted, marginTop: 10 }}
        >
          Median first response is 24 hours.
        </Text>
      </Surface>
    );
  }

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
        WELCOME TO BUILDERHQ
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
        {draftProjects > 0 ? "Publish your draft." : "Start your first build."}
      </Text>
      <Text
        style={{ ...type.body, color: palette.textMuted, marginTop: 10 }}
      >
        {draftProjects > 0
          ? `You have ${draftProjects} draft${draftProjects === 1 ? "" : "s"} ready to go live.`
          : "Upload your plans and we'll match verified builders within days."}
      </Text>
      <Press
        onPress={onPressBrowse}
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
          {draftProjects > 0 ? "Open drafts" : "Get started"}
        </Text>
        <Icon.ArrowRight size={16} color={palette.accentContrast} />
      </Press>
    </Surface>
  );
}

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

function EmptyProjects() {
  return (
    <Surface padding={28} style={{ marginTop: 14, alignItems: "center" }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: palette.accentMuted,
          borderWidth: 1,
          borderColor: palette.hairlineAccent,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Icon.Project size={22} color={palette.accent} />
      </View>
      <Text
        style={{
          ...type.title,
          color: palette.text,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        No projects yet
      </Text>
      <Text
        style={{
          ...type.body,
          color: palette.textMuted,
          textAlign: "center",
          marginTop: 8,
          maxWidth: 280,
        }}
      >
        Create your first project on web and it'll appear here instantly.
      </Text>
    </Surface>
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
