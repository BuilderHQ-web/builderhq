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
  /** Reserve top padding for a floating <GlassTopBar />.
   *  Pass the height (use useTopBarHeight() in the caller). */
  topBarHeight?: number;
  /** Add 96px bottom inset for a sticky CTA bar. */
  bottomCta?: boolean;
  /** Reserve room above the bottom tab bar so content isn't occluded.
   *  Default 88 (tab bar height + safe area). Set to 0 if a non-tab
   *  screen (auth flow, etc.). */
  bottomTabInset?: number;
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
    edges,
    background = palette.canvas,
    paddingX = 20,
    topBarHeight = 0,
    bottomCta = false,
    bottomTabInset = 88,
    scrollY,
    style,
    children,
  } = props;

  // If a GlassTopBar is reserved, the screen owns the top edge itself
  // (the bar paints behind the status bar). Otherwise, default to safe.
  const resolvedEdges: readonly Edge[] =
    edges ?? (topBarHeight > 0 ? ["bottom"] : ["top", "bottom"]);

  // Bottom padding accounts for either a sticky CTA bar (96) or the
  // floating tab bar (88). Caller picks one via bottomCta / bottomTabInset.
  const bottomPad = bottomCta ? 96 : bottomTabInset;
  // Top padding when a sticky bar is reserved.
  const topPad = topBarHeight;

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
          paddingTop: topPad + 8,
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
              progressViewOffset={topPad}
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
            paddingTop: topPad,
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
      <SafeAreaView style={{ flex: 1 }} edges={resolvedEdges}>
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
