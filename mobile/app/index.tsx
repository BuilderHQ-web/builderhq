/**
 * Root redirect.
 *
 * Auth state has already been hydrated in <RootLayout/>. We just route
 * the user to the right group:
 *   · signed in → /(main)
 *   · signed out → /(auth)/login
 *
 * Using <Redirect /> instead of a useEffect+router.push because Expo
 * Router treats <Redirect /> at render time and skips the initial
 * paint of this screen — avoids a brief flash of an empty page.
 */
import { Redirect } from "expo-router";

import { useAuth } from "@/lib/auth";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Redirect href={isAuthenticated ? "/(main)" : "/(auth)/login"} />;
}
