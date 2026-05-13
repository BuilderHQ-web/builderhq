/**
 * /(main)/index → Dashboard
 *
 * Role-aware welcome scaffold. Currently a polished placeholder ready
 * to be replaced with the real owner / builder dashboard content:
 *   · Owner: project status pulses, recent tenders received, action items
 *   · Builder: FBA grant status, projects in service area, my tenders,
 *              messages
 *
 * For v1 we render the user's name, role pill, and a "what's coming"
 * teaser so the shell can be merged + iterated on screen-by-screen
 * without breaking the navigation flow.
 */
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  project_owner: "Owner",
  builder: "Builder",
  admin: "Admin",
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const greetingName = user?.name ?? "there";

  return (
    <Screen variant="flat">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.delay(50).duration(420).springify()}>
          <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium">
            Dashboard
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(420).springify()}>
          <Text className="text-text font-display tracking-[-0.018em] text-[44px] leading-[0.95] mt-3">
            Hi {greetingName.split(" ")[0]}
            <Text className="text-accent-light">.</Text>
          </Text>
        </Animated.View>

        {user?.role ? (
          <Animated.View
            entering={FadeInUp.delay(180).duration(420).springify()}
            className="mt-4 self-start"
          >
            <View className="px-2.5 h-7 rounded-full border border-border-accent bg-accent-muted justify-center">
              <Text className="text-accent text-[10px] tracking-[0.18em] uppercase font-ui font-semibold">
                {ROLE_LABEL[user.role] ?? user.role}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInUp.delay(240).duration(460).springify()}
          className="mt-10 rounded-2xl border border-border-subtle bg-surface-1/40 p-6"
        >
          <Text className="text-accent-light text-[11px] tracking-[0.22em] uppercase font-ui font-medium">
            Coming soon
          </Text>
          <Text className="text-text text-[18px] font-display tracking-[-0.01em] mt-2 leading-snug">
            Your real dashboard goes here.
          </Text>
          <Text className="text-text-muted text-[14px] leading-[22px] mt-3">
            We&apos;re wiring up the live KPI tiles, project pulse, recent
            messages and FBA grant status. Each section will roll in over
            the next iteration.
          </Text>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
