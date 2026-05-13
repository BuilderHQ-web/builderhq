/**
 * /(main)/projects/[slug] → Project detail screen.
 *
 * Tap a project card anywhere in the app → this screen. The endpoint
 * (GET /api/mobile/projects/[slug]) returns a tagged-union payload
 * with three modes: `owner`, `unlocked_builder`, `preview`. This file
 * is the shared chrome — sticky animated top bar, scroll handling,
 * pull-to-refresh, mode dispatch — and the per-mode body components
 * live below.
 *
 * UX rituals shared across modes:
 *   · Sticky animated top bar (back + edit). Background and title
 *     fade in via interpolated scrollY (0–60px transparent → 60–140px
 *     crossfade → solid). Tiny effect, native feel.
 *   · Reanimated FadeInUp cascade on the body sections.
 *   · Pull-to-refresh with teal spinner + haptic burst on release.
 *   · Light haptic on every tap.
 *   · DashboardSkeleton on initial load, ErrorView on hard failure —
 *     never a centred spinner.
 */
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Inbox,
  Lock,
  MapPin,
  MessageSquare,
  Pencil,
  Sparkles,
  Zap,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { haptics } from "@/lib/haptics";
import { useProjectDetail, unlockProject } from "@/lib/dashboard";
import { env } from "@/lib/env";
import { DashboardSkeleton } from "@/components/dashboard/skeleton";
import { ErrorView } from "@/components/dashboard/error-view";
import type {
  OwnerProjectDetailPayload,
  PreviewProjectDetailPayload,
  ProjectDetailPayload,
  UnlockedBuilderDetailPayload,
} from "@/components/dashboard/types";
import {
  AGE_LABEL,
  BUDGET_LABEL,
  BUILD_LABEL,
  ConversationRow,
  DocumentRow,
  EXT_SIZE_LABEL,
  EXT_TYPE_LABEL,
  Kv,
  KvGrid,
  LAND_LABEL,
  MyTenderRow,
  OwnerTenderRow,
  RENO_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  SectionCard,
  StatTile,
  TYPE_LABEL,
  typeIcon,
} from "@/components/project-detail/shared";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ── Screen ───────────────────────────────────────────────────────────

export default function ProjectDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const slugStr = typeof slug === "string" ? slug : "";
  const { data, isLoading, error, refetch } = useProjectDetail(slugStr || null);
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60, 120], [0, 0.4, 1], "clamp"),
  }));
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [60, 140], [0, 1], "clamp"),
    transform: [
      {
        translateY: interpolate(scrollY.value, [60, 140], [4, 0], "clamp"),
      },
    ],
  }));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void haptics.tap();
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onBack = useCallback(() => {
    void haptics.tap();
    if (router.canGoBack()) router.back();
    else router.replace("/(main)");
  }, []);

  // Owner-only edit affordance — opens the web wizard. Native edit
  // screens land later.
  const onEdit = useCallback(() => {
    if (!data || data.mode !== "owner") return;
    void haptics.tap();
    const url = `${env.apiBaseUrl}/owner/projects/${data.project.slug}/edit`;
    void Linking.openURL(url);
  }, [data]);

  if (isLoading && !data) {
    return (
      <Screen variant="flat">
        <View style={{ zIndex: 10 }}>
          <TopBar onBack={onBack} />
        </View>
        <DashboardSkeleton />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen variant="flat">
        <View style={{ zIndex: 10 }}>
          <TopBar onBack={onBack} />
        </View>
        <ErrorView message={error} onRetry={refetch} />
      </Screen>
    );
  }
  if (!data) return null;

  return (
    <Screen variant="flat">
      {/* Sticky animated top bar background */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 5,
            backgroundColor: "#03090f",
            borderBottomColor: "rgba(100, 180, 255, 0.10)",
            borderBottomWidth: 1,
          },
          headerStyle,
        ]}
      >
        <SafeAreaView edges={["top"]}>
          <View className="h-12" />
        </SafeAreaView>
      </Animated.View>

      <View style={{ zIndex: 10 }}>
        <TopBar onBack={onBack} onEdit={data.mode === "owner" ? onEdit : undefined} />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 56,
              right: 56,
              top: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            },
            headerTitleStyle,
          ]}
        >
          <Text
            className="text-text font-ui font-semibold text-[14.5px]"
            numberOfLines={1}
          >
            {data.project.title}
          </Text>
        </Animated.View>
      </View>

      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 56,
        }}
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
        {/* Per-mode body */}
        {data.mode === "owner" ? (
          <OwnerBody data={data} />
        ) : data.mode === "preview" ? (
          <PreviewBody data={data} onRefetch={refetch} />
        ) : (
          <UnlockedBuilderBody data={data} />
        )}
      </AnimatedScrollView>
    </Screen>
  );
}

