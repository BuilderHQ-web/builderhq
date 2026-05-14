/**
 * <TradePickerSheet /> — bottom sheet that lets a builder pick a
 * trade for a new cost-breakdown line. 29 options across 7 logical
 * groups; the list is searchable so finding the right one is one
 * keystroke.
 *
 * The trade catalogue is duplicated lightly here vs importing the
 * full src/modules/tenders/trades.ts (which is server-pruned). When
 * the catalogue changes, edit BOTH places — they're intentionally
 * in lockstep but mobile bundles can't see server-only imports.
 */
import { forwardRef, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Check, Search, X } from "lucide-react-native";

import { haptics } from "@/lib/haptics";

export interface TradeOption {
  id: string;
  label: string;
  hint?: string;
}

export const TRADES: TradeOption[] = [
  { id: "preliminaries", label: "Preliminaries", hint: "Site setup, fencing, scaffold." },
  { id: "demolition", label: "Demolition" },
  { id: "ground_works", label: "Ground works", hint: "Excavation, levelling, compaction." },
  { id: "concrete_work", label: "Concrete work", hint: "Slab, footings, retaining walls." },
  { id: "precast_concrete", label: "Precast concrete" },
  { id: "brickwork_and_blockwork", label: "Brickwork & blockwork" },
  { id: "stonework", label: "Stonework" },
  { id: "structural_steelwork", label: "Structural steelwork" },
  { id: "metalwork", label: "Metalwork", hint: "Balustrades, handrails, gates." },
  { id: "carpentry", label: "Carpentry", hint: "Frames, trusses, flooring." },
  { id: "joinery", label: "Joinery", hint: "Cabinetry, built-ins, custom timber." },
  { id: "windows_and_curtain_wall", label: "Windows & curtain wall" },
  { id: "doors", label: "Doors" },
  { id: "roofing", label: "Roofing", hint: "Tiles or metal, gutters, downpipes." },
  { id: "partitions_and_ceilings", label: "Partitions & ceilings" },
  { id: "tiling", label: "Tiling", hint: "Bathroom, kitchen, laundry, alfresco." },
  { id: "internal_finishes", label: "Internal finishes", hint: "Skirting, architraves, trim." },
  { id: "external_finishes", label: "External finishes", hint: "Render, cladding, paint." },
  { id: "glazing", label: "Glazing" },
  { id: "painting", label: "Painting" },
  { id: "special_provisions", label: "Special provisions", hint: "Contingency or PC sums." },
  { id: "fixtures_and_fittings", label: "Fixtures & fittings", hint: "Tapware, sanitary, hardware." },
  { id: "hydraulic_services", label: "Hydraulic services", hint: "Plumbing, drainage, hot water." },
  { id: "mechanical_services", label: "Mechanical services", hint: "HVAC, ventilation." },
  { id: "electrical_services", label: "Electrical services", hint: "Power, lighting, data." },
  { id: "fire_protection_services", label: "Fire protection services" },
  { id: "external_works", label: "External works", hint: "Driveway, paths, fencing, landscaping." },
  { id: "other", label: "Other", hint: "Custom line — name it yourself." },
];

interface Props {
  onPick: (trade: TradeOption) => void;
  /** Trades already in the breakdown — shown dimmed so the builder
   *  can see what's covered without scrolling to the bottom. */
  alreadyUsed?: string[];
}

export const TradePickerSheet = forwardRef<BottomSheetModal, Props>(
  function TradePickerSheet({ onPick, alreadyUsed = [] }, ref) {
    const snapPoints = useMemo(() => ["80%"], []);
    const [query, setQuery] = useState("");

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

    const usedSet = useMemo(() => new Set(alreadyUsed), [alreadyUsed]);

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return TRADES;
      return TRADES.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.hint?.toLowerCase().includes(q),
      );
    }, [query]);

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
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={{ flex: 1 }}>
          <View className="px-6 pt-2 pb-3">
            <Text className="text-accent text-[10.5px] tracking-[0.22em] uppercase font-ui font-medium">
              Cost breakdown
            </Text>
            <Text className="text-text font-display text-[24px] tracking-[-0.012em] uppercase mt-0.5">
              Pick a trade
            </Text>
          </View>

          {/* Search */}
          <View className="px-6 pb-3">
            <View
              className="flex-row items-center gap-2 h-11 px-3.5 rounded-xl border"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                borderColor: "rgba(100, 180, 255, 0.12)",
              }}
            >
              <Search size={14} color="#98b8d0" strokeWidth={1.7} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search trades"
                placeholderTextColor="rgba(238, 246, 255, 0.42)"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                className="flex-1 text-text font-ui text-[14px]"
                style={{ paddingVertical: 0 }}
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={10}>
                  <X size={14} color="#98b8d0" strokeWidth={1.8} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <View className="px-6 py-10 items-center">
                <Text className="text-text-faint text-[13px]">
                  No trades match &ldquo;{query}&rdquo;.
                </Text>
              </View>
            ) : (
              filtered.map((t) => {
                const used = usedSet.has(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      void haptics.tap();
                      onPick(t);
                    }}
                    className="px-3 py-3 rounded-lg flex-row items-start gap-3 active:bg-surface-1/40"
                  >
                    <View
                      className="size-9 rounded-md border border-border-subtle items-center justify-center mt-0.5"
                      style={{
                        backgroundColor: used
                          ? "rgba(0, 212, 200, 0.10)"
                          : "rgba(255, 255, 255, 0.02)",
                      }}
                    >
                      {used ? (
                        <Check size={14} color="#7ef5ed" strokeWidth={2.2} />
                      ) : (
                        <Text className="text-text-faint text-[14px] font-ui font-semibold">
                          {t.label[0]}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text
                        className="font-ui text-[14.5px]"
                        style={{
                          color: used ? "#7ef5ed" : "#eef6ff",
                          fontWeight: used ? "600" : "500",
                        }}
                      >
                        {t.label}
                      </Text>
                      {t.hint ? (
                        <Text className="text-text-faint text-[11.5px] leading-[16px] mt-0.5">
                          {t.hint}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
