/**
 * <OwnerHome /> — v4 premium owner dashboard.
 *
 * Composition top-to-bottom:
 *
 *   1. ScreenHeader — collapsible "Home" title with bell trailing
 *   2. Hero block — kicker (greeting) + plain display title + Instrument
 *      Serif italic accent ("Your projects.")
 *   3. HeroNumberCard — the day's most-actionable metric front and
 *      centre (tenders to review · projects live · or onboarding CTA)
 *   4. StatRow — three quiet stat tiles (Active / Drafts / Unread)
 *   5. Projects section — Surface-wrapped Row list with status pills
 *   6. Activity section — recent timeline rows
 *
 * v4 design choices in this screen:
 *   · One canvas, no gradients. All surfaces are solid #0E131F.
 *   · Hero NUMBER is the focal point — Revolut/Robinhood pattern.
 *   · Instrument Serif italic on ONE word per screen. Here: "projects."
 *   · Press feedback uses haptics throughout; rows soft-tap, CTAs select.
 *   · No floating glass header — iOS large-title-on-scroll pattern.
 *
 * Data shape unchanged from the legacy version — this is a pure UI
 * rewrite. `useOwnerDashboard()` returns the same OwnerDashboardPayload.
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
import type { ActivityItem, OwnerProjectListItem } from "./types";

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
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.split(/\s+/)[0] ?? name;
}

function suburbLine(p: OwnerProjectListItem): string {
  const parts = [p.suburb, p.state, p.postcode].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : TYPE_LABEL[p.type] ?? p.type;
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

export function OwnerHome() {
  const { user, signOut } = useAuth();
  const { data, isLoading, error, refetch } = useOwnerDashboard();
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
  const projects = data.projects;
  const activity = data.activity;

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
            <AvatarV4 name={user?.name ?? "BuilderHQ"} size={36} />
          </Press>
        }
      />

      {/* Hero — kicker + plain display + Instrument Serif italic accent.
          The accent word ties this screen to the landing's voice. */}
      <Animated.View entering={FadeInDown.duration(420).delay(40)}>
        <Hero
          kicker={`${greeting.toUpperCase()}, ${fName.toUpperCase()}`}
          title="Your"
          accent="projects."
          sub={projectsSub(stats.activeProjects, stats.totalTenders)}
        />
      </Animated.View>

      {/* Hero number — the day's main thing. Tenders if any, else
          a smart fallback. */}
      <Animated.View
        entering={FadeInDown.duration(440).delay(160)}
        style={{ marginTop: 28 }}
      >
        <HeroNumberCard
          tenderCount={stats.totalTenders}
          activeProjects={stats.activeProjects}
          draftProjects={stats.draftProjects}
          onPressTenders={() => {
            const target = projects.find(
              (p) => p.stats.tenderCount > 0,
            );
            if (target) {
              void haptics.select();
              router.push(`/(main)/projects/${target.slug}`);
            }
          }}
          onPressCreate={() => {
            void haptics.select();
            // No native create flow yet — push to web.
            router.push("/(main)/browse");
          }}
        />
      </Animated.View>

      {/* Stat row */}
      <Animated.View
        entering={FadeInDown.duration(440).delay(260)}
        style={{ marginTop: 16, flexDirection: "row", gap: 10 }}
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
        entering={FadeInDown.duration(440).delay(360)}
        style={{ marginTop: 40 }}
      >
        <SectionHeader
          title="Your projects"
          meta={`${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
        />
        {projects.length === 0 ? (
          <EmptyProjects />
        ) : (
          <Surface padding={0} style={{ marginTop: 14, gap: 0 }}>
            {projects.map((p, i) => (
              <View key={p.id}>
                <Press
                  onPress={() => router.push(`/(main)/projects/${p.slug}`)}
                  haptic="soft"
                  scaleTo={0.99}
                >
                  <ProjectRow project={p} />
                </Press>
                {i < projects.length - 1 ? <RowDivider /> : null}
              </View>
            ))}
          </Surface>
        )}
      </Animated.View>

      {/* Activity */}
      {activity.length > 0 ? (
        <Animated.View
          entering={FadeInDown.duration(440).delay(460)}
          style={{ marginTop: 40 }}
        >
          <SectionHeader title="Recent activity" />
          <Surface padding={0} style={{ marginTop: 14 }}>
            {activity.slice(0, 6).map((a, i) => (
              <View key={a.id}>
                <ActivityRow item={a} />
                {i < Math.min(activity.length, 6) - 1 ? (
                  <RowDivider />
                ) : null}
              </View>
            ))}
          </Surface>
        </Animated.View>
      ) : null}

      {/* Sign out — quiet, at the very bottom. Temporary until the
          profile tab lands proper. */}
      <Animated.View
        entering={FadeInDown.duration(440).delay(560)}
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

// ── Sub-components used only inside this screen ─────────────────────────

function projectsSub(active: number, tenders: number): string {
  if (active === 0) return "Let's start your first build.";
  if (tenders === 0) {
    return `${active} project${active === 1 ? "" : "s"} live · waiting on tenders.`;
  }
  return `${active} project${active === 1 ? "" : "s"} live · ${tenders} tender${tenders === 1 ? "" : "s"} in.`;
}

/**
 * The day's most-actionable surface. Picks the right hero based on
 * the user's current state:
 *   · tenderCount > 0    → big number with "Review tenders" CTA
 *   · activeProjects > 0 → "Your projects are live, waiting on tenders"
 *   · else (onboarding)  → "Start your first build" CTA
 */
function HeroNumberCard({
  tenderCount,
  activeProjects,
  draftProjects,
  onPressTenders,
  onPressCreate,
}: {
  tenderCount: number;
  activeProjects: number;
  draftProjects: number;
  onPressTenders: () => void;
  onPressCreate: () => void;
}) {
  if (tenderCount > 0) {
    return (
      <Surface variant="accent" padding={28} hairline>
        <Text style={{ ...type.kicker, color: palette.accent, fontWeight: "600" }}>
          Tenders to review
        </Text>
        <View
          style={{
            marginTop: 14,
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
      <Surface padding={28} hairline>
        <Text style={{ ...type.kicker, color: palette.accent, fontWeight: "600" }}>
          Your projects are live
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
          Waiting on builders to tender.
        </Text>
        <Text
          style={{ ...type.body, color: palette.textMuted, marginTop: 12 }}
        >
          Median first response is 24 hours.
        </Text>
      </Surface>
    );
  }

  // Onboarding empty state.
  return (
    <Surface variant="accent" padding={28} hairline>
      <Text style={{ ...type.kicker, color: palette.accent, fontWeight: "600" }}>
        Welcome to BuilderHQ
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
        {draftProjects > 0 ? "Publish your draft." : "Start your first build."}
      </Text>
      <Text
        style={{ ...type.body, color: palette.textMuted, marginTop: 12 }}
      >
        {draftProjects > 0
          ? `You have ${draftProjects} draft${draftProjects === 1 ? "" : "s"} ready to go live.`
          : "Upload your plans and we'll match verified builders within days."}
      </Text>
      <Press
        onPress={onPressCreate}
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

function ProjectRow({ project }: { project: OwnerProjectListItem }) {
  const tone = STATUS_TONE[project.status] ?? "neutral";
  const statusLabel = STATUS_LABEL[project.status] ?? project.status;
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;

  return (
    <View style={{ paddingHorizontal: 18, paddingVertical: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
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
            {typeLabel} · {suburbLine(project)}
          </Text>
        </View>
        <Pill tone={tone}>{statusLabel}</Pill>
      </View>

      {/* Inline stats row — only show non-zero values to keep this dense */}
      {(project.stats.tenderCount > 0 ||
        project.stats.unlockCount > 0 ||
        project.stats.unreadMessages > 0) && (
        <View
          style={{
            flexDirection: "row",
            gap: 18,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          {project.stats.tenderCount > 0 && (
            <StatInline
              icon={<Icon.Tender size={13} color={palette.accent} />}
              label={`${project.stats.tenderCount} ${project.stats.tenderCount === 1 ? "tender" : "tenders"}`}
            />
          )}
          {project.stats.unlockCount > 0 && (
            <StatInline
              icon={<Icon.Verified size={13} color={palette.textMuted} />}
              label={`${project.stats.unlockCount} unlock${project.stats.unlockCount === 1 ? "" : "s"}`}
            />
          )}
          {project.stats.unreadMessages > 0 && (
            <StatInline
              icon={<Icon.Message size={13} color={palette.accent} />}
              label={`${project.stats.unreadMessages} unread`}
              accent
            />
          )}
        </View>
      )}
    </View>
  );
}

function StatInline({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {icon}
      <Text
        style={{
          ...type.bodySmall,
          color: accent ? palette.accentLight : palette.textMuted,
          fontWeight: accent ? "600" : "500",
        }}
      >
        {label}
      </Text>
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
