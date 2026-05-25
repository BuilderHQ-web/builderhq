/**
 * <ScreenV4 /> — v4 screen wrapper.
 *
 * Differences from legacy <Screen />:
 *   · Paints the v4 canvas color (#06080F) directly — no dependency
 *     on a parent gradient. Each v4 screen owns its background.
 *   · Standard 20px horizontal page padding. Tweak only when a
 *     full-bleed pattern demands it.
 *   · Built-in pull-to-refresh integration (just pass `onRefresh`).
 *   · Scroll-aware: emits a shared `scrollY` value so a sibling
 *     <ScreenHeader /> can collapse its big title in sync.
 *
 * Variants:
 *   · `scroll`  — vertical ScrollView with pull-to-refresh
 *   · `flat`    — for screens that own their own list / virtualized
 *                 surface (FlashList, etc.)
 *   · `bottom-cta` — adds a 96px bottom inset so the StickyCTA bar
 *                    doesn't occlude content
 */
import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { palette } from "@/lib/theme";

interface BaseProps {
  edges?: readonly Edge[];
  /** Background override — defaults to palette.canvas. */
  background?: string;
  /** Horizontal page padding (default 20). 0 = full bleed. */
  paddingX?: number;
  /** Add 96px bottom inset for a sticky CTA bar. */
  bottomCta?: boolean;
  /** Optional shared scroll-Y for a sibling ScreenHeader. */
  scrollY?: SharedValue<number>;
  style?: ViewStyle;
  children: React.ReactNode;
}

interface FlatProps extends BaseProps {
  variant?: "flat";
}

interface ScrollProps
  extends BaseProps,
    Omit<ScrollViewProps, "style" | "contentContainerStyle" | "children"> {
  variant: "scroll";
  /** Pull-to-refresh handler. Omit to disable. */
  onRefresh?: () => Promise<void> | void;
  /** Whether currently refreshing (drives the spinner). */
  refreshing?: boolean;
}

export function ScreenV4(props: FlatProps | ScrollProps) {
  const {
    edges = ["top", "bottom"],
    background = palette.canvas,
    paddingX = 20,
    bottomCta = false,
    scrollY,
    style,
    children,
  } = props;

  const bottomPad = bottomCta ? 96 : 32;

  const innerScrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const v = e.contentOffset.y;
      innerScrollY.value = v;
      if (scrollY) {
        scrollY.value = v;
      }
    },
  });

  let body: React.ReactNode;

  if (props.variant === "scroll") {
    const { onRefresh, refreshing = false, ...scrollRest } = props;
    body = (
      <Animated.ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: paddingX,
          paddingBottom: bottomPad,
        }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={palette.accent}
              colors={[palette.accent]}
              progressBackgroundColor={palette.surface}
            />
          ) : undefined
        }
        {...(scrollRest as ScrollViewProps)}
      >
        {children}
      </Animated.ScrollView>
    );
  } else {
    body = (
      <View
        style={[
          {
            flex: 1,
            paddingHorizontal: paddingX,
            paddingBottom: bottomPad,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        <StatusBar style="light" />
        {Platform.OS === "ios" ? (
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            {body}
          </KeyboardAvoidingView>
        ) : (
          body
        )}
      </SafeAreaView>
    </View>
  );
}
