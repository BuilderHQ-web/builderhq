/**
 * Main group layout — the authenticated app shell.
 *
 * Splits into stacks per top-level area (dashboard / browse / tenders
 * / messages / profile) and feeds them into a bottom tab bar. The
 * tab bar is rendered via Expo Router's <Tabs /> primitive.
 *
 * Role-aware later: an owner sees "Projects / Tenders", a builder sees
 * "Browse / Saved / Unlocked / Tenders". For the v1 shell both roles
 * see the same scaffolding; we'll branch the tab list once each
 * destination has real content.
 */
import { Redirect, Tabs } from "expo-router";
import { Compass, Home, MessageCircle, User2 } from "lucide-react-native";

import { useAuth } from "@/lib/auth";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme";

export default function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Bounce signed-out users back to login. The root index also handles
  // this, but a deep-link straight into /(main) needs its own guard.
  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Brand-aligned tab bar — dark canvas with a hairline border on
        // top, accent for active labels/icons. Bottom inset is handled
        // by react-native-safe-area-context inside Tabs.
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          fontWeight: "600",
          marginTop: 4,
        },
        // Light haptic on tab change — what every premium app does.
        // expo-haptics is safe to call without await because it returns
        // a Promise we don't need to block on.
      }}
      screenListeners={{
        tabPress: () => void haptics.tap(),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
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
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User2 color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
