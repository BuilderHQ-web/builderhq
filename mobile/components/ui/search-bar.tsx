/**
 * <SearchBar /> — Revolut-style search field.
 *
 * Premium recipe:
 *   · Pill-shape. Glass tint inside; subtle hairline border;
 *     soft inner-top highlight so it reads as inset.
 *   · Focused state lifts the border to a teal hairline + tints the
 *     interior toward the accent.
 *   · Optional trailing slot for a circular glass filter button
 *     ("filter chip" pattern from App Store browse).
 *   · Press-scale spring on the filter button.
 *
 * Stateless from the input's POV — caller owns the value + setValue.
 */
import { useCallback, useState, type ReactNode } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Search, X } from "lucide-react-native";

import { colors } from "@/lib/theme";
import { haptics } from "@/lib/haptics";

interface Props extends Omit<TextInputProps, "style" | "onChange"> {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  onClear?: () => void;
  /** Right slot — typically a <FilterButton />. */
  trailing?: ReactNode;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search",
  onClear,
  trailing,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;

  const clear = useCallback(() => {
    void haptics.tap();
    onChange("");
    onClear?.();
  }, [onChange, onClear]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          flex: 1,
          height: 46,
          paddingLeft: 14,
          paddingRight: hasValue ? 6 : 14,
          borderRadius: 23,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: focused
            ? "rgba(0, 212, 200, 0.06)"
            : "rgba(255, 255, 255, 0.04)",
          borderWidth: 1,
          borderColor: focused
            ? "rgba(0, 212, 200, 0.40)"
            : "rgba(255, 255, 255, 0.08)",
          overflow: "hidden",
        }}
      >
        {/* Top-inner highlight — 1px of brightness on the upper edge
              that catches device tilt and reads as a polished inset. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
          }}
        />
        <Search
          size={15}
          color={focused ? colors.accentLight : colors.textMuted}
          strokeWidth={1.7}
        />
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="rgba(245, 247, 255, 0.36)"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{
            flex: 1,
            color: colors.text,
            fontFamily: "DMSans_400Regular",
            fontSize: 14.5,
            paddingVertical: 0,
          }}
          {...rest}
        />
        {hasValue ? (
          <Pressable
            onPress={clear}
            hitSlop={12}
            accessibilityLabel="Clear search"
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
            }}
          >
            <X size={12} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

// ── Circular glass filter button (used as the SearchBar `trailing`) ──

interface FilterButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  /** Show a tiny badge on the top-right corner (active filter count). */
  badge?: number;
  children: ReactNode;
}

export function FilterButton({
  onPress,
  accessibilityLabel,
  badge,
  children,
}: FilterButtonProps) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={() => {
        void haptics.tap();
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.92, { mass: 0.4, damping: 14 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { mass: 0.4, damping: 12 });
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      <Animated.View
        style={[
          {
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.10)",
            overflow: "hidden",
          },
          anim,
        ]}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: "rgba(255, 255, 255, 0.14)",
          }}
        />
        {children}
        {badge != null && badge > 0 ? (
          <View
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 4,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.accent,
            }}
          >
            <Text
              style={{
                color: colors.textInverse,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 9.5,
                fontWeight: "700",
                lineHeight: 12,
              }}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
