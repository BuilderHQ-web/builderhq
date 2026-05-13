/**
 * <FilterSheet /> — the advanced-filters bottom sheet.
 *
 * Triggered by the filter glyph in the browse header. Renders inside
 * Gorhom's BottomSheetModal so we get the right gesture-driven snap
 * physics + backdrop dim out of the box.
 *
 * Filter design: every control is single-tap with no apply step.
 * Changes flow into the parent's filter state immediately; the list
 * re-fetches reactively. The footer carries a "Clear all" affordance
 * and a "Done" close. Closing the sheet doesn't commit anything new —
 * everything was already live.
 *
 * Why single-tap-no-apply: faceted search feels best when you can
 * watch the result count change as you toggle a chip. Bouncing back
 * out to a "Done" button is the SaaS pattern; we want the editorial
 * feel.
 */
import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Check, X } from "lucide-react-native";

import { haptics } from "@/lib/haptics";
import type { BrowseFilters } from "@/components/dashboard/types";

const TYPE_OPTIONS: Array<{
  value: NonNullable<BrowseFilters["type"]>;
  label: string;
}> = [
  { value: "single_dwelling", label: "Single dwelling" },
  { value: "multi_dwelling", label: "Multi-dwelling" },
  { value: "renovation", label: "Renovation" },
  { value: "extension", label: "Extension" },
];

const BUDGET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "under_500k", label: "Under $500k" },
  { value: "500k_1m", label: "$500k – $1M" },
  { value: "1m_1_5m", label: "$1M – $1.5M" },
  { value: "1_5m_2m", label: "$1.5M – $2M" },
  { value: "2m_3m", label: "$2M – $3M" },
  { value: "3m_5m", label: "$3M – $5M" },
  { value: "over_5m", label: "Over $5M" },
];

const STATE_OPTIONS = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export interface FilterSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  filters: BrowseFilters;
  patchFilters: (patch: Partial<BrowseFilters>) => void;
  resetFilters: () => void;
}

export const FilterSheet = forwardRef<BottomSheetModal, Props>(
  function FilterSheet({ filters, patchFilters, resetFilters }, ref) {
    const snapPoints = useMemo(() => ["75%", "92%"], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.6}
        />
      ),
      [],
    );

    const toggleBudget = useCallback(
      (value: string) => {
        void haptics.select();
        const set = new Set(filters.budgets ?? []);
        if (set.has(value)) set.delete(value);
        else set.add(value);
        patchFilters({
          budgets: set.size === 0 ? undefined : Array.from(set),
        });
      },
      [filters.budgets, patchFilters],
    );

    const setType = useCallback(
      (value: NonNullable<BrowseFilters["type"]> | null) => {
        void haptics.select();
        patchFilters({ type: value ?? undefined });
      },
      [patchFilters],
    );

    const setState = useCallback(
      (value: string | null) => {
        void haptics.select();
        patchFilters({ state: value ?? undefined });
      },
      [patchFilters],
    );

    const toggleInMyArea = useCallback(() => {
      void haptics.select();
      patchFilters({ inMyArea: !filters.inMyArea });
    }, [filters.inMyArea, patchFilters]);

    const toggleExcludeFull = useCallback(() => {
      void haptics.select();
      patchFilters({ excludeFull: !filters.excludeFull });
    }, [filters.excludeFull, patchFilters]);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{
          backgroundColor: "rgba(255, 255, 255, 0.20)",
          width: 36,
        }}
        backgroundStyle={{
          backgroundColor: "#0c1726",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
            <Text className="text-text font-display text-[24px] tracking-[-0.012em] uppercase">
              Filters
            </Text>
            <Pressable
              onPress={() => {
                void haptics.tap();
                resetFilters();
              }}
              hitSlop={8}
              className="h-9 px-3 rounded-md border border-border-subtle items-center justify-center active:bg-surface-1/60"
            >
              <Text className="text-text-muted text-[12px] font-ui">
                Clear all
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Quick toggles */}
            <Group label="Quick">
              <View className="gap-2.5">
                <ToggleRow
                  label="In my service area"
                  sub="Only show projects you'd be matched to"
                  value={!!filters.inMyArea}
                  onChange={toggleInMyArea}
                />
                <ToggleRow
                  label="Hide full projects"
                  sub="Hide projects already at 3/3 builders"
                  value={!!filters.excludeFull}
                  onChange={toggleExcludeFull}
                />
              </View>
            </Group>

            {/* Type */}
            <Group label="Project type">
              <View className="flex-row flex-wrap gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <ChipOption
                    key={opt.value}
                    label={opt.label}
                    selected={filters.type === opt.value}
                    onPress={() =>
                      setType(filters.type === opt.value ? null : opt.value)
                    }
                  />
                ))}
              </View>
            </Group>

            {/* State */}
            <Group label="State">
              <View className="flex-row flex-wrap gap-2">
                {STATE_OPTIONS.map((s) => (
                  <ChipOption
                    key={s}
                    label={s}
                    selected={filters.state === s}
                    onPress={() => setState(filters.state === s ? null : s)}
                  />
                ))}
              </View>
            </Group>

            {/* Budget */}
            <Group label="Budget band">
              <View className="flex-row flex-wrap gap-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <ChipOption
                    key={opt.value}
                    label={opt.label}
                    selected={filters.budgets?.includes(opt.value) ?? false}
                    onPress={() => toggleBudget(opt.value)}
                  />
                ))}
              </View>
            </Group>
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

