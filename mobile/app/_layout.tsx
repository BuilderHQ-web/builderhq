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
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Stack } from "expo-router";
import { Fragment, useEffect, type ReactElement, type ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  useFonts,
} from "@expo-google-fonts/instrument-serif";

import { AuthProvider, useAuth } from "@/lib/auth";
import {
  handleColdStartNotificationTap,
  subscribeToNotificationTaps,
} from "@/lib/push";
import { initSounds } from "@/lib/sounds";

/**
 * `react-native-keyboard-controller` ships a native binding (TurboModule).
 * Expo Go can't load custom native modules, so importing the provider
 * eagerly there throws `KeyboardControllerNative.getConstants is not a
 * function`.
 *
 * Detect the runtime up front and lazily require the real provider only
 * when we're inside a dev build / store build. In Expo Go we use a
 * passthrough so the rest of the layout still mounts — the only thing
 * lost is the smooth-keyboard avoidance, which is purely cosmetic.
 *
 * When you graduate from Expo Go to `expo run:ios` (dev client) the
 * real provider takes over automatically; nothing in the consuming code
 * has to change.
 */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const KeyboardProvider: ({
  children,
}: {
  children: ReactNode;
}) => ReactElement = isExpoGo
  ? ({ children }) => <Fragment>{children}</Fragment>
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("react-native-keyboard-controller").KeyboardProvider;

// Keep the splash visible while we boot.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Load Instrument Serif — the landing's display face, now mobile's.
  // Used in italic form on screen titles via the accent-italic device.
  // Body / UI / numeric typography uses the iOS system font (SF Pro)
  // which needs no loading.
  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  // Boot-time: prime the sounds preference flag (silent until the user
  // opts in from Settings — see lib/sounds.ts).
  useEffect(() => {
    void initSounds();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#06080F" }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <AuthProvider>
              <RootStack fontsLoaded={fontsLoaded} />
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
function RootStack({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { isLoading } = useAuth();
  const ready = !isLoading && fontsLoaded;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  // Notification tap routing. Sets up the listener for taps that
  // happen while the JS runtime is alive, then handles the
  // cold-start case (app launched FROM a tap) once the router is
  // mounted. The auth gate above guarantees the router is ready
  // before this effect runs.
  useEffect(() => {
    if (!ready) return;
    const unsubscribe = subscribeToNotificationTaps();
    void handleColdStartNotificationTap();
    return unsubscribe;
  }, [ready]);

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
