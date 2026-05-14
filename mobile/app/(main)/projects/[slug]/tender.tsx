/**
 * /(main)/projects/[slug]/tender — the native tender composer.
 *
 * The most important builder action in the app: this is where a
 * builder commits their bid. Designed to feel premium, calm, and
 * absolutely clear about what's required vs what's polish.
 *
 * Layout (single scroll, no wizard):
 *
 *   ┌───────────────────────────────────────────────┐
 *   │ ‹ Back   Tender · Project title       ◜◞ 65% │  ← sticky top bar
 *   │                                  ╰────────╯  │     (back · title · completeness ring · submit)
 *   ├───────────────────────────────────────────────┤
 *   │ Required ─────────────────────────────────── │
 *   │   Total price                                │
 *   │   $ 482,500                                  │
 *   │   Duration weeks ┃ Validity days             │
 *   │   Proposed start (month picker)              │
 *   │                                              │
 *   │ Polish ───────────────────────────────────── │
 *   │   Cost breakdown                             │
 *   │     ↳ Trade · Amount cards · variance       │
 *   │   Pitch (textarea)                           │
 *   │   Conditions (textarea)                      │
 *   │   Exclusions (chip input)                    │
 *   │                                              │
 *   │ [Submit tender]                              │
 *   └───────────────────────────────────────────────┘
 *
 * Autosave: every patch dispatches 800ms after the last keystroke,
 * with a quiet "Saving…" / "Saved" indicator next to the title.
 *
 * Submit: confirmation alert → POST submit → success state replaces
 * the form inline (no nav). The success screen has a checkmark
 * animation, the submitted amount in display type, and CTAs back to
 * the project + back to browse.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle,
  Cloud,
  CloudOff,
  FileText,
  ListTree,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { haptics } from "@/lib/haptics";
import { useTenderDraft } from "@/components/tender/use-tender-draft";
import {
  ChipInput,
  ChipPicker,
  CompletenessRing,
  CurrencyInput,
  NumberStepper,
} from "@/components/tender/composables";
import {
  TradePickerSheet,
  TRADES,
  type TradeOption,
} from "@/components/tender/trade-picker";
import { ErrorView } from "@/components/dashboard/error-view";
import { DashboardSkeleton } from "@/components/dashboard/skeleton";

const VALIDITY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
] as const;

const EXCLUSION_SUGGESTIONS = [
  "GST",
  "Site works",
  "Pool",
  "Landscaping",
  "Soft furnishings",
  "Solar PV",
  "Driveway",
];

// Generate the next 12 months for the proposed-start picker. We
// expose YYYY-MM strings because the server validates that format.
function generateMonthOptions(count = 12) {
  const now = new Date();
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-AU", {
      month: "short",
      year: "numeric",
    });
    return { value, label };
  });
}

function tradeLabelOf(id: string): string {
  return TRADES.find((t) => t.id === id)?.label ?? id;
}

function formatAud(n: number): string {
  return `$${n.toLocaleString("en-AU")}`;
}

// ── Screen ───────────────────────────────────────────────────────────

export default function TenderComposerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const slugStr = typeof slug === "string" ? slug : "";
  const draft = useTenderDraft(slugStr);

  const monthOptions = useMemo(() => generateMonthOptions(12), []);
  const sheetRef = useRef<BottomSheetModal>(null);

  const onBack = useCallback(() => {
    void haptics.tap();
    if (router.canGoBack()) router.back();
    else router.replace(`/(main)/projects/${slugStr}` as never);
  }, [slugStr]);

  // ── Loading / error guards ──
  if (draft.isLoading && !draft.tender) {
    return (
      <Screen variant="flat">
        <TopBar onBack={onBack} />
        <DashboardSkeleton />
      </Screen>
    );
  }
  if (draft.loadError && !draft.tender) {
    return (
      <Screen variant="flat">
        <TopBar onBack={onBack} />
        <ErrorView message={draft.loadError} onRetry={() => router.replace(`/(main)/projects/${slugStr}/tender` as never)} />
      </Screen>
    );
  }
  if (!draft.tender) return null;

  // ── Already submitted? show the success view ──
  if (draft.tender.status !== "draft") {
    return (
      <SuccessState
        slug={slugStr}
        amount={draft.tender.totalPriceAud}
        submittedAt={draft.tender.submittedAt}
        onBack={onBack}
      />
    );
  }

  return (
    <Screen variant="flat">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <ComposerBody
          draft={draft}
          slug={slugStr}
          monthOptions={monthOptions}
          sheetRef={sheetRef}
          onBack={onBack}
        />
      </KeyboardAvoidingView>

      <TradePickerSheet
        ref={sheetRef}
        alreadyUsed={draft.tender.costLines.map((l) => l.trade)}
        onPick={async (trade) => {
          sheetRef.current?.dismiss();
          // Add a new line at the end with amount 0 — the user fills
          // amount inline. setCostLines is idempotent so we send the
          // entire new array.
          if (!draft.tender) return;
          const next = [
            ...draft.tender.costLines.map((l) => ({
              trade: l.trade,
              amountAud: l.amountAud,
              ...(l.label ? { label: l.label } : {}),
            })),
            {
              trade: trade.id,
              amountAud: 0,
              ...(trade.id === "other"
                ? { label: "Custom line" }
                : {}),
            },
          ];
          void haptics.tap();
          await draft.replaceCostLines(next);
        }}
      />
    </Screen>
  );
}

// ── Top bar ──────────────────────────────────────────────────────────

function TopBar({
  onBack,
  saveStatus,
  completenessPct,
  showRing,
}: {
  onBack: () => void;
  saveStatus?: "idle" | "saving" | "error";
  completenessPct?: number;
  showRing?: boolean;
}) {
  return (
    <SafeAreaView edges={["top"]} style={{ position: "relative" }}>
      <View
        className="flex-row items-center justify-between px-2"
        style={{ height: 52 }}
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

        <View className="absolute left-12 right-12 top-0 bottom-0 items-center justify-center">
          <Text className="text-text-faint text-[9.5px] tracking-[0.22em] uppercase font-ui font-medium">
            Tender
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <SaveBadge status={saveStatus ?? "idle"} />
          </View>
        </View>

        {showRing && completenessPct !== undefined ? (
          <View className="size-10 items-center justify-center">
            <CompletenessRing
              percent={completenessPct}
              showCheck={completenessPct === 100}
            />
          </View>
        ) : (
          <View className="size-10" />
        )}
      </View>
    </SafeAreaView>
  );
}

function SaveBadge({ status }: { status: "idle" | "saving" | "error" }) {
  if (status === "saving") {
    return (
      <View className="flex-row items-center gap-1">
        <Cloud size={10} color="#98b8d0" strokeWidth={1.7} />
        <Text className="text-text-muted text-[10px] font-ui">Saving…</Text>
      </View>
    );
  }
  if (status === "error") {
    return (
      <View className="flex-row items-center gap-1">
        <CloudOff size={10} color="#ff7a8a" strokeWidth={1.7} />
        <Text className="text-[10px] font-ui" style={{ color: "#ff7a8a" }}>
          Save failed
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-1">
      <Check size={10} color="#86efac" strokeWidth={2} />
      <Text className="text-[10px] font-ui" style={{ color: "#86efac" }}>
        Saved
      </Text>
    </View>
  );
}

// ── Composer body ────────────────────────────────────────────────────

interface ComposerBodyProps {
  draft: ReturnType<typeof useTenderDraft>;
  slug: string;
  monthOptions: Array<{ value: string; label: string }>;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onBack: () => void;
}

function ComposerBody({
  draft,
  slug,
  monthOptions,
  sheetRef,
  onBack,
}: ComposerBodyProps) {
  const t = draft.tender!;
  const saveStatus = draft.saveError
    ? "error"
    : draft.isSaving
      ? "saving"
      : "idle";

  // Local fast-path strings for the textareas — keeps typing snappy
  // while autosave debounces underneath.
  const [pitchLocal, setPitchLocal] = useState(t.pitch ?? "");
  const [conditionsLocal, setConditionsLocal] = useState(t.conditions ?? "");

  const onSubmit = useCallback(() => {
    if (!draft.canSubmit) {
      void haptics.warning();
      Alert.alert(
        "Almost there",
        "Add a total price, duration, and validity before submitting.",
      );
      return;
    }
    void haptics.impact();
    Alert.alert(
      "Submit tender?",
      "Once submitted, the owner can review your tender. You can still update it via the web until they decide.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          style: "default",
          onPress: async () => {
            const result = await draft.submit();
            if (result.ok) {
              void haptics.success();
            } else {
              void haptics.error();
              Alert.alert("Couldn't submit", result.message ?? "Try again.");
            }
          },
        },
      ],
    );
  }, [draft]);

  return (
    <View style={{ flex: 1 }}>
      <TopBar
        onBack={onBack}
        saveStatus={saveStatus}
        completenessPct={draft.completenessPct}
        showRing
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Hero */}
        <Animated.View entering={FadeInUp.delay(40).duration(420).springify()}>
          <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium">
            Your bid
          </Text>
          <Text className="text-text font-display tracking-[-0.018em] text-[36px] leading-[1.0] mt-3">
            Compose the tender.
          </Text>
          <Text className="text-text-muted text-[14px] leading-[20px] mt-3">
            Autosaved as you type. Fill the essentials, then add polish
            to stand out side-by-side.
          </Text>
        </Animated.View>

        {/* Required section */}
        <SectionHeader
          kicker="Required"
          title="The essentials"
          subline={`${[t.totalPriceAud, t.durationWeeks, t.validityDays].filter((v) => v != null && v !== 0).length} of 3 filled`}
        />

        {/* Total price — the headline input */}
        <Animated.View
          entering={FadeInUp.delay(120).duration(420).springify()}
          className="mt-4"
        >
          <CurrencyInput
            value={t.totalPriceAud}
            onChange={(v) => draft.patch({ totalPriceAud: v })}
          />
        </Animated.View>

        {/* Duration + validity side-by-side */}
        <Animated.View
          entering={FadeInUp.delay(180).duration(420).springify()}
          className="flex-row gap-3 mt-4"
        >
          <View className="flex-1">
            <NumberStepper
              label="Duration"
              value={t.durationWeeks}
              onChange={(v) => draft.patch({ durationWeeks: v })}
              min={1}
              max={200}
              step={1}
              suffix="weeks"
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(240).duration(420).springify()}
          className="mt-4"
        >
          <ChipPicker
            label="Quote valid for"
            options={VALIDITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={
              (t.validityDays as 7 | 14 | 30 | 60 | 90 | null) ??
              null
            }
            onChange={(v) =>
              draft.patch({
                validityDays: v as 7 | 14 | 30 | 60 | 90 | null,
              })
            }
          />
        </Animated.View>

        {/* Polish section */}
        <SectionHeader
          kicker="Polish"
          title="Stand out"
          subline={`${Math.round(draft.polishPct * 100)}% complete`}
          icon={<Sparkles size={12} color="#7ef5ed" strokeWidth={1.7} />}
        />

        {/* Proposed start */}
        <Animated.View
          entering={FadeInUp.duration(380).springify()}
          className="mt-4"
        >
          <ChipPicker
            label="Proposed start"
            options={monthOptions}
            value={t.proposedStartMonth}
            onChange={(v) =>
              draft.patch({
                proposedStartMonth: v,
              })
            }
          />
        </Animated.View>

        {/* Cost breakdown */}
        <Animated.View
          entering={FadeInUp.duration(380).springify()}
          className="mt-4"
        >
          <CostBreakdown draft={draft} sheetRef={sheetRef} />
        </Animated.View>

        {/* Pitch */}
        <Animated.View
          entering={FadeInUp.duration(380).springify()}
          className="mt-4"
        >
          <TextAreaField
            label="Your pitch"
            value={pitchLocal}
            onChange={(v) => {
              setPitchLocal(v);
              draft.patch({ pitch: v });
            }}
            placeholder="Why are you the right builder? Past projects, approach, what makes you different."
            maxLength={2000}
          />
        </Animated.View>

        {/* Conditions */}
        <Animated.View
          entering={FadeInUp.duration(380).springify()}
          className="mt-4"
        >
          <TextAreaField
            label="Conditions"
            value={conditionsLocal}
            onChange={(v) => {
              setConditionsLocal(v);
              draft.patch({ conditions: v });
            }}
            placeholder="Provisional sums, contingencies, assumptions the owner should know."
            maxLength={2000}
          />
        </Animated.View>

        {/* Exclusions */}
        <Animated.View
          entering={FadeInUp.duration(380).springify()}
          className="mt-4"
        >
          <ChipInput
            label="Exclusions"
            values={t.exclusions ?? []}
            onChange={(next) =>
              draft.patch({ exclusions: next.length === 0 ? null : next })
            }
            placeholder="e.g. GST, landscaping"
            suggestions={EXCLUSION_SUGGESTIONS}
          />
        </Animated.View>
      </ScrollView>

      {/* Sticky submit */}
      <SubmitBar
        canSubmit={draft.canSubmit}
        isSubmitting={draft.isSubmitting}
        completenessPct={draft.completenessPct}
        onSubmit={onSubmit}
      />
    </View>
  );
}