// ── Sub-components ───────────────────────────────────────────────────

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-6">
      <Text className="text-accent text-[10px] tracking-[0.22em] uppercase font-ui font-medium mb-3">
        {label}
      </Text>
      {children}
    </View>
  );
}

function ChipOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="h-9 px-3.5 rounded-full border flex-row items-center gap-1.5 active:opacity-80"
      style={{
        backgroundColor: selected
          ? "rgba(0, 212, 200, 0.12)"
          : "rgba(255, 255, 255, 0.02)",
        borderColor: selected
          ? "rgba(0, 212, 200, 0.45)"
          : "rgba(100, 180, 255, 0.12)",
      }}
    >
      {selected ? <Check size={11} color="#7ef5ed" strokeWidth={2.4} /> : null}
      <Text
        className="text-[12.5px] font-ui"
        style={{
          color: selected ? "#7ef5ed" : "#98b8d0",
          fontWeight: selected ? "600" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <Pressable
      onPress={onChange}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className="flex-row items-center gap-3 px-3.5 py-3 rounded-xl border active:opacity-80"
      style={{
        backgroundColor: value
          ? "rgba(0, 212, 200, 0.08)"
          : "rgba(255, 255, 255, 0.02)",
        borderColor: value
          ? "rgba(0, 212, 200, 0.30)"
          : "rgba(100, 180, 255, 0.10)",
      }}
    >
      <View className="flex-1 min-w-0">
        <Text
          className="font-ui font-semibold text-[14px]"
          style={{ color: value ? "#7ef5ed" : "#eef6ff" }}
        >
          {label}
        </Text>
        <Text className="text-text-faint text-[11.5px] leading-[16px] mt-0.5">
          {sub}
        </Text>
      </View>
      <Switch value={value} />
    </Pressable>
  );
}

function Switch({ value }: { value: boolean }) {
  return (
    <View
      className="w-[44px] h-[26px] rounded-full justify-center px-0.5"
      style={{
        backgroundColor: value ? "#00d4c8" : "rgba(255, 255, 255, 0.10)",
      }}
    >
      <View
        className="size-[22px] rounded-full bg-white"
        style={{
          alignSelf: value ? "flex-end" : "flex-start",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
        }}
      />
    </View>
  );
}

/** Helper export to import BottomSheetModal type without re-exporting
 *  everything from @gorhom/bottom-sheet across the app. */
export type { BottomSheetModal };
