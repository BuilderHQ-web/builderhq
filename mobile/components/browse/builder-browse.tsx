/**
 * <BuilderBrowse /> — the marketplace browse for builders.
 *
 * Composition (top to bottom):
 *   1. GlassHeader — title block + saved-count pill.
 *   2. Search bar (Revolut-style) + circular glass filter button.
 *   3. Horizontal scroll of active filter chips (tap to remove).
 *   4. FlashList of premium <BrowseProjectCard /> rows.
 *   5. Gorhom bottom sheet for the full filter editor.
 *
 * Content scrolls under the GlassHeader (which floats over the top).
 * Pull-to-refresh + infinite scroll + skeleton on first load.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import Animated, {
  FadeInUp,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { SlidersHorizontal, X } from "lucide-react-native";

import {
  AvatarV4,
  GlassTopBar,
  Press,
  ScreenV4,
  useTopBarHeight,
} from "@/components/ui/v4";
import { RadarPulse } from "@/components/ui/radar-pulse";
import { SearchBar, FilterButton } from "@/components/ui/search-bar";
import { useAuth } from "@/lib/auth";
import { useBrowse } from "@/lib/browse";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme";
import type {
  BrowseFilters,
  BrowseListItem,
} from "@/components/dashboard/types";
import { FilterSheet } from "./filter-sheet";
import { BrowseProjectCard } from "./project-card";

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

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function BuilderBrowse() {
  const browse = useBrowse();
  const { user } = useAuth();
  const sheetRef = useRef<BottomSheetModal>(null);
  const headerHeight = useTopBarHeight();

  // Scroll-aware glass top bar — hidden at scroll 0, fades in as
  // the user scrolls. Matches the Home tab's chrome behaviour.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const openFilters = useCallback(() => {
    void haptics.tap();
    Keyboard.dismiss();
    sheetRef.current?.present();
  }, []);

  const activeChips = useMemo<Chip[]>(() => {
    const chips: Chip[] = [];
    if (browse.filters.inMyArea) {
      chips.push({
        key: "inMyArea",
        label: "In my area",
        onRemove: () => browse.patchFilters({ inMyArea: false }),
      });
    }
    if (browse.filters.excludeFull) {
      chips.push({
        key: "excludeFull",
        label: "Hide full",
        onRemove: () => browse.patchFilters({ excludeFull: false }),
      });
    }
    if (browse.filters.type) {
      chips.push({
        key: `type:${browse.filters.type}`,
        label: TYPE_LABEL[browse.filters.type] ?? browse.filters.type,
        onRemove: () => browse.patchFilters({ type: undefined }),
      });
    }
    if (browse.filters.state) {
      chips.push({
        key: `state:${browse.filters.state}`,
        label: browse.filters.state,
        onRemove: () => browse.patchFilters({ state: undefined }),
      });
    }
    for (const b of browse.filters.budgets ?? []) {
      chips.push({
        key: `budget:${b}`,
        label: BUDGET_LABEL[b] ?? b,
        onRemove: () => {
          const next = (browse.filters.budgets ?? []).filter((x) => x !== b);
          browse.patchFilters({
            budgets: next.length === 0 ? undefined : next,
          });
        },
      });
    }
    return chips;
  }, [browse.filters, browse.patchFilters]);

  const renderItem: ListRenderItem<BrowseListItem> = useCallback(
    ({ item }) => (
      <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
        <BrowseProjectCard
          item={item}
          isSaved={browse.savedIds.has(item.id)}
          onToggleSave={() => browse.toggleSave(item.slug, item.id)}
        />
      </View>
    ),
    [browse.savedIds, browse.toggleSave],
  );

  const renderFooter = useCallback(() => {
    if (browse.isLoadingMore) {
      return (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator color={colors.accentLight} />
        </View>
      );
    }
    if (!browse.hasMore && browse.items.length > 0) {
      return (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <Text
            style={{
              color: colors.textDim,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 10.5,
              letterSpacing: 1.8,
              textTransform: "uppercase",
            }}
          >
            You&rsquo;re all caught up
          </Text>
        </View>
      );
    }
    return <View style={{ height: 16 }} />;
  }, [browse.isLoadingMore, browse.hasMore, browse.items.length]);

  return (
    <ScreenV4 variant="flat" topBarHeight={headerHeight} topBarHidesAtTop>
      <GlassTopBar
        title="Projects"
        scrollY={scrollY}
        trailing={
          <Press
            onPress={() => router.push("/(main)/profile")}
            haptic="tap"
            accessibilityLabel="Open profile"
          >
            <AvatarV4 name={user?.name ?? "Builder"} size={32} />
          </Press>
        }
      />

      <FlashList
        data={browse.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View
            style={{
              // Content starts just under the status bar — the GlassTopBar
              // is hidden at scroll 0 and fades in as the user scrolls,
              // so there's no awkward empty gap up top.
              paddingTop: headerHeight - 36,
              paddingHorizontal: 14,
              paddingBottom: 12,
            }}
          >
            <SearchBar
              value={browse.queryDraft}
              onChange={browse.setQueryDraft}
              placeholder="Search projects"
              trailing={
                <FilterButton
                  onPress={openFilters}
                  accessibilityLabel="Open filters"
                  badge={browse.activeFilterCount}
                >
                  <SlidersHorizontal
                    size={15}
                    color={colors.text}
                    strokeWidth={1.7}
                  />
                </FilterButton>
              }
            />
            {activeChips.length > 0 ? (
              <Animated.View
                entering={FadeInUp.duration(200)}
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {activeChips.map((c) => (
                  <Pressable
                    key={c.key}
                    onPress={() => {
                      void haptics.tap();
                      c.onRemove();
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      height: 30,
                      paddingHorizontal: 11,
                      borderRadius: 15,
                      backgroundColor: "rgba(0, 212, 200, 0.10)",
                      borderWidth: 1,
                      borderColor: "rgba(0, 212, 200, 0.30)",
                    }}
                  >
                    <Text
                      style={{
                        color: colors.accentLight,
                        fontFamily: "SpaceGrotesk_500Medium",
                        fontSize: 11.5,
                        fontWeight: "600",
                      }}
                    >
                      {c.label}
                    </Text>
                    <X size={10} color={colors.accentLight} strokeWidth={2.2} />
                  </Pressable>
                ))}
              </Animated.View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          browse.isLoading ? <BrowseSkeleton /> : <BrowseEmpty browse={browse} />
        }
        ListFooterComponent={renderFooter}
        onEndReached={browse.loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={browse.isRefreshing}
            onRefresh={() => {
              void haptics.tap();
              void browse.refresh();
            }}
            tintColor={colors.accentLight}
            progressBackgroundColor={colors.bgRaised}
            progressViewOffset={headerHeight}
          />
        }
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // Wire scroll-Y into the GlassTopBar so the header fades in as
        // the user scrolls past the page top.
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      />

      <FilterSheet
        ref={sheetRef}
        filters={browse.filters}
        patchFilters={browse.patchFilters}
        resetFilters={browse.resetFilters}
      />
    </ScreenV4>
  );
}

// ── Skeleton + empty ────────────────────────────────────────────────

function BrowseSkeleton() {
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 8, gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            height: 220,
            borderRadius: 22,
            backgroundColor: "rgba(255, 255, 255, 0.035)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.07)",
            overflow: "hidden",
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "rgba(255, 255, 255, 0.10)",
            }}
          />
        </View>
      ))}
    </View>
  );
}

function BrowseEmpty({ browse }: { browse: ReturnType<typeof useBrowse> }) {
  if (browse.error) {
    return (
      <EmptyState
        title="Couldn't load"
        copy={browse.error}
        ctaLabel="Try again"
        onCta={() => void browse.refresh()}
      />
    );
  }
  if (browse.emptyReason === "no_service_areas") {
    return (
      <EmptyState
        title="Set service areas"
        copy="Add the suburbs you work in to see matching projects. Or clear the 'In my area' filter to browse everything."
        ctaLabel="Clear filter"
        onCta={() => browse.patchFilters({ inMyArea: false })}
      />
    );
  }
  if (browse.activeFilterCount > 0 || browse.filters.q) {
    return (
      <EmptyState
        title="No matches"
        copy="Nothing matches your filters yet. Loosen up — clear a chip or two."
        ctaLabel="Clear filters"
        onCta={() => browse.resetFilters()}
      />
    );
  }
  return (
    <EmptyState
      title="Quiet for now"
      copy="No new projects on the marketplace. We'll surface them here as soon as they're live."
    />
  );
}

function EmptyState({
  title,
  copy,
  ctaLabel,
  onCta,
}: {
  title: string;
  copy: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: 24,
        alignItems: "center",
      }}
    >
      <RadarPulse size={104} />
      <Text
        style={{
          color: colors.text,
          fontFamily: "BebasNeue_400Regular",
          fontSize: 28,
          letterSpacing: -0.3,
          marginTop: 20,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: "DMSans_400Regular",
          fontSize: 13,
          textAlign: "center",
          lineHeight: 19,
          marginTop: 8,
          maxWidth: 280,
        }}
      >
        {copy}
      </Text>
      {ctaLabel && onCta ? (
        <Pressable
          onPress={() => {
            void haptics.tap();
            onCta();
          }}
          style={{
            marginTop: 18,
            paddingHorizontal: 18,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 212, 200, 0.14)",
            borderWidth: 1,
            borderColor: "rgba(0, 212, 200, 0.40)",
          }}
        >
          <Text
            style={{
              color: colors.accentLight,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 13,
              fontWeight: "600",
              letterSpacing: 0.2,
            }}
          >
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