// ── Top bar ──────────────────────────────────────────────────────────

function TopBar({
  onBack,
  onEdit,
}: {
  onBack: () => void;
  onEdit?: () => void;
}) {
  return (
    <SafeAreaView edges={["top"]} style={{ position: "relative" }}>
      <View
        className="flex-row items-center justify-between px-2"
        style={{ height: 48 }}
      >
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          className="size-10 items-center justify-center rounded-full active:bg-surface-1/60"
        >
          <ArrowLeft size={20} color="#eef6ff" strokeWidth={1.8} />
        </Pressable>

        {onEdit ? (
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit on web"
            hitSlop={12}
            className="size-10 items-center justify-center rounded-full active:bg-surface-1/60"
          >
            <Pencil size={16} color="#eef6ff" strokeWidth={1.7} />
          </Pressable>
        ) : (
          <View className="size-10" />
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Shared hero ──────────────────────────────────────────────────────

function Hero({
  project,
  showsFullAddress,
}: {
  project: { title: string; type: string; status: string; suburb: string | null; state: string | null; postcode: string | null };
  showsFullAddress: boolean;
}) {
  const status = STATUS_TONE[project.status] ?? STATUS_TONE.archived!;
  const statusLabel = STATUS_LABEL[project.status] ?? project.status;
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;
  const location = showsFullAddress
    ? [project.suburb, project.state, project.postcode].filter(Boolean).join(" ")
    : [project.suburb, project.state].filter(Boolean).join(", ");

  return (
    <>
      <Animated.View entering={FadeInUp.delay(40).duration(420).springify()}>
        <View className="flex-row items-center gap-2">
          {typeIcon(project.type, 14)}
          <Text className="text-accent text-[10.5px] tracking-[0.22em] uppercase font-ui font-medium">
            {typeLabel}
          </Text>
          <Text className="text-text-dim text-[10.5px]">·</Text>
          <View
            className="px-2 h-6 rounded-full border justify-center"
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
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).duration(420).springify()}>
        <Text className="text-text font-display tracking-[-0.018em] text-[40px] leading-[0.95] mt-3">
          {project.title}
        </Text>
      </Animated.View>

      {location ? (
        <Animated.View entering={FadeInUp.delay(160).duration(420).springify()}>
          <View className="flex-row items-center gap-1.5 mt-3">
            <MapPin size={13} color="#98b8d0" strokeWidth={1.6} />
            <Text className="text-text-muted text-[13.5px]" numberOfLines={1}>
              {location}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </>
  );
}

// ── Shared "the build" / "budget" / "lifecycle" cards ───────────────

function BuildCard({ project }: { project: OwnerProjectDetailPayload["project"] | PreviewProjectDetailPayload["project"] | UnlockedBuilderDetailPayload["project"] }) {
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;
  return (
    <SectionCard kicker="The build" icon={typeIcon(project.type, 14)} title={typeLabel}>
      <KvGrid>
        {project.type === "multi_dwelling" && project.dwellingCount != null ? (
          <Kv label="Dwellings" value={project.dwellingCount} />
        ) : null}
        {project.bedrooms != null ? <Kv label="Bedrooms" value={project.bedrooms} /> : null}
        {project.bathrooms != null ? <Kv label="Bathrooms" value={project.bathrooms} /> : null}
        {project.type !== "multi_dwelling" && project.floors != null ? (
          <Kv label="Floors" value={project.floors} />
        ) : null}
        {project.landSizeBand ? (
          <Kv label="Land size" value={LAND_LABEL[project.landSizeBand] ?? project.landSizeBand} />
        ) : null}
        {project.buildSizeBand ? (
          <Kv label="Build size" value={BUILD_LABEL[project.buildSizeBand] ?? project.buildSizeBand} />
        ) : null}
        {project.type === "renovation" && project.renovationScope ? (
          <Kv label="Scope" value={RENO_LABEL[project.renovationScope] ?? project.renovationScope} />
        ) : null}
        {project.type === "renovation" && project.existingAgeBand ? (
          <Kv label="Existing age" value={AGE_LABEL[project.existingAgeBand] ?? project.existingAgeBand} />
        ) : null}
        {project.type === "extension" && project.extensionType ? (
          <Kv label="Type" value={EXT_TYPE_LABEL[project.extensionType] ?? project.extensionType} />
        ) : null}
        {project.type === "extension" && project.extensionSizeBand ? (
          <Kv label="Size" value={EXT_SIZE_LABEL[project.extensionSizeBand] ?? project.extensionSizeBand} />
        ) : null}
      </KvGrid>
    </SectionCard>
  );
}

function BudgetCard({ project }: { project: { budgetBand: string | null; targetStartMonth: string | null; targetCompletionMonth: string | null } }) {
  return (
    <SectionCard kicker="Budget & timeline" icon={<DollarSign size={14} color="#7ef5ed" strokeWidth={1.6} />}>
      <KvGrid>
        <Kv label="Budget" value={project.budgetBand ? BUDGET_LABEL[project.budgetBand] ?? project.budgetBand : "—"} />
        <Kv label="Target start" value={project.targetStartMonth ?? "—"} />
        <Kv label="Target completion" value={project.targetCompletionMonth ?? "—"} />
      </KvGrid>
    </SectionCard>
  );
}

// ── Owner body ───────────────────────────────────────────────────────

function OwnerBody({ data }: { data: OwnerProjectDetailPayload }) {
  const p = data.project;
  return (
    <>
      <Hero project={p} showsFullAddress />

      <Animated.View entering={FadeInUp.delay(220).duration(440).springify()} className="mt-7">
        <View className="flex-row gap-3">
          <StatTile label="Builders" value={`${data.stats.unlockCount}/3`} tone={data.stats.unlockCount > 0 ? "accent" : "neutral"} />
          <StatTile label="Tenders" value={data.stats.tenderCount} tone={data.stats.tenderCount > 0 ? "accent" : "neutral"} />
          <StatTile label="Unread" value={data.stats.unreadMessages} tone={data.stats.unreadMessages > 0 ? "accent" : "neutral"} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(280).duration(440).springify()} className="mt-8">
        <BuildCard project={p} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(340).duration(440).springify()} className="mt-4">
        <BudgetCard project={p} />
      </Animated.View>

      {p.description ? (
        <Animated.View entering={FadeInUp.delay(400).duration(440).springify()} className="mt-4">
          <SectionCard kicker="Brief" icon={<FileText size={14} color="#7ef5ed" strokeWidth={1.6} />}>
            <Text className="text-text-muted text-[13.5px] leading-[20px]">{p.description}</Text>
          </SectionCard>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInUp.delay(460).duration(440).springify()} className="mt-4">
        <SectionCard kicker="Address" icon={<MapPin size={14} color="#7ef5ed" strokeWidth={1.6} />}>
          <Text className="text-text text-[14px] leading-[20px]">
            {p.addressLine1 ?? "—"}
            {p.addressLine1 ? "\n" : ""}
            {[p.suburb, p.state, p.postcode].filter(Boolean).join(" ")}
          </Text>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(520).duration(440).springify()} className="mt-4">
        <SectionCard kicker="Documents" icon={<FileText size={14} color="#7ef5ed" strokeWidth={1.6} />} title={`${data.documents.length} attached`}>
          {data.documents.length === 0 ? (
            <Text className="text-text-faint text-[13px]">No documents.</Text>
          ) : (
            <View className="gap-2 mt-1">
              {data.documents.slice(0, 6).map((d) => <DocumentRow key={d.id} doc={d} />)}
              {data.documents.length > 6 ? (
                <Text className="text-text-dim text-[11.5px] mt-1">…and {data.documents.length - 6} more</Text>
              ) : null}
            </View>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(580).duration(440).springify()} className="mt-4">
        <SectionCard kicker="Tenders" icon={<FileText size={14} color="#7ef5ed" strokeWidth={1.6} />} title={data.tenders.length === 0 ? "None received yet" : `${data.tenders.length} received`}>
          {data.tenders.length === 0 ? (
            <Text className="text-text-faint text-[13px] leading-[19px]">
              Builders who unlock this project can submit tenders. They&apos;ll appear side-by-side here.
            </Text>
          ) : (
            <View className="gap-2 mt-1">
              {data.tenders.map((t) => <OwnerTenderRow key={t.id} tender={t} />)}
            </View>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(640).duration(440).springify()} className="mt-4">
        <SectionCard kicker="Messaging" icon={<MessageSquare size={14} color="#7ef5ed" strokeWidth={1.6} />} title={data.conversations.length === 0 ? "Conversations appear on unlock" : `${data.conversations.length} active`}>
          {data.conversations.length === 0 ? (
            <View className="flex-row items-start gap-2 mt-1">
              <Inbox size={14} color="#567080" strokeWidth={1.6} />
              <Text className="text-text-faint text-[12.5px] leading-[18px] flex-1">
                Each builder who unlocks the project gets their own thread here.
              </Text>
            </View>
          ) : (
            <View className="gap-1 mt-1">
              {data.conversations.map((c) => <ConversationRow key={c.id} conv={c} />)}
            </View>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(700).duration(440).springify()} className="mt-4">
        <SectionCard kicker="Lifecycle" icon={<Calendar size={14} color="#7ef5ed" strokeWidth={1.6} />}>
          <KvGrid>
            <Kv label="Published" value={p.publishedAtIso ? new Date(p.publishedAtIso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
            <Kv label="Created" value={new Date(p.createdAtIso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />
          </KvGrid>
        </SectionCard>
      </Animated.View>
    </>
  );
}

// ── Preview body (builder, not unlocked) ─────────────────────────────

function PreviewBody({ data, onRefetch }: { data: PreviewProjectDetailPayload; onRefetch: () => Promise<void> }) {
  const p = data.project;
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = useCallback(async () => {
    if (unlocking) return;
    if (!data.unlock.canUnlock) return;

    // Paid path needs Stripe — out of scope for this endpoint. Surface
    // a clear "head to web" prompt for now; native payments land later.
    if (data.unlock.pricing.kind === "paid") {
      void haptics.warning();
      const url = `${env.apiBaseUrl}/builder/projects/${p.slug}`;
      Alert.alert(
        "Pay to unlock",
        `This project costs $${data.unlock.pricing.priceAud} to unlock. Continue on web?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open web", onPress: () => void Linking.openURL(url) },
        ],
      );
      return;
    }

    setUnlocking(true);
    void haptics.impact();
    const r = await unlockProject(p.slug);
    if (r.ok) {
      void haptics.success();
      // Refetch — same URL now returns mode="unlocked_builder".
      await onRefetch();
    } else {
      void haptics.error();
      Alert.alert("Couldn't unlock", r.error.message);
    }
    setUnlocking(false);
  }, [data, p.slug, unlocking, onRefetch]);

  const ctaCopy =
    data.unlock.pricing.kind === "free"
      ? `Unlock for free · ${data.unlock.pricing.remainingThisCycle} left this cycle`
      : data.unlock.pricing.kind === "paid"
        ? `Unlock for $${data.unlock.pricing.priceAud}`
        : "Unavailable";
  const ctaSub =
    data.unlock.pricing.kind === "free"
      ? "Founding Builder Access covers this project."
      : data.unlock.pricing.kind === "paid"
        ? "Charged once. Permanent access."
        : data.unlock.pricing.reason === "full"
          ? "All 3 builder slots are taken."
          : "Reach out to info@builderhq.com.au.";

  return (
    <>
      <Hero project={p} showsFullAddress={false} />

      {/* Unlock CTA — the action this whole screen exists for */}
      <Animated.View entering={FadeInUp.delay(220).duration(440).springify()} className="mt-7">
        <View
          className="rounded-2xl border px-4 py-5"
          style={{
            backgroundColor: data.unlock.canUnlock
              ? "rgba(0, 212, 200, 0.08)"
              : "rgba(255, 122, 138, 0.06)",
            borderColor: data.unlock.canUnlock
              ? "rgba(0, 212, 200, 0.35)"
              : "rgba(255, 122, 138, 0.20)",
          }}
        >
          <View className="flex-row items-center gap-2">
            {data.unlock.canUnlock ? (
              <Zap size={14} color="#7ef5ed" strokeWidth={1.6} />
            ) : (
              <Lock size={14} color="#ff7a8a" strokeWidth={1.6} />
            )}
            <Text
              className="text-[10.5px] tracking-[0.22em] uppercase font-ui font-medium"
              style={{ color: data.unlock.canUnlock ? "#7ef5ed" : "#ff7a8a" }}
            >
              {data.unlock.canUnlock ? "Available" : "Locked"}
            </Text>
            <Text className="text-text-dim text-[10.5px]">·</Text>
            <Text className="text-text-faint text-[10.5px] tracking-[0.16em] uppercase font-ui">
              {data.unlock.slotsRemaining} of {data.unlock.unlockCap} slots
            </Text>
          </View>
          <Text className="text-text font-display text-[22px] leading-[1.1] tracking-[-0.005em] mt-2">
            {ctaCopy}
          </Text>
          <Text className="text-text-muted text-[12.5px] leading-[18px] mt-1.5">
            {ctaSub}
          </Text>

          <Pressable
            onPress={handleUnlock}
            disabled={!data.unlock.canUnlock || unlocking}
            accessibilityRole="button"
            className="mt-4 h-12 rounded-md items-center justify-center"
            style={{
              backgroundColor: data.unlock.canUnlock ? "#00d4c8" : "rgba(255,255,255,0.06)",
              opacity: unlocking ? 0.6 : 1,
            }}
          >
            <Text
              className="font-ui font-semibold text-[14px] tracking-[0.02em]"
              style={{
                color: data.unlock.canUnlock ? "#031118" : "#567080",
              }}
            >
              {unlocking
                ? "Unlocking…"
                : data.unlock.canUnlock
                  ? data.unlock.pricing.kind === "free"
                    ? "Unlock with Founding Access"
                    : data.unlock.pricing.kind === "paid"
                      ? "Unlock on web"
                      : "Unavailable"
                  : "Unavailable"}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(280).duration(440).springify()} className="mt-8">
        <BuildCard project={p} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(340).duration(440).springify()} className="mt-4">
        <BudgetCard project={p} />
      </Animated.View>

      {p.description ? (
        <Animated.View entering={FadeInUp.delay(400).duration(440).springify()} className="mt-4">
          <SectionCard kicker="Brief" icon={<FileText size={14} color="#7ef5ed" strokeWidth={1.6} />}>
            <Text className="text-text-muted text-[13.5px] leading-[20px]">{p.description}</Text>
          </SectionCard>
        </Animated.View>
      ) : null}

      {/* Locked address card — suburb only */}
      <Animated.View entering={FadeInUp.delay(460).duration(440).springify()} className="mt-4">
        <SectionCard kicker="Location" icon={<MapPin size={14} color="#7ef5ed" strokeWidth={1.6} />}>
          <View className="flex-row items-center gap-2">
            <Lock size={13} color="#567080" strokeWidth={1.6} />
            <Text className="text-text-muted text-[13px] leading-[19px]">
              {[p.suburb, p.state, p.postcode].filter(Boolean).join(" ") || "—"} · Exact address unlocks with access
            </Text>
          </View>
        </SectionCard>
      </Animated.View>

      {/* Document count, locked */}
      <Animated.View entering={FadeInUp.delay(520).duration(440).springify()} className="mt-4">
        <SectionCard kicker="Documents" icon={<FileText size={14} color="#7ef5ed" strokeWidth={1.6} />} title={`${data.documentCount} attached`}>
          <View className="flex-row items-center gap-2">
            <Lock size={13} color="#567080" strokeWidth={1.6} />
            <Text className="text-text-faint text-[12.5px] leading-[18px] flex-1">
              {data.documentCount === 0
                ? "The owner hasn't attached any documents yet."
                : "Architectural drawings, planning permit, and supporting docs are visible once you unlock."}
            </Text>
          </View>
        </SectionCard>
      </Animated.View>
    </>
  );
}

// ── Unlocked builder body ────────────────────────────────────────────

function UnlockedBuilderBody({ data }: { data: UnlockedBuilderDetailPayload }) {
  const p = data.project;
  return (
    <>
      <Hero project={p} showsFullAddress />

      {/* Your tender / Submit-tender CTA */}
      <Animated.View entering={FadeInUp.delay(220).duration(440).springify()} className="mt-7">
        {data.myTender ? (
          <MyTenderRow tender={data.myTender} />
        ) : (
          <View
            className="rounded-2xl border px-4 py-5"
            style={{
              backgroundColor: "rgba(0, 212, 200, 0.08)",
              borderColor: "rgba(0, 212, 200, 0.30)",
            }}
          >
            <View className="flex-row items-center gap-2">
              <Sparkles size={14} color="#7ef5ed" strokeWidth={1.6} />
              <Text className="text-accent text-[10.5px] tracking-[0.22em] uppercase font-ui font-medium">
                Next step
              </Text>
            </View>
            <Text className="text-text font-display text-[22px] leading-[1.1] tracking-[-0.005em] mt-2">
              Submit your tender
            </Text>
            <Text className="text-text-muted text-[12.5px] leading-[18px] mt-1.5">
              Owners decide side-by-side. Complete tenders win more often.
            </Text>
            <Pressable
              onPress={() => {
                void haptics.tap();
                void Linking.openURL(`${env.apiBaseUrl}/builder/projects/${p.slug}/tender`);
              }}
              className="mt-4 h-12 rounded-md items-center justify-center bg-accent"
            >
              <Text className="font-ui font-semibold text-[14px] tracking-[0.02em] text-accent-contrast">
                Open tender on web
              </Text>
            </Pressable>
          </View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(280).duration(440).springify()} className="mt-8">
        <BuildCard project={p} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(340).duration(440).springify()} className="mt-4">
        <BudgetCard project={p} />
      </Animated.View>

      {p.description ? (
        <Animated.View entering={FadeInUp.delay(400).duration(440).springify()} className="mt-4">
          <SectionCard kicker="Brief" icon={<FileText size={14} color="#7ef5ed" strokeWidth={1.6} />}>
            <Text className="text-text-muted text-[13.5px] leading-[20px]">{p.description}</Text>
          </SectionCard>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInUp.delay(460).duration(440).springify()} className="mt-4">
        <SectionCard kicker="Address" icon={<MapPin size={14} color="#7ef5ed" strokeWidth={1.6} />}>
          <Text className="text-text text-[14px] leading-[20px]">
            {p.addressLine1 ?? "—"}
            {p.addressLine1 ? "\n" : ""}
            {[p.suburb, p.state, p.postcode].filter(Boolean).join(" ")}
          </Text>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(520).duration(440).springify()} className="mt-4">
        <SectionCard kicker="Documents" icon={<FileText size={14} color="#7ef5ed" strokeWidth={1.6} />} title={`${data.documents.length} attached`}>
          {data.documents.length === 0 ? (
            <Text className="text-text-faint text-[13px]">No documents.</Text>
          ) : (
            <View className="gap-2 mt-1">
              {data.documents.slice(0, 8).map((d) => <DocumentRow key={d.id} doc={d} />)}
              {data.documents.length > 8 ? (
                <Text className="text-text-dim text-[11.5px] mt-1">…and {data.documents.length - 8} more</Text>
              ) : null}
            </View>
          )}
        </SectionCard>
      </Animated.View>
    </>
  );
}