// ── Section header ───────────────────────────────────────────────────

function SectionHeader({
  kicker,
  title,
  subline,
  icon,
}: {
  kicker: string;
  title: string;
  subline: string;
  icon?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-end justify-between mt-9">
      <View>
        <View className="flex-row items-center gap-1.5">
          {icon}
          <Text className="text-accent text-[10px] tracking-[0.24em] uppercase font-ui font-medium">
            {kicker}
          </Text>
        </View>
        <Text className="text-text font-ui font-semibold text-[18px] tracking-[-0.005em] mt-1">
          {title}
        </Text>
      </View>
      <Text className="text-text-faint text-[11.5px] font-ui">{subline}</Text>
    </View>
  );
}

// ── Textarea ────────────────────────────────────────────────────────

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  const [focused, setFocused] = useState(false);
  const has = value.trim().length > 0;
  return (
    <View
      className="rounded-xl border px-4 py-3"
      style={{
        backgroundColor: focused
          ? "rgba(0, 212, 200, 0.04)"
          : "rgba(255, 255, 255, 0.02)",
        borderColor: focused
          ? "rgba(0, 212, 200, 0.40)"
          : has
            ? "rgba(0, 212, 200, 0.22)"
            : "rgba(100, 180, 255, 0.12)",
      }}
    >
      <View className="flex-row items-baseline justify-between">
        <Text className="text-text-faint text-[10px] tracking-[0.18em] uppercase font-ui font-medium">
          {label}
        </Text>
        {focused || has ? (
          <Text className="text-text-dim text-[10px] tabular-nums font-ui">
            {value.length} / {maxLength}
          </Text>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={(v) => v.length <= maxLength && onChange(v)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor="rgba(238, 246, 255, 0.32)"
        multiline
        textAlignVertical="top"
        className="mt-2 text-text font-ui text-[14px]"
        style={{ minHeight: 86, paddingVertical: 0 }}
        accessibilityLabel={label}
      />
    </View>
  );
}

// ── Cost breakdown ──────────────────────────────────────────────────

function CostBreakdown({
  draft,
  sheetRef,
}: {
  draft: ReturnType<typeof useTenderDraft>;
  sheetRef: React.RefObject<BottomSheetModal | null>;
}) {
  const t = draft.tender!;
  const sum = useMemo(
    () => t.costLines.reduce((s, l) => s + l.amountAud, 0),
    [t.costLines],
  );
  const variance = useMemo(() => {
    if (t.costLines.length === 0) return null;
    if (!t.totalPriceAud) return null;
    return sum - t.totalPriceAud;
  }, [t.costLines.length, sum, t.totalPriceAud]);
  const balanced = variance === 0;

  const updateLineAmount = useCallback(
    async (index: number, nextAmount: number) => {
      const lines = t.costLines.map((l, i) => ({
        trade: l.trade,
        amountAud: i === index ? nextAmount : l.amountAud,
        ...(l.label ? { label: l.label } : {}),
      }));
      await draft.replaceCostLines(lines);
    },
    [draft, t.costLines],
  );

  const removeLine = useCallback(
    async (index: number) => {
      void haptics.tap();
      const lines = t.costLines
        .filter((_, i) => i !== index)
        .map((l) => ({
          trade: l.trade,
          amountAud: l.amountAud,
          ...(l.label ? { label: l.label } : {}),
        }));
      await draft.replaceCostLines(lines);
    },
    [draft, t.costLines],
  );

  return (
    <View
      className="rounded-xl border px-4 py-3"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderColor:
          t.costLines.length > 0
            ? "rgba(0, 212, 200, 0.22)"
            : "rgba(100, 180, 255, 0.12)",
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <ListTree size={12} color="#7ef5ed" strokeWidth={1.7} />
          <Text className="text-text-faint text-[10px] tracking-[0.18em] uppercase font-ui font-medium">
            Cost breakdown
          </Text>
        </View>
        {t.costLines.length > 0 ? (
          <Text className="text-text-faint text-[11px] font-ui">
            {t.costLines.length} {t.costLines.length === 1 ? "line" : "lines"}
          </Text>
        ) : null}
      </View>

      {t.costLines.length === 0 ? (
        <Text className="text-text-faint text-[12.5px] leading-[18px] mt-2 mb-3">
          Optional — add line items per trade to help the owner compare apples
          to apples. Add as many as you have.
        </Text>
      ) : (
        <View className="mt-3 gap-2">
          {t.costLines.map((line, i) => (
            <LineRow
              key={line.id}
              label={tradeLabelOf(line.trade)}
              amount={line.amountAud}
              onChangeAmount={(n) => void updateLineAmount(i, n)}
              onRemove={() => void removeLine(i)}
            />
          ))}

          {/* Variance + sum readout */}
          <View
            className="mt-2 px-3.5 py-3 rounded-lg border"
            style={{
              backgroundColor: balanced
                ? "rgba(134, 239, 172, 0.06)"
                : "rgba(255, 184, 71, 0.05)",
              borderColor: balanced
                ? "rgba(134, 239, 172, 0.30)"
                : "rgba(255, 184, 71, 0.30)",
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-text-faint text-[10.5px] tracking-[0.16em] uppercase font-ui font-medium">
                Breakdown total
              </Text>
              <Text
                className="font-ui font-semibold text-[14px] tabular-nums"
                style={{ color: balanced ? "#86efac" : "#fbb840" }}
              >
                {formatAud(sum)}
              </Text>
            </View>
            {variance != null && variance !== 0 ? (
              <Text
                className="text-[11.5px] leading-[16px] mt-1.5"
                style={{ color: "#fbb840" }}
              >
                {variance > 0
                  ? `Breakdown exceeds total by ${formatAud(variance)}. We'll absorb it into "Other" on submit.`
                  : `Breakdown is ${formatAud(-variance)} short. We'll add it to "Other" on submit.`}
              </Text>
            ) : balanced ? (
              <View className="flex-row items-center gap-1 mt-1.5">
                <TrendingUp size={10} color="#86efac" strokeWidth={2} />
                <Text className="text-[11.5px]" style={{ color: "#86efac" }}>
                  Balanced — perfectly matches your total.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      <Pressable
        onPress={() => {
          void haptics.tap();
          sheetRef.current?.present();
        }}
        accessibilityRole="button"
        accessibilityLabel="Add cost line"
        className="mt-3 h-10 flex-row items-center justify-center gap-1.5 rounded-md border border-border-subtle bg-surface-1/40 active:bg-surface-1/70"
      >
        <Plus size={13} color="#7ef5ed" strokeWidth={2} />
        <Text className="text-accent-light font-ui font-semibold text-[12.5px] tracking-[0.005em]">
          Add a line
        </Text>
      </Pressable>
    </View>
  );
}

function LineRow({
  label,
  amount,
  onChangeAmount,
  onRemove,
}: {
  label: string;
  amount: number;
  onChangeAmount: (n: number) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(String(amount || ""));
  const [focused, setFocused] = useState(false);

  // Keep local draft in sync when the parent amount changes (e.g. on
  // initial load or other line edits).
  useEffect(() => {
    if (!focused) setDraft(amount ? amount.toLocaleString("en-AU") : "");
  }, [amount, focused]);

  const commit = useCallback(
    (raw: string) => {
      const digits = raw.replace(/[^\d]/g, "");
      const n = digits ? Number.parseInt(digits, 10) : 0;
      if (n !== amount) onChangeAmount(n);
    },
    [amount, onChangeAmount],
  );

  return (
    <View className="flex-row items-center gap-2 py-2 px-3 rounded-lg bg-surface-1/40 border border-border-subtle">
      <View className="flex-1 min-w-0">
        <Text
          className="text-text font-ui font-medium text-[13.5px]"
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <View
        className="flex-row items-center gap-1 h-9 px-2.5 rounded-md border"
        style={{
          minWidth: 110,
          backgroundColor: focused
            ? "rgba(0, 212, 200, 0.06)"
            : "rgba(255, 255, 255, 0.02)",
          borderColor: focused
            ? "rgba(0, 212, 200, 0.40)"
            : "rgba(100, 180, 255, 0.10)",
        }}
      >
        <Text
          className="text-[14px] font-ui"
          style={{ color: amount > 0 ? "#7ef5ed" : "#567080" }}
        >
          $
        </Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit(draft);
          }}
          inputMode="numeric"
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="rgba(86, 112, 128, 0.7)"
          returnKeyType="done"
          className="flex-1 text-text font-ui text-[14px] tabular-nums"
          style={{ paddingVertical: 0 }}
        />
      </View>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
        hitSlop={8}
        className="size-8 items-center justify-center rounded-full active:bg-danger-muted"
      >
        <Trash2 size={13} color="#ff7a8a" strokeWidth={1.7} />
      </Pressable>
    </View>
  );
}

// ── Sticky submit bar ───────────────────────────────────────────────

function SubmitBar({
  canSubmit,
  isSubmitting,
  completenessPct,
  onSubmit,
}: {
  canSubmit: boolean;
  isSubmitting: boolean;
  completenessPct: number;
  onSubmit: () => void;
}) {
  // Glow grows as completeness rises — visual progress feedback.
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withTiming(completenessPct / 100, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
  }, [completenessPct, glow]);
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.18 + 0.32 * glow.value,
    shadowRadius: 12 + 12 * glow.value,
  }));

  return (
    <SafeAreaView edges={["bottom"]} className="absolute bottom-0 left-0 right-0">
      <View
        className="px-6 pt-3 pb-3 border-t"
        style={{
          backgroundColor: "rgba(3, 9, 15, 0.92)",
          borderTopColor: "rgba(100, 180, 255, 0.08)",
        }}
      >
        <Animated.View style={[{ shadowColor: "#00d4c8", shadowOffset: { width: 0, height: 6 } }, glowStyle]}>
          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit || isSubmitting}
            accessibilityRole="button"
            className="h-14 rounded-xl items-center justify-center flex-row gap-2"
            style={{
              backgroundColor: canSubmit ? "#00d4c8" : "rgba(255, 255, 255, 0.06)",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            <Text
              className="font-ui font-semibold text-[15px] tracking-[0.02em]"
              style={{ color: canSubmit ? "#031118" : "#567080" }}
            >
              {isSubmitting
                ? "Submitting…"
                : canSubmit
                  ? "Submit tender"
                  : "Fill the essentials"}
            </Text>
            {canSubmit && !isSubmitting ? (
              <ArrowRight size={16} color="#031118" strokeWidth={2.4} />
            ) : null}
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ── Success state ────────────────────────────────────────────────────

function SuccessState({
  slug,
  amount,
  submittedAt,
  onBack,
}: {
  slug: string;
  amount: number | null;
  submittedAt: string | null;
  onBack: () => void;
}) {
  // Checkmark pop + ring fill animation.
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { mass: 0.5, damping: 8 });
    opacity.value = withTiming(1, { duration: 280 });
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [scale, opacity]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Screen variant="flat">
      <TopBar onBack={onBack} />
      <View className="flex-1 px-8 items-center justify-center">
        <Animated.View
          style={[
            animStyle,
            {
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "rgba(0, 212, 200, 0.10)",
              borderWidth: 1.5,
              borderColor: "rgba(0, 212, 200, 0.35)",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <CheckCircle size={44} color="#7ef5ed" strokeWidth={1.6} />
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(160).duration(360)}
          className="items-center mt-7"
        >
          <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium">
            Submitted
          </Text>
          <Text className="text-text font-display text-[44px] leading-[0.95] tracking-[-0.018em] uppercase mt-3">
            Tender lodged.
          </Text>
          <Text className="text-text-muted text-[14px] leading-[20px] text-center mt-4 max-w-[280px]">
            Owner will review side-by-side with other submissions. You&rsquo;ll get a notification on shortlist or award.
          </Text>

          {amount ? (
            <View
              className="mt-7 px-6 py-4 rounded-2xl border"
              style={{
                backgroundColor: "rgba(0, 212, 200, 0.06)",
                borderColor: "rgba(0, 212, 200, 0.22)",
              }}
            >
              <Text className="text-text-faint text-[10px] tracking-[0.20em] uppercase font-ui font-medium text-center">
                Your bid
              </Text>
              <Text className="text-accent-light font-display text-[36px] leading-[1.0] tracking-[-0.005em] mt-2 tabular-nums">
                {formatAud(amount)}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(280).duration(360)}
          className="flex-row gap-3 mt-10 self-stretch"
        >
          <Pressable
            onPress={() => {
              void haptics.tap();
              router.replace(`/(main)/projects/${slug}` as never);
            }}
            className="flex-1 h-12 rounded-xl items-center justify-center bg-accent active:bg-accent-active"
          >
            <Text className="text-accent-contrast font-ui font-semibold text-[13.5px] tracking-[0.02em]">
              View project
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void haptics.tap();
              router.replace("/(main)/browse");
            }}
            className="flex-1 h-12 rounded-xl items-center justify-center border border-border-subtle bg-surface-1/40 active:bg-surface-1/70"
          >
            <Text className="text-text font-ui font-semibold text-[13.5px] tracking-[0.02em]">
              Back to browse
            </Text>
          </Pressable>
        </Animated.View>

        {submittedAt ? (
          <Text className="text-text-dim text-[11px] mt-6">
            {new Date(submittedAt).toLocaleString("en-AU", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
