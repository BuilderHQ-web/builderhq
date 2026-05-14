/**
 * <GlassTabBar /> — the floating, frosted, pill-shaped bottom tab
 * bar that replaces React Navigation's default tab bar.
 *
 * Design recipe:
 *   · Floats above the canvas with a margin from the screen edges +
 *     bottom safe area, so it reads as an interactive overlay rather
 *     than a fixed dock.
 *   · BlurView backdrop tinted toward the canvas — same trick the
 *     iOS native control center / dynamic island uses.
 *   · Active tab is rendered inside a gradient pill that slides into
 *     position with a Reanimated spring. The inactive tabs are just
 *     icon + label dimmed; the visual focus stays on the active pill.
 *   · Light haptic on every tab change (already wired in the route
 *     listener, but we also fire on the GlassTabBar press so direct
 *     consumers feel the same).
 *
 * Wired into Expo Router via `tabBar={(props) => <GlassTabBar {...} />}`
 * on the parent <Tabs /> component.
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
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { Frosted } from "./frosted";
import { brandGradient, colors } from "@/lib/theme";
import { haptics } from "@/lib/haptics";

const TAB_HEIGHT = 64;
const PILL_HEIGHT = 50;
const HORIZONTAL_MARGIN = 16;

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Pull insets off the bottom — but keep at least 12px so the bar
  // floats nicely on devices without home-indicator buffer.
  const bottomPad = Math.max(insets.bottom, 12);

  // Active-pill x-position. We compute the per-tab width from the
  // measured bar width once the layout runs.
  const tabCount = state.routes.length;
  const pillX = useSharedValue(0);

  // Sync the pill to the active index whenever it changes.
  useEffect(() => {
    pillX.value = withSpring(state.index, {
      mass: 0.6,
      damping: 16,
      stiffness: 140,
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
          borderRadius: 32,
          overflow: "hidden",
          // Shadow gives the bar separation from the content scrolling
          // beneath it. Stronger on iOS, fallback elevation on Android.
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        }}
      >
        {/* Frosted-glass backdrop — solid tinted layer for now. When
              we ship a dev-client build, swap to a real BlurView for
              true backdrop blur. */}
        <Frosted tint="deep" style={StyleSheet.absoluteFill} />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass2 }]}
        />
        {/* Hairline borders */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: colors.glassEdge,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />

        {/* Active pill — a sliding gradient pill that sits behind the
              active tab's icon + label. */}
        <ActivePill pillX={pillX} tabCount={tabCount} />

        {/* Tabs */}
        <View style={{ flexDirection: "row", height: "100%" }}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key]!;
            const focused = state.index === index;
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : options.title ?? route.name;

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

            const TabIcon = options.tabBarIcon;

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
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                {TabIcon ? (
                  <TabIcon
                    focused={focused}
                    color={focused ? colors.text : colors.textMuted}
                    size={20}
                  />
                ) : null}
                {focused ? (
                  <Text
                    style={{
                      color: colors.text,
                      fontFamily: "SpaceGrotesk_500Medium",
                      fontSize: 12,
                      fontWeight: "600",
                      letterSpacing: 0.02,
                    }}
                    numberOfLines={1}
                  >
                    {typeof label === "string" ? label : ""}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/**
 * The animated gradient pill that sits behind the active tab. Width
 * grows so labels can fit; inactive tabs hide their label so the row
 * doesn't get crowded.
 */
function ActivePill({
  pillX,
  tabCount,
}: {
  pillX: SharedValue<number>;
  tabCount: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    // Tab slots are equal width; pill centres in the active slot.
    return {
      left: `${(100 / tabCount) * pillX.value}%`,
      width: `${100 / tabCount}%`,
    };
  });

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
          overflow: "hidden",
          shadowColor: colors.accent,
          shadowOpacity: 0.45,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <LinearGradient
          colors={brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Inner glow */}
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: PILL_HEIGHT / 2,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.22)",
          }}
        />
      </View>
    </Animated.View>
  );
}
