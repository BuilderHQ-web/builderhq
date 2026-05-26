/**
 * <GlassTabBar /> — App Store / Revolut style floating tab bar.
 *
 * Recipe (matches the iOS native pattern):
 *   · Floating pill above the home indicator. Margins + bottom safe
 *     area so it reads as an overlay, not docked.
 *   · Heavy native backdrop blur — content scrolling under gets
 *     properly blurred behind it. Combined with a dark glass tint so
 *     the bar reads as foreground.
 *   · Hairline outer border + 1px inner top highlight = the "glass"
 *     tell. Holds together at any brightness.
 *   · Active tab gets a soft white-glass *capsule* (not a loud
 *     gradient pill) that slides between positions via a Reanimated
 *     spring. Icon + label adopt the accent colour on active, dim on
 *     inactive. Subtle accent glow under the capsule for that "iOS
 *     control" lift.
 *   · Every tab always shows icon + label — no hiding-on-inactive
 *     gymnastics that breaks layout.
 *
 * Wired via `tabBar={(props) => <GlassTabBar {...props} />}` on
 * the parent <Tabs />.
 */
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { palette } from "@/lib/theme";
import { haptics } from "@/lib/haptics";

const TAB_HEIGHT = 62;
const PILL_HEIGHT = 46;
const HORIZONTAL_MARGIN = 18;

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Floats just above the home indicator. Tested values land cleanly
  // on iPhone 15 / 16 + older non-notch devices via the Math.max.
  const bottomPad = Math.max(insets.bottom - 6, 14);

  // Defensive: only render routes that declared a tabBarIcon. Expo
  // Router strips hidden routes (href:null) from state.routes, but if
  // a future route forgets href:null we don't want it appearing in the
  // bar without an icon.
  const visibleRoutes = state.routes
    .map((route, originalIndex) => ({
      route,
      originalIndex,
      options: descriptors[route.key]!.options,
    }))
    .filter(({ options }) => Boolean(options.tabBarIcon));

  const tabCount = visibleRoutes.length;
  // Map state.index → visible position so the pill lines up even if
  // hidden routes occupy slots in the underlying state.
  const visibleIndex = Math.max(
    0,
    visibleRoutes.findIndex(
      ({ originalIndex }) => originalIndex === state.index,
    ),
  );
  const pillX = useSharedValue(visibleIndex);

  useEffect(() => {
    pillX.value = withSpring(visibleIndex, {
      mass: 0.55,
      damping: 16,
      stiffness: 170,
    });
  }, [visibleIndex, pillX]);

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
      {/* The bar itself — clipped to a pill so the BlurView corners
            don't bleed past the outer border. */}
      <View
        style={{
          height: TAB_HEIGHT,
          borderRadius: TAB_HEIGHT / 2,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.5,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 14 },
          elevation: 16,
        }}
      >
        {/* 1. Native backdrop blur */}
        <BlurView
          intensity={Platform.OS === "ios" ? 65 : 100}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        {/* 2. Dark glass tint so foreground icons stay readable */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(10, 13, 26, 0.42)" },
          ]}
        />
        {/* 3. Top-edge highlight */}
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
        {/* 4. Outer hairline border */}
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: TAB_HEIGHT / 2,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.07)",
          }}
        />

        {/* 5. Sliding active capsule (with soft accent glow halo) */}
        <ActiveCapsule pillX={pillX} tabCount={tabCount} />

        {/* 6. Tabs row — only the visible (icon-bearing) routes */}
        <View style={{ flexDirection: "row", height: "100%" }}>
          {visibleRoutes.map(({ route, options, originalIndex }) => {
            const focused = state.index === originalIndex;
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
                    color={focused ? palette.accentLight : palette.textMuted}
                    size={21}
                  />
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{
                    color: focused ? palette.accentLight : palette.textMuted,
                    fontSize: 10,
                    fontWeight: focused ? "600" : "500",
                    letterSpacing: 0.15,
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
 * Sliding active capsule. Two layers:
 *   · A diffuse accent glow underneath (no border, soft).
 *   · A glass-on-glass pill on top — white at 8% with a hair-thin
 *     accent border. Reads as a polished selection chip without
 *     stealing focus.
 */
function ActiveCapsule({
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
          paddingHorizontal: 5,
        },
        animatedStyle,
      ]}
    >
      {/* Subtle accent glow halo */}
      <View
        style={{
          position: "absolute",
          top: 4,
          left: 4,
          right: 4,
          bottom: 4,
          borderRadius: PILL_HEIGHT / 2,
          backgroundColor: "rgba(0, 212, 200, 0.10)",
        }}
      />
      {/* Glass-on-glass capsule */}
      <View
        style={{
          flex: 1,
          borderRadius: PILL_HEIGHT / 2,
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderWidth: 1,
          borderColor: "rgba(0, 212, 200, 0.30)",
          overflow: "hidden",
        }}
      >
        {/* Inner top highlight */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: "rgba(255, 255, 255, 0.18)",
          }}
        />
      </View>
    </Animated.View>
  );
}
