/**
 * <Screen /> — the standard screen wrapper.
 *
 * Handles the four things every screen needs and we don't want to
 * repeat:
 *   1. Safe-area insets (top + bottom)
 *   2. Brand canvas background colour
 *   3. KeyboardAvoidingView wrapping (defers to react-native-keyboard-
 *      controller for advanced cases — see lib/keyboard.ts)
 *   4. StatusBar style (light content on dark canvas)
 *
 * Variants:
 *   · `scroll`  — wraps children in a ScrollView with a contentInset
 *                 already padded for the bottom tab bar.
 *   · `flat`    — for screens that own their own list / scroll, e.g.
 *                 FlashList-based pages.
 */
import { StatusBar } from "expo-status-bar";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  View,
  type ViewProps,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { cn } from "@/lib/cn";

interface BaseProps {
  /** Override safe-area edges. Default = top + bottom. */
  edges?: readonly Edge[];
  /** Tailwind className for the inner container. */
  className?: string;
}

interface FlatProps extends BaseProps {
  variant?: "flat";
  children: React.ReactNode;
}

interface ScrollProps extends BaseProps, Omit<ScrollViewProps, "style"> {
  variant: "scroll";
  children: React.ReactNode;
}

export function Screen(props: FlatProps | ScrollProps) {
  const { edges = ["top", "bottom"], className, children } = props;

  // KeyboardAvoidingView is iOS-only useful — Android handles keyboard
  // resizing via android:windowSoftInputMode (set by Expo).
  const body =
    props.variant === "scroll" ? (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className={cn("flex-1", className)}
        // Reasonable defaults for a marketing/dashboard surface. Callers
        // can override via contentContainerStyle / className.
        contentContainerStyle={{ paddingBottom: 32 }}
        {...(props as ScrollViewProps)}
      >
        {children}
      </ScrollView>
    ) : (
      <View className={cn("flex-1", className)}>{children}</View>
    );

  return (
    // Transparent canvas — the parent (main)/_layout owns the
    // page-level gradient so individual screens don't paint over it.
    // The auth flow paints its own dark bg via its own layout.
    <SafeAreaView style={{ flex: 1 }} edges={edges}>
      <StatusBar style="light" />
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}
