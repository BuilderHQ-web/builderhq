/**
 * Main group layout — the authenticated app shell.
 *
 * Four tabs, period:
 *   1. Home      — role-aware dashboard
 *   2. Projects  — owner: their projects · builder: marketplace browse
 *   3. Messages  — inbox
 *   4. You       — profile / settings
 *
 * Every other route under this group (project detail, tender composer,
 * chat thread, etc.) is explicitly hidden from the tab bar via
 * `href: null`. Without that, Expo Router auto-creates a tab entry for
 * every route file it discovers under (main)/, which is what was
 * stuffing the bottom bar with "messa... messa... projec... projec..."
 * in the previous build.
 *
 * The legacy `browse` route file stays around for backward-compat with
 * any in-app `router.push("/(main)/browse")` calls — it's hidden from
 * tabs but resolvable.
 *
 * Glass tab bar + page canvas live at this layer so the chrome is
 * shared across all four tabs.
 */
import { Redirect, Tabs } from "expo-router";
import {
  Compass,
  Home as HomeIcon,
  MessageCircle,
  User2,
} from "lucide-react-native";
import { View } from "react-native";

import { useAuth } from "@/lib/auth";
import { palette } from "@/lib/theme";
import { GlassTabBar } from "@/components/ui/glass-tab-bar";

export default function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: palette.canvas },
        }}
      >
        {/* ── The 4 visible tabs ─────────────────────────────────── */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <HomeIcon color={color} size={size} strokeWidth={1.85} />
            ),
          }}
        />
        <Tabs.Screen
          name="projects/index"
          options={{
            title: "Projects",
            tabBarIcon: ({ color, size }) => (
              <Compass color={color} size={size} strokeWidth={1.85} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages/index"
          options={{
            title: "Inbox",
            tabBarIcon: ({ color, size }) => (
              <MessageCircle color={color} size={size} strokeWidth={1.85} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "You",
            tabBarIcon: ({ color, size }) => (
              <User2 color={color} size={size} strokeWidth={1.85} />
            ),
          }}
        />

        {/* ── Everything below: hidden from the tab bar via href:null.
              Routes still work as deep-link / push targets; they just
              don't show up in the bottom nav. */}
        <Tabs.Screen name="browse" options={{ href: null }} />
        <Tabs.Screen name="messages/[id]" options={{ href: null }} />
        <Tabs.Screen name="tenders/[id]" options={{ href: null }} />
        <Tabs.Screen
          name="projects/[slug]/index"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="projects/[slug]/tender"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="projects/[slug]/tenders/index"
          options={{ href: null }}
        />
      </Tabs>
    </View>
  );
}
