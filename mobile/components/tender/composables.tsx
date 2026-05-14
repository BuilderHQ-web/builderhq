/**
 * Tender composer composables — the building blocks that make this
 * screen feel premium. Each component is single-purpose, accessibility-
 * labelled, and assumes the dark canvas + teal accent palette.
 *
 * Surface:
 *   · CurrencyInput     — giant AUD amount input with $ prefix and
 *                         thousands-separator-as-you-type.
 *   · NumberStepper     — − / + with a numeric input in the middle for
 *                         duration weeks etc.
 *   · ChipPicker        — single-select horizontal pill row for the
 *                         validity-days options.
 *   · ChipInput         — multi-add text field that converts entries
 *                         into removable teal chips (exclusions).
 *   · CompletenessRing  — animated circular progress fill that drives
 *                         the sticky header's "ready to submit" glow.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Check, Minus, Plus, X } from "lucide-react-native";

import { haptics } from "@/lib/haptics";

// ── Currency input ──────────────────────────────────────────────────

/**
 * Big editorial currency input. We strip everything except digits on
 * change + reformat for display so the user sees `$ 482,500` while we
 * store `482500`. Backspace works naturally because we control the
 * controlled value.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  autoFocus,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  const display = useMemo(() => {
    if (value == null) return "";
    return value.toLocaleString("en-AU");
  }, [value]);

  const handleChange = useCallback(
    (raw: string) => {
      const digits = raw.replace(/[^\d]/g, "");
      if (digits === "") {
        onChange(null);
        return;
      }
      const n = Number.parseInt(digits, 10);
      if (Number.isFinite(n)) onChange(n);
    },
    [onChange],
  );

  return (
    <View
      className="rounded-2xl border px-5 py-4"
      style={{
        backgroundColor: focused
          ? "rgba(0, 212, 200, 0.06)"
          : "rgba(255, 255, 255, 0.02)",
        borderColor: focused
          ? "rgba(0, 212, 200, 0.40)"
          : value
            ? "rgba(0, 212, 200, 0.22)"
            : "rgba(100, 180, 255, 0.12)",
      }}
    >
      <Text className="text-text-faint text-[10px] tracking-[0.20em] uppercase font-ui font-medium">
        Total price (AUD)
      </Text>
      <View className="flex-row items-baseline mt-2">
        <Text
          className="font-display text-[36px] leading-[1.0] tracking-[-0.005em] mr-1"
          style={{ color: value ? "#7ef5ed" : "#567080" }}
        >
          $
        </Text>
        <TextInput
          value={display}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          inputMode="numeric"
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor="rgba(86, 112, 128, 0.7)"
          maxLength={14}
          className="flex-1 font-display text-[44px] leading-[1.0] tracking-[-0.005em]"
          style={{
            color: value ? "#eef6ff" : "#98b8d0",
            paddingVertical: 0,
          }}
          accessibilityLabel="Total tender price in Australian dollars"
        />
      </View>
    </View>
  );
}

// ── Number stepper ──────────────────────────────────────────────────

export function NumberStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  suffix,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const adjust = useCallback(
    (delta: number) => {
      const base = value ?? 0;
      const next = Math.max(min, Math.min(max, base + delta));
      void haptics.select();
      onChange(next === 0 ? null : next);
    },
    [value, min, max, onChange],
  );

  return (
    <View
      className="rounded-xl border px-4 py-3"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderColor:
          value && value > 0
            ? "rgba(0, 212, 200, 0.22)"
            : "rgba(100, 180, 255, 0.12)",
      }}
    >
      <Text className="text-text-faint text-[10px] tracking-[0.18em] uppercase font-ui font-medium">
        {label}
      </Text>
      <View className="flex-row items-center justify-between mt-2">
        <Pressable
          onPress={() => adjust(-step)}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          hitSlop={8}
          className="size-9 items-center justify-center rounded-full border border-border-subtle bg-surface-1/40 active:bg-surface-1/70"
        >
          <Minus size={14} color="#eef6ff" strokeWidth={1.8} />
        </Pressable>
        <View className="flex-row items-baseline gap-1">
          <Text
            className="font-display text-[28px] leading-[1.0] tracking-[-0.005em]"
            style={{ color: value && value > 0 ? "#eef6ff" : "#567080" }}
          >
            {value && value > 0 ? value : "—"}
          </Text>
          {suffix && value && value > 0 ? (
            <Text className="text-text-muted text-[12.5px] font-ui">
              {suffix}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => adjust(step)}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          hitSlop={8}
          className="size-9 items-center justify-center rounded-full border border-border-subtle bg-surface-1/40 active:bg-surface-1/70"
        >
          <Plus size={14} color="#eef6ff" strokeWidth={1.8} />
        </Pressable>
      </View>
    </View>
  );
}

// ── Chip picker (single-select) ─────────────────────────────────────

export function ChipPicker<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChange: (next: T | null) => void;
}) {
  return (
    <View
      className="rounded-xl border px-4 py-3"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderColor: value
          ? "rgba(0, 212, 200, 0.22)"
          : "rgba(100, 180, 255, 0.12)",
      }}
    >
      <Text className="text-text-faint text-[10px] tracking-[0.18em] uppercase font-ui font-medium">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2 mt-3">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => {
                void haptics.select();
                onChange(selected ? null : opt.value);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className="h-9 px-3.5 rounded-full border items-center justify-center active:opacity-80"
              style={{
                backgroundColor: selected
                  ? "rgba(0, 212, 200, 0.12)"
                  : "rgba(255, 255, 255, 0.02)",
                borderColor: selected
                  ? "rgba(0, 212, 200, 0.45)"
                  : "rgba(100, 180, 255, 0.10)",
              }}
            >
              <View className="flex-row items-center gap-1">
                {selected ? (
                  <Check size={11} color="#7ef5ed" strokeWidth={2.4} />
                ) : null}
                <Text
                  className="text-[12.5px] font-ui"
                  style={{
                    color: selected ? "#7ef5ed" : "#98b8d0",
                    fontWeight: selected ? "600" : "500",
                  }}
                >
                  {opt.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Chip input (multi-add) ──────────────────────────────────────────

/**
 * Tap-to-add chip input. Submitting the keyboard or hitting return
 * commits the current draft as a chip + clears the input. Tapping the
 * × on a chip removes it. Useful for exclusions / tags.
 */
