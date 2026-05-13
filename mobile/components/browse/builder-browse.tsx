/**
 * <BuilderBrowse /> — the marketplace browse screen for builders.
 *
 * Composition:
 *   1. Sticky header — title + saved count + filter glyph (with badge
 *      when filters are active).
 *   2. Persistent search field (TextInput, debounced through the hook).
 *   3. Horizontal scroll of "active filter chips" with clear taps.
 *   4. FlashList of project cards. Infinite scroll appends pages of
 *      12 as the user nears the bottom (~3 rows from end).
 *   5. Bottom sheet for advanced filters (Gorhom).
 *
 * Native UX rituals:
 *   · SafeArea-aware (top inset on the header, bottom inset from the
 *     parent (main) layout).
 *   · Pull-to-refresh with teal tint.
 *   · Light haptic on chip taps, success haptic on save.
 *   · Skeleton placeholders mirror the final card shape during first
 *     load.
 *   · Empty states are dedicated per cause (no matches, no service
 *     areas, server error).
 *
 * FlashList is preferred over FlatList for the marketplace because
 * marketplace lists tend to be long-tail; FlashList recycles cell
 * heights and stays smooth past ~100 rows on cheaper Android.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import Animated, { FadeInUp } from "react-native-reanimated";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  Bookmark,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { useBrowse } from "@/lib/browse";
import { haptics } from "@/lib/haptics";
import type {
  BrowseFilters,
  BrowseListItem,
} from "@/components/dashboard/types";
import { FilterSheet } from "./filter-sheet";
import { BrowseProjectCard } from "./project-card";
import { SkeletonBlock } from "@/components/dashboard/skeleton";

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

export function BuilderBrowse() {
  const browse = useBrowse();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const openFilters = useCallback(() => {
    void haptics.tap();
    Keyboard.dismiss();
    sheetRef.current?.present();
  }, []);

  // Build the active-chips array. Each chip carries its own remove
  // handler so the ChipStrip stays dumb (just renders + calls back).
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
      <View className="px-6 pb-3">
        <BrowseProjectCard
          item={item}
          isSaved={browse.savedIds.has(item.id)}
          onToggleSave={() => browse.toggleSave(item.slug, item.id)}
        />
      </View>
    ),
    [browse.savedIds, browse.toggleSave],
  );

  // Footer — load-more indicator or "end of list" hint.
  const renderFooter = useCallback(() => {
    if (browse.isLoadingMore) {
      return (
        <View className="py-6 items-center">
          <ActivityIndicator color="#7ef5ed" />
        </View>
      );
    }
    if (!browse.hasMore && browse.items.length > 0) {
      return (
        <View className="py-8 items-center">
          <Text className="text-text-dim text-[11px] tracking-[0.16em] uppercase font-ui">
            You&rsquo;re all caught up
          </Text>
        </View>
      );
    }
    return <View className="h-6" />;
  }, [browse.isLoadingMore, browse.hasMore, browse.items.length]);

  return (
    <Screen variant="flat">
      {/* Header */}
      <Header
        savedCount={browse.mySavedCount}
        filterCount={browse.activeFilterCount}
        onOpenFilters={openFilters}
      />

      {/* Search + chips strip — lives inside the list as a sticky-ish
            ListHeader so it stays visually attached but scrolls with
            the content. */}
      <FlashList
        data={browse.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="px-6 pb-3 pt-1">
            <SearchField
              value={browse.queryDraft}
              onChange={browse.setQueryDraft}
              focused={searchFocused}
              onFocusChange={setSearchFocused}
              onClear={() => browse.setQueryDraft("")}
            />
            <ChipStrip
              chips={activeChips}
              onTapChip={(c) => {
                void haptics.tap();
                c.onRemove();
              }}
              onAddFilter={openFilters}
            />
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
            tintColor="#7ef5ed"
            colors={["#7ef5ed"]}
            progressBackgroundColor="#0c1726"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      <FilterSheet
        ref={sheetRef}
        filters={browse.filters}
        patchFilters={browse.patchFilters}
        resetFilters={browse.resetFilters}
      />
    </Screen>
  );
}

// ── Header ──────────────────────────────────────────────────────────

