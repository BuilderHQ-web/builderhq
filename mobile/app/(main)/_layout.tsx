/**
 * Main group layout — the authenticated app shell.
 *
 * V2 chrome:
 *   · Tab bar is a custom floating glass pill (see <GlassTabBar />),
 *     not React Navigation's default. We swap it in via the `tabBar`
 *     prop on <Tabs />.
 *   · Tabs are role-aware later — for now both roles see the same
 *     four destinations.
 *   · A page-level canvas gradient sits behind every tab so the
 *     background never reads as pure flat colour.
 */
import { Redirect, Tabs } from "expo-router";
import { Compass, Home, MessageCircle, User2 } from "lucide-react-native";
import { View } from "react-native";

import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { GlassTabBar } from "@/components/ui/glass-tab-bar";
import { GridCanvas } from "@/components/ui/grid-canvas";

export default function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Page canvas — slate-navy gradient + faint blueprint grid +
            soft teal/blue blooms. Mirrors the website's landing-page
            background so the brand reads coherent across platforms. */}
      <GridCanvas />

      <Tabs
        // Use our custom floating glass pill instead of the default
        // bottom tab bar. The default sceneBackground is set so each
        // screen renders against transparent (canvas gradient shows
        // through).
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: "transparent" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="browse"
          options={{
            title: "Browse",
            tabBarIcon: ({ color, size }) => (
              <Compass color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Inbox",
            tabBarIcon: ({ color, size }) => (
              <MessageCircle color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "You",
            tabBarIcon: ({ color, size }) => <User2 color={color} size={size} />,
          }}
        />
        {/* Nested project routes (projects/[slug]/index, .../tender)
              are auto-hidden from the tab bar because they don't have
              a Tabs.Screen declaration with a tabBarIcon. Deep links
              into those paths still work via expo-router's file-based
              resolution. */}
      </Tabs>
    </View>
  );
}
