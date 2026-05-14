/**
 * Auth group layout — for login / signup / claim / forgot screens.
 *
 * Sits inside the root <Stack/>, so it's a nested stack. No header by
 * default — every auth screen owns its own visual treatment, and a
 * default Expo Router header would fight the editorial layouts.
 */
import { Stack } from "expo-router";

import { useAuth } from "@/lib/auth";
import { Redirect } from "expo-router";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  // Bounce signed-in users out of the auth flow.
  if (!isLoading && isAuthenticated) return <Redirect href="/(main)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Match the v2 canvas — slate-navy with a hair of warmth.
        contentStyle: { backgroundColor: "#0a0d1a" },
        animation: "slide_from_right",
      }}
    />
  );
}