function Header({
  savedCount,
  filterCount,
  onOpenFilters,
}: {
  savedCount: number;
  filterCount: number;
  onOpenFilters: () => void;
}) {
  return (
    <View
      className="px-6 pt-3 pb-2 border-b"
      style={{ borderColor: "rgba(100, 180, 255, 0.06)" }}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium">
            Marketplace
          </Text>
          <Text className="text-text font-display tracking-[-0.018em] text-[28px] leading-[1.0] mt-0.5">
            Browse
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {savedCount > 0 ? (
            <View className="flex-row items-center gap-1.5 h-9 px-3 rounded-full border border-border-subtle bg-surface-1/40">
              <Bookmark size={12} color="#ff7a8a" fill="#ff7a8a" strokeWidth={0} />
              <Text className="text-text-muted text-[11.5px] font-ui font-medium tabular-nums">
                {savedCount}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={onOpenFilters}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            hitSlop={8}
            className="size-9 items-center justify-center rounded-full border border-border-subtle bg-surface-1/40 active:bg-surface-1/70"
          >
            <SlidersHorizontal size={15} color="#eef6ff" strokeWidth={1.7} />
            {filterCount > 0 ? (
              <View
                className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full items-center justify-center"
                style={{ backgroundColor: "#00d4c8" }}
              >
                <Text
                  className="text-[9.5px] font-ui font-semibold tabular-nums"
                  style={{ color: "#031118" }}
                >
                  {filterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Search field ────────────────────────────────────────────────────

function SearchField({
  value,
  onChange,
  focused,
  onFocusChange,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  focused: boolean;
  onFocusChange: (v: boolean) => void;
  onClear: () => void;
}) {
  return (
    <View
      className="flex-row items-center gap-2 h-11 px-3.5 rounded-xl border"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderColor: focused
          ? "rgba(0, 212, 200, 0.40)"
          : "rgba(100, 180, 255, 0.12)",
      }}
    >
      <Search size={15} color={focused ? "#7ef5ed" : "#98b8d0"} strokeWidth={1.7} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        placeholder="Search projects"
        placeholderTextColor="rgba(238, 246, 255, 0.42)"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        className="flex-1 text-text font-ui text-[14px]"
        style={{ paddingVertical: 0 }}
      />
      {value.length > 0 ? (
        <Pressable onPress={onClear} hitSlop={10} accessibilityLabel="Clear search">
          <X size={14} color="#98b8d0" strokeWidth={1.8} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Active filter chip strip ────────────────────────────────────────

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

function ChipStrip({
  chips,
  onTapChip,
  onAddFilter,
}: {
  chips: Chip[];
  onTapChip: (c: Chip) => void;
  onAddFilter: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      className="flex-row flex-wrap gap-2 mt-3"
    >
      {chips.map((c) => (
        <Pressable
          key={c.key}
          onPress={() => onTapChip(c)}
          className="flex-row items-center gap-1.5 h-8 px-3 rounded-full border active:opacity-70"
          style={{
            backgroundColor: "rgba(0, 212, 200, 0.10)",
            borderColor: "rgba(0, 212, 200, 0.30)",
          }}
        >
          <Text
            className="text-[11.5px] font-ui font-medium"
            style={{ color: "#7ef5ed" }}
          >
            {c.label}
          </Text>
          <X size={11} color="#7ef5ed" strokeWidth={2.2} />
        </Pressable>
      ))}
      <Pressable
        onPress={onAddFilter}
        accessibilityLabel="Add more filters"
        hitSlop={4}
        className="flex-row items-center gap-1 h-8 px-3 rounded-full border border-border-subtle active:bg-surface-1/40"
      >
        <SlidersHorizontal size={11} color="#98b8d0" strokeWidth={1.8} />
        <Text className="text-text-muted text-[11.5px] font-ui">More</Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Skeleton + empty state ──────────────────────────────────────────

function BrowseSkeleton() {
  return (
    <View className="px-6 pt-3 gap-3">
      <SkeletonBlock className="h-44" />
      <SkeletonBlock className="h-44" />
      <SkeletonBlock className="h-44" />
    </View>
  );
}

function BrowseEmpty({ browse }: { browse: ReturnType<typeof useBrowse> }) {
  if (browse.error) {
    return (
      <EmptyState
        icon={<Sparkles size={20} color="#7ef5ed" strokeWidth={1.6} />}
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
        icon={<Sparkles size={20} color="#7ef5ed" strokeWidth={1.6} />}
        title="Set your service areas"
        copy="Add the suburbs you work in to see matching projects. Or clear the 'In my area' filter to browse everything."
        ctaLabel="Clear filter"
        onCta={() => browse.patchFilters({ inMyArea: false })}
      />
    );
  }
  if (browse.activeFilterCount > 0 || browse.filters.q) {
    return (
      <EmptyState
        icon={<Sparkles size={20} color="#7ef5ed" strokeWidth={1.6} />}
        title="No matches"
        copy="Nothing matches your filters yet. Loosen up — clear a chip or two."
        ctaLabel="Clear filters"
        onCta={() => browse.resetFilters()}
      />
    );
  }
  return (
    <EmptyState
      icon={<Sparkles size={20} color="#7ef5ed" strokeWidth={1.6} />}
      title="Quiet for now"
      copy="No new projects on the marketplace. We'll surface them here as soon as they're live."
    />
  );
}

function EmptyState({
  icon,
  title,
  copy,
  ctaLabel,
  onCta,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View className="px-8 py-16 items-center">
      <View
        className="size-14 rounded-full border border-border-accent items-center justify-center"
        style={{ backgroundColor: "rgba(0, 212, 200, 0.06)" }}
      >
        {icon}
      </View>
      <Text className="text-text font-display text-[28px] tracking-[-0.012em] uppercase mt-5">
        {title}
      </Text>
      <Text className="text-text-muted text-[13.5px] leading-[20px] text-center mt-3 max-w-[280px]">
        {copy}
      </Text>
      {ctaLabel && onCta ? (
        <Pressable
          onPress={() => {
            void haptics.tap();
            onCta();
          }}
          className="mt-6 h-11 px-6 rounded-md bg-accent active:bg-accent-active items-center justify-center"
        >
          <Text className="text-accent-contrast font-ui font-semibold text-[13.5px] tracking-[0.02em]">
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
