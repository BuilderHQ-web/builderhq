/**
 * /(main)/projects/[slug] → Project detail screen.
 *
 * Tap any project card on the dashboard → this screen. Role-aware:
 *   · owner             — full detail + docs + tenders + conversations
 *   · unlocked_builder  — full detail + docs + my tender (next pass)
 *   · preview           — locked marketplace preview (next pass)
 *
 * Today we ship the owner mode end-to-end. Other modes 404 from the
 * server until they land — the screen renders the standard ErrorView
 * for that path, which keeps the surface stable.
 *
 * UX rituals on this screen:
 *   · Sticky transparent-to-solid header bar — back button + edit
 *     action + title fade-in on scroll past the hero.
 *   · Reanimated parallax: the hero title scales down slightly + the
 *     header bar fills in as the user scrolls. Tiny effect, native
 *     feel.
 *   · Pull-to-refresh, haptic on release.
 *   · Card sections fade in with a stagger on first paint.
 *   · Document rows + tender rows + conversation rows are tappable
 *     and ready to deep-link as their detail screens come online.
 *   · Empty states are dedicated for each section (no docs, no
 *     tenders, no conversations).
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
  Building,
  Calendar,
  ChevronRight,
  DollarSign,
  FileText,
  Home as HomeIcon,
  Inbox,
  Layers,
  MapPin,
  MessageSquare,
  Pencil,
  Wrench,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { haptics } from "@/lib/haptics";
import { useProjectDetail } from "@/lib/dashboard";
import { env } from "@/lib/env";
import { DashboardSkeleton } from "@/components/dashboard/skeleton";
import { ErrorView } from "@/components/dashboard/error-view";
import type {
  OwnerProjectDetailPayload,
  ProjectConversationRow,
  ProjectDocumentRow,
  ProjectTenderRow,
} from "@/components/dashboard/types";

// ── Mapping tables ───────────────────────────────────────────────────

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
const BUDGET_LABEL: Record<string, string> = {
  under_500k: "Under $500k",
  "500k_1m": "$500k – $1M",
  "1m_1_5m": "$1M – $1.5M",
  "1_5m_2m": "$1.5M – $2M",
  "2m_3m": "$2M – $3M",
  "3m_5m": "$3M – $5M",
  over_5m: "Over $5M",
};
const LAND_LABEL: Record<string, string> = {
  under_200: "Under 200 m²",
  "200_400": "200 – 400 m²",
  "400_600": "400 – 600 m²",
  "600_800": "600 – 800 m²",
  "800_1000": "800 – 1000 m²",
  over_1000: "1000 m²+",
};
const BUILD_LABEL: Record<string, string> = {
  under_100: "Under 100 m²",
  "100_150": "100 – 150 m²",
  "150_200": "150 – 200 m²",
  "200_250": "200 – 250 m²",
  "250_300": "250 – 300 m²",
  "300_400": "300 – 400 m²",
  over_400: "400 m²+",
};
const RENO_LABEL: Record<string, string> = {
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  kitchen_and_bathroom: "Kitchen + bathroom",
  full_internal: "Full internal",
  full_internal_and_external: "Internal + external",
  structural: "Structural",
};
const EXT_TYPE_LABEL: Record<string, string> = {
  ground_floor: "Ground floor",
  first_floor: "First floor",
  ground_and_first: "Ground + first",
  rear: "Rear",
  side: "Side",
};
const EXT_SIZE_LABEL: Record<string, string> = {
  under_20: "Under 20 m²",
  "20_40": "20 – 40 m²",
  "40_60": "40 – 60 m²",
  "60_80": "60 – 80 m²",
  "80_100": "80 – 100 m²",
  over_100: "100 m²+",
};
const AGE_LABEL: Record<string, string> = {
  under_10: "Under 10 yrs",
  "10_25": "10 – 25 yrs",
  "25_50": "25 – 50 yrs",
  "50_75": "50 – 75 yrs",
  over_75: "Over 75 yrs",
};

function typeIcon(type: string, size = 16) {
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAud(n: number): string {
  return `$${n.toLocaleString("en-AU")}`;
}

function relativeTime(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (diff < 60) return "just now";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

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

  // Sticky header that fades from transparent to solid as you scroll
  // past the hero (~120px of scroll triggers the full fill).
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

  // Owner project editing lives on the web wizard for now. Tapping
  // the edit affordance opens the project's edit URL in the OS
  // browser; native edit lands later.
  const onEdit = useCallback(() => {
    if (!data) return;
    void haptics.tap();
    const url = `${env.apiBaseUrl}/owner/projects/${data.project.slug}/edit`;
    void Linking.openURL(url);
  }, [data]);

  // ── Boot frame ──
  if (isLoading && !data) {
    return (
      <Screen variant="flat">
        <TopBar onBack={onBack} />
        <DashboardSkeleton />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen variant="flat">
        <TopBar onBack={onBack} />
        <ErrorView message={error} onRetry={refetch} />
      </Screen>
    );
  }
  if (!data) return null;

  // Today we only handle owner mode. The endpoint 404s other paths.
  const p = data.project;
  const status = STATUS_TONE[p.status] ?? STATUS_TONE.archived!;
  const statusLabel = STATUS_LABEL[p.status] ?? p.status;
  const typeLabel = TYPE_LABEL[p.type] ?? p.type;
  const location = [p.suburb, p.state, p.postcode].filter(Boolean).join(" ");

  return (
    <Screen variant="flat">
      {/* Sticky animated top bar */}
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

      {/* Top bar — back + edit. The animated title overlay is rendered
            here (vs inside TopBar) so the animated-style binding stays
            local and we don't have to thread the ReturnType through
            TS-flaky prop typings. */}
      <View style={{ zIndex: 10 }}>
        <TopBar onBack={onBack} onEdit={onEdit} />
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
            {p.title}
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
        {/* Hero */}
        <Animated.View entering={FadeInUp.delay(40).duration(420).springify()}>
          <View className="flex-row items-center gap-2">
            {typeIcon(p.type, 14)}
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
            {p.title}
          </Text>
        </Animated.View>

        {location ? (
          <Animated.View
            entering={FadeInUp.delay(160).duration(420).springify()}
          >
            <View className="flex-row items-center gap-1.5 mt-3">
              <MapPin size={13} color="#98b8d0" strokeWidth={1.6} />
              <Text className="text-text-muted text-[13.5px]" numberOfLines={1}>
                {location}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Stat strip */}
        <Animated.View
          entering={FadeInUp.delay(220).duration(440).springify()}
          className="mt-7"
        >
          <View className="flex-row gap-3">
            <StatTile
              label="Builders"
              value={`${data.stats.unlockCount}/3`}
              tone={data.stats.unlockCount > 0 ? "accent" : "neutral"}
            />
            <StatTile
              label="Tenders"
              value={data.stats.tenderCount}
              tone={data.stats.tenderCount > 0 ? "accent" : "neutral"}
            />
            <StatTile
              label="Unread"
              value={data.stats.unreadMessages}
              tone={data.stats.unreadMessages > 0 ? "accent" : "neutral"}
            />
          </View>
        </Animated.View>

        {/* The build */}
        <Animated.View
          entering={FadeInUp.delay(280).duration(440).springify()}
          className="mt-8"
        >
          <SectionCard
            kicker="The build"
            icon={typeIcon(p.type, 14)}
            title={typeLabel}
          >
            <KvGrid>
              {p.type === "multi_dwelling" && p.dwellingCount != null ? (
                <Kv label="Dwellings" value={p.dwellingCount} />
              ) : null}
              {p.bedrooms != null ? <Kv label="Bedrooms" value={p.bedrooms} /> : null}
              {p.bathrooms != null ? (
                <Kv label="Bathrooms" value={p.bathrooms} />
              ) : null}
              {p.type !== "multi_dwelling" && p.floors != null ? (
                <Kv label="Floors" value={p.floors} />
              ) : null}
              {p.landSizeBand ? (
                <Kv label="Land size" value={LAND_LABEL[p.landSizeBand] ?? p.landSizeBand} />
              ) : null}
              {p.buildSizeBand ? (
                <Kv label="Build size" value={BUILD_LABEL[p.buildSizeBand] ?? p.buildSizeBand} />
              ) : null}
              {p.type === "renovation" && p.renovationScope ? (
                <Kv label="Scope" value={RENO_LABEL[p.renovationScope] ?? p.renovationScope} />
              ) : null}
              {p.type === "renovation" && p.existingAgeBand ? (
                <Kv label="Existing age" value={AGE_LABEL[p.existingAgeBand] ?? p.existingAgeBand} />
              ) : null}
              {p.type === "extension" && p.extensionType ? (
                <Kv label="Type" value={EXT_TYPE_LABEL[p.extensionType] ?? p.extensionType} />
              ) : null}
              {p.type === "extension" && p.extensionSizeBand ? (
                <Kv label="Size" value={EXT_SIZE_LABEL[p.extensionSizeBand] ?? p.extensionSizeBand} />
              ) : null}
            </KvGrid>
          </SectionCard>
        </Animated.View>

        {/* Budget & timeline */}
        <Animated.View
          entering={FadeInUp.delay(340).duration(440).springify()}
          className="mt-4"
        >
          <SectionCard
            kicker="Budget & timeline"
            icon={<DollarSign size={14} color="#7ef5ed" strokeWidth={1.6} />}
          >
            <KvGrid>
              {p.budgetBand ? (
                <Kv label="Budget" value={BUDGET_LABEL[p.budgetBand] ?? p.budgetBand} />
              ) : (
                <Kv label="Budget" value="—" />
              )}
              <Kv label="Target start" value={p.targetStartMonth ?? "—"} />
              <Kv label="Target completion" value={p.targetCompletionMonth ?? "—"} />
            </KvGrid>
          </SectionCard>
        </Animated.View>

        {/* Brief */}
        {p.description ? (
          <Animated.View
            entering={FadeInUp.delay(400).duration(440).springify()}
            className="mt-4"
          >
            <SectionCard
              kicker="Brief"
              icon={<FileText size={14} color="#7ef5ed" strokeWidth={1.6} />}
            >
              <Text className="text-text-muted text-[13.5px] leading-[20px]">
                {p.description}
              </Text>
            </SectionCard>
          </Animated.View>
        ) : null}

        {/* Address */}
        <Animated.View
          entering={FadeInUp.delay(460).duration(440).springify()}
          className="mt-4"
        >
          <SectionCard
            kicker="Address"
            icon={<MapPin size={14} color="#7ef5ed" strokeWidth={1.6} />}
          >
            <Text className="text-text text-[14px] leading-[20px]">
              {p.addressLine1 ?? "—"}
              {p.addressLine1 ? "\n" : ""}
              {[p.suburb, p.state, p.postcode].filter(Boolean).join(" ")}
            </Text>
          </SectionCard>
        </Animated.View>

        {/* Documents */}
        <Animated.View
          entering={FadeInUp.delay(520).duration(440).springify()}
          className="mt-4"
        >
          <SectionCard
            kicker="Documents"
            icon={<FileText size={14} color="#7ef5ed" strokeWidth={1.6} />}
            title={`${data.documents.length} attached`}
          >
            {data.documents.length === 0 ? (
              <Text className="text-text-faint text-[13px]">No documents.</Text>
            ) : (
              <View className="gap-2 mt-1">
                {data.documents.slice(0, 6).map((d) => (
                  <DocumentRow key={d.id} doc={d} />
                ))}
                {data.documents.length > 6 ? (
                  <Text className="text-text-dim text-[11.5px] mt-1">
                    …and {data.documents.length - 6} more
                  </Text>
                ) : null}
              </View>
            )}
          </SectionCard>
        </Animated.View>

        {/* Tenders */}
        <Animated.View
          entering={FadeInUp.delay(580).duration(440).springify()}
          className="mt-4"
        >
          <SectionCard
            kicker="Tenders"
            icon={<FileText size={14} color="#7ef5ed" strokeWidth={1.6} />}
            title={
              data.tenders.length === 0
                ? "None received yet"
                : `${data.tenders.length} received`
            }
          >
            {data.tenders.length === 0 ? (
              <Text className="text-text-faint text-[13px] leading-[19px]">
                Builders who unlock this project can submit tenders. They&apos;ll
                appear side-by-side here for comparison.
              </Text>
            ) : (
              <View className="gap-2 mt-1">
                {data.tenders.map((t) => (
                  <TenderRow key={t.id} tender={t} />
                ))}
              </View>
            )}
          </SectionCard>
        </Animated.View>

        {/* Conversations */}
        <Animated.View
          entering={FadeInUp.delay(640).duration(440).springify()}
          className="mt-4"
        >
          <SectionCard
            kicker="Messaging"
            icon={<MessageSquare size={14} color="#7ef5ed" strokeWidth={1.6} />}
            title={
              data.conversations.length === 0
                ? "Conversations appear on unlock"
                : `${data.conversations.length} active`
            }
          >
            {data.conversations.length === 0 ? (
              <View className="flex-row items-start gap-2 mt-1">
                <Inbox size={14} color="#567080" strokeWidth={1.6} />
                <Text className="text-text-faint text-[12.5px] leading-[18px] flex-1">
                  Each builder who unlocks the project gets their own thread here.
                </Text>
              </View>
            ) : (
              <View className="gap-1 mt-1">
                {data.conversations.map((c) => (
                  <ConversationRow key={c.id} conv={c} />
                ))}
              </View>
            )}
          </SectionCard>
        </Animated.View>

        {/* Lifecycle */}
        <Animated.View
          entering={FadeInUp.delay(700).duration(440).springify()}
          className="mt-4"
        >
          <SectionCard
            kicker="Lifecycle"
            icon={<Calendar size={14} color="#7ef5ed" strokeWidth={1.6} />}
          >
            <KvGrid>
              <Kv
                label="Published"
                value={
                  p.publishedAtIso
                    ? new Date(p.publishedAtIso).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"
                }
              />
              <Kv
                label="Created"
                value={new Date(p.createdAtIso).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              />
            </KvGrid>
          </SectionCard>
        </Animated.View>
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

// ── Composables ──────────────────────────────────────────────────────

function SectionCard({
  kicker,
  icon,
  title,
  children,
}: {
  kicker: string;
  icon: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-xl border border-border bg-surface-1/40 p-4">
      <View className="flex-row items-center gap-2">
        <View
          className="size-7 rounded-md border border-border-subtle items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.018)" }}
        >
          {icon}
        </View>
        <View>
          <Text className="text-accent text-[9.5px] tracking-[0.22em] uppercase font-ui font-medium">
            {kicker}
          </Text>
          {title ? (
            <Text className="text-text font-ui font-semibold text-[13.5px] mt-0.5">
              {title}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="mt-3">{children}</View>
    </View>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "neutral" | "accent";
}) {
  const accent = tone === "accent";
  return (
    <View
      className="flex-1 rounded-xl border bg-surface-1/40 px-4 py-3.5"
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
        className="font-display text-[28px] leading-[1.0] mt-1.5 tracking-[-0.005em]"
        style={{ color: accent ? "#7ef5ed" : "#eef6ff" }}
      >
        {value}
      </Text>
    </View>
  );
}

function KvGrid({ children }: { children: React.ReactNode }) {
  return <View className="flex-row flex-wrap -mr-4">{children}</View>;
}

function Kv({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null || value === undefined || value === "" ? "—" : value;
  return (
    <View className="w-1/2 pr-4 mb-3">
      <Text className="text-text-faint text-[9px] tracking-[0.16em] uppercase font-ui">
        {label}
      </Text>
      <Text className="text-text font-ui font-medium text-[13.5px] mt-1">
        {display}
      </Text>
    </View>
  );
}

function DocumentRow({ doc }: { doc: ProjectDocumentRow }) {
  return (
    <Pressable
      onPress={() => void haptics.tap()}
      className="flex-row items-center gap-3 py-2.5 rounded-md active:bg-surface-1/40"
    >
      <View
        className="size-9 rounded-md border border-border-subtle items-center justify-center"
        style={{ backgroundColor: "rgba(0, 212, 200, 0.05)" }}
      >
        <FileText size={14} color="#7ef5ed" strokeWidth={1.6} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-text text-[13px] font-ui" numberOfLines={1}>
          {doc.filename}
        </Text>
        <Text className="text-text-faint text-[10.5px] mt-0.5">
          {doc.category.replace(/_/g, " ")} · v{doc.version} · {formatBytes(doc.sizeBytes)}
        </Text>
      </View>
      <ChevronRight size={14} color="#567080" strokeWidth={1.7} />
    </Pressable>
  );
}

function TenderRow({ tender }: { tender: ProjectTenderRow }) {
  const status = STATUS_TONE[tender.status] ?? STATUS_TONE.archived!;
  return (
    <Pressable
      onPress={() => void haptics.tap()}
      className="flex-row items-center gap-3 py-2.5 rounded-md active:bg-surface-1/40"
    >
      <View className="flex-1 min-w-0">
        <Text
          className="text-text text-[13.5px] font-ui font-semibold"
          numberOfLines={1}
        >
          {tender.builder.displayName}
        </Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          <Text className="text-text-faint text-[11px]">
            {tender.totalPriceAud != null ? formatAud(tender.totalPriceAud) : "—"}
          </Text>
          {tender.durationWeeks != null ? (
            <>
              <Text className="text-text-dim text-[11px]">·</Text>
              <Text className="text-text-faint text-[11px]">
                {tender.durationWeeks} wks
              </Text>
            </>
          ) : null}
          {tender.submittedAt ? (
            <>
              <Text className="text-text-dim text-[11px]">·</Text>
              <Text className="text-text-faint text-[11px]">
                {relativeTime(tender.submittedAt)}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <View
        className="px-2 h-6 rounded-full justify-center border"
        style={{ backgroundColor: status.bg, borderColor: status.ring }}
      >
        <Text
          className="text-[9.5px] tracking-[0.16em] uppercase font-ui font-semibold"
          style={{ color: status.text }}
        >
          {STATUS_LABEL[tender.status] ?? tender.status}
        </Text>
      </View>
    </Pressable>
  );
}

function ConversationRow({ conv }: { conv: ProjectConversationRow }) {
  const unread = conv.unreadCount > 0;
  return (
    <Pressable
      onPress={() => void haptics.tap()}
      className="flex-row items-start gap-3 py-2.5 rounded-md active:bg-surface-1/40"
    >
      <View
        className="size-9 rounded-full items-center justify-center border"
        style={{
          backgroundColor: unread
            ? "rgba(0, 212, 200, 0.10)"
            : "rgba(100, 180, 255, 0.05)",
          borderColor: unread
            ? "rgba(0, 212, 200, 0.30)"
            : "rgba(100, 180, 255, 0.10)",
        }}
      >
        <MessageSquare
          size={14}
          color={unread ? "#7ef5ed" : "#98b8d0"}
          strokeWidth={1.6}
        />
      </View>
      <View className="flex-1 min-w-0">
        <Text
          className="text-text text-[13px] font-ui"
          numberOfLines={1}
          style={{ fontWeight: unread ? "600" : "500" }}
        >
          {conv.builderName}
        </Text>
        {conv.lastMessagePreview ? (
          <Text
            className="text-text-faint text-[11.5px] mt-0.5"
            numberOfLines={1}
          >
            {conv.lastMessagePreview}
          </Text>
        ) : null}
      </View>
      {unread ? (
        <View className="px-1.5 h-5 min-w-[20px] rounded-full bg-accent items-center justify-center">
          <Text className="text-accent-contrast text-[10px] font-ui font-semibold tabular-nums">
            {conv.unreadCount}
          </Text>
        </View>
      ) : (
        <ChevronRight size={14} color="#567080" strokeWidth={1.7} />
      )}
    </Pressable>
  );
}
