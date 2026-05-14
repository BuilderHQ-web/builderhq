/**
 * <GlassTabBar /> — App Store / Revolut style frosted floating tab bar.
 *
 * Pattern (matches iOS App Store):
 *   · Pill-shape with heavy backdrop blur — content scrolling under
 *     gets blurred behind it, so the bar reads as an overlay.
 *   · Every tab shows icon + label, always — no hiding-on-inactive
 *     gymnastics that breaks layout.
 *   · Active tab gets a soft white-glass pill behind it (subtle, not
 *     a loud gradient) + the icon + label adopt the accent colour.
 *   · Inactive tabs are dim text + dim icon.
 *
 * Floats with a margin from the screen edges + the bottom safe area
 * so the gesture handler at the bottom of iPhones doesn't fight the
 * tap area.
 */
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { Frosted } from "./frosted";
import { colors } from "@/lib/theme";
import { haptics } from "@/lib/haptics";

const TAB_HEIGHT = 62;
const PILL_HEIGHT = 46;
const HORIZONTAL_MARGIN = 14;

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Push the bar a little above the home indicator. iPhones with a
  // notch get the safe area inset; older devices fall back to 12.
  const bottomPad = Math.max(insets.bottom - 4, 12);

  const tabCount = state.routes.length;
  const pillX = useSharedValue(state.index);

  useEffect(() => {
    pillX.value = withSpring(state.index, {
      mass: 0.5,
      damping: 16,
      stiffness: 160,
    });
  }, [state.index, pillX]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: bottomPad,
        left: HORIZONTAL_MARGIN,
        right: HORIZONTAL_MARGIN,
      }}
    >
      <View
        style={{
          height: TAB_HEIGHT,
          borderRadius: TAB_HEIGHT / 2,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.45,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 14,
        }}
      >
        <Frosted tint="deep" intensity={70} style={StyleSheet.absoluteFill} />
        {/* Inner highlight on the top edge — the glass tell */}
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
        {/* Outer hairline border */}
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: TAB_HEIGHT / 2,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.06)",
          }}
        />

        {/* The sliding active pill */}
        <ActivePill pillX={pillX} tabCount={tabCount} />

        {/* Tab buttons */}
        <View style={{ flexDirection: "row", height: "100%" }}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key]!;
            const focused = state.index === index;
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : options.title ?? route.name;
            const TabIcon = options.tabBarIcon;

            const onPress = () => {
              void haptics.tap();
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };
            const onLongPress = () => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={typeof label === "string" ? label : undefined}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                }}
              >
                {TabIcon ? (
                  <TabIcon
                    focused={focused}
                    color={focused ? colors.accentLight : colors.textMuted}
                    size={20}
                  />
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{
                    color: focused ? colors.accentLight : colors.textMuted,
                    fontFamily: "SpaceGrotesk_500Medium",
                    fontSize: 10,
                    fontWeight: focused ? "600" : "500",
                    letterSpacing: 0.2,
                  }}
                >
                  {typeof label === "string" ? label : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/**
 * The active pill — a soft semi-transparent glass-on-glass surface
 * that slides between tab positions. Subtle on purpose; the icon +
 * label tint do most of the work.
 */
function ActivePill({
  pillX,
  tabCount,
}: {
  pillX: SharedValue<number>;
  tabCount: number;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    left: `${(100 / tabCount) * pillX.value}%`,
    width: `${100 / tabCount}%`,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: (TAB_HEIGHT - PILL_HEIGHT) / 2,
          height: PILL_HEIGHT,
          paddingHorizontal: 6,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          flex: 1,
          borderRadius: PILL_HEIGHT / 2,
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.12)",
        }}
      />
    </Animated.View>
  );
}