export function ChipInput({
  label,
  values,
  onChange,
  placeholder = "Type and press return",
  suggestions = [],
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<TextInput>(null);

  const commit = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
        setDraft("");
        return;
      }
      void haptics.tap();
      onChange([...values, trimmed]);
      setDraft("");
    },
    [values, onChange],
  );

  const remove = useCallback(
    (v: string) => {
      void haptics.tap();
      onChange(values.filter((x) => x !== v));
    },
    [values, onChange],
  );

  return (
    <View
      className="rounded-xl border px-4 py-3"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderColor:
          values.length > 0
            ? "rgba(0, 212, 200, 0.22)"
            : "rgba(100, 180, 255, 0.12)",
      }}
    >
      <Text className="text-text-faint text-[10px] tracking-[0.18em] uppercase font-ui font-medium">
        {label}
      </Text>

      {values.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {values.map((v) => (
            <Pressable
              key={v}
              onPress={() => remove(v)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${v}`}
              className="flex-row items-center gap-1.5 h-8 px-3 rounded-full border active:opacity-70"
              style={{
                backgroundColor: "rgba(0, 212, 200, 0.10)",
                borderColor: "rgba(0, 212, 200, 0.30)",
              }}
            >
              <Text
                className="text-[12px] font-ui font-medium"
                style={{ color: "#7ef5ed" }}
              >
                {v}
              </Text>
              <X size={11} color="#7ef5ed" strokeWidth={2.2} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center gap-2 mt-3">
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => commit(draft)}
          placeholder={placeholder}
          placeholderTextColor="rgba(238, 246, 255, 0.32)"
          autoCapitalize="words"
          autoCorrect
          returnKeyType="done"
          className="flex-1 h-10 px-3 rounded-md text-text font-ui text-[14px]"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            borderWidth: 1,
            borderColor: "rgba(100, 180, 255, 0.08)",
          }}
          accessibilityLabel={`Add ${label}`}
        />
        {draft.trim() ? (
          <Pressable
            onPress={() => commit(draft)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${draft}`}
            className="h-10 px-3.5 rounded-md bg-accent active:bg-accent-active items-center justify-center"
          >
            <Text className="text-accent-contrast font-ui font-semibold text-[12.5px]">
              Add
            </Text>
          </Pressable>
        ) : null}
      </View>

      {suggestions.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5 mt-3">
          <Text className="text-text-faint text-[10.5px] font-ui tracking-[0.06em] mr-1">
            Common:
          </Text>
          {suggestions
            .filter(
              (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()),
            )
            .map((s) => (
              <Pressable
                key={s}
                onPress={() => commit(s)}
                hitSlop={4}
                className="h-6 px-2 rounded-full border border-border-subtle bg-surface-1/30 items-center justify-center active:bg-surface-1/60"
              >
                <Text className="text-text-faint text-[10.5px] font-ui">
                  + {s}
                </Text>
              </Pressable>
            ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Completeness ring ───────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 36;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

/**
 * Animated circular progress. Stroke fills clockwise as the
 * percentage rises. Used in the sticky header — small (36px) but
 * carries the "you're close" signal at a glance.
 */
export function CompletenessRing({
  percent,
  showCheck,
}: {
  percent: number;
  showCheck?: boolean;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(percent / 100, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent, progress]);

  const animatedProps = useAnimatedProps(() => {
    const dash = CIRC * (1 - progress.value);
    return {
      strokeDashoffset: dash,
    };
  });
  const labelColor = useDerivedValue(() =>
    progress.value > 0.6 ? "#7ef5ed" : "#98b8d0",
  );

  return (
    <View
      style={{ width: SIZE, height: SIZE }}
      className="items-center justify-center"
    >
      <Svg width={SIZE} height={SIZE}>
        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="rgba(100, 180, 255, 0.12)"
          strokeWidth={STROKE}
          fill="transparent"
        />
        {/* Fill */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#7ef5ed"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      {showCheck ? (
        <View className="absolute inset-0 items-center justify-center">
          <Check size={14} color="#7ef5ed" strokeWidth={2.4} />
        </View>
      ) : (
        <View className="absolute inset-0 items-center justify-center">
          <Text
            className="text-[9.5px] tabular-nums font-ui font-semibold"
            style={{ color: percent > 60 ? "#7ef5ed" : "#98b8d0" }}
          >
            {percent}
          </Text>
        </View>
      )}
    </View>
  );
}

// Re-export Keyboard so the screen has a single import surface for
// composables when handling submit-on-return cases.
export { Keyboard };
