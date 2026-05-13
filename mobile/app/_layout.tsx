/**
 * Root layout — wires every cross-cutting provider exactly once.
 *
 * Order matters (outer → inner):
 *   1. GestureHandlerRootView   — required by react-native-gesture-handler
 *                                  for any pan/swipe gesture below.
 *   2. KeyboardProvider          — react-native-keyboard-controller.
 *                                  Best-in-class keyboard avoidance, lets
 *                                  us animate alongside the system kb.
 *   3. SafeAreaProvider          — geometry for notch / home indicator.
 *   4. BottomSheetModalProvider  — global portal so any screen can mount
 *                                  a Gorhom sheet without re-wrapping.
 *   5. AuthProvider              — hydrates session from SecureStore on
 *                                  boot. Components below `useAuth()`.
 *   6. <Stack/>                  — Expo Router's root stack. We split
 *                                  the routes into (auth) and (main)
 *                                  groups inside the stack so guards
 *                                  can swap which group is active.
 *
 * Splash screen stays visible until BOTH:
 *   · custom fonts have loaded
 *   · the auth state has finished hydrating
 * Avoids the "white flash → unstyled text → real UI" zigzag.
 */
import "../global.css";
import "react-native-reanimated";

import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { AuthProvider, useAuth } from "@/lib/auth";
import { initSounds } from "@/lib/sounds";

// Keep the splash visible while we boot.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Boot-time: prime the sounds preference flag (silent until the user
  // opts in from Settings — see lib/sounds.ts).
  useEffect(() => {
    void initSounds();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#03090f" }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <AuthProvider>
              <RootStack />
            </AuthProvider>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Decides when to hide the splash (once auth state knows whether we're
 * signed in). Split out so it can read `useAuth()` — the provider sits
 * above it.
 */
function RootStack() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#03090f" },
        animation: "default",
        animationTypeForReplace: "push",
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}
