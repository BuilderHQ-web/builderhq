/**
 * /(main)/browse → project browse list.
 *
 * v1: shell-only — once the /api/mobile/projects endpoint is wired up,
 * this hosts a FlashList of project cards with the same FILLED-state
 * logic as web. Swipe gestures on cards (save / dismiss) will be added
 * via react-native-gesture-handler in v2.
 */
import { Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { Screen } from "@/components/ui/screen";

export default function BrowseScreen() {
  return (
    <Screen variant="flat">
      <View className="flex-1 px-6 pt-4">
        <Animated.View entering={FadeInUp.delay(50).duration(420).springify()}>
          <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium">
            Browse
          </Text>
          <Text className="text-text font-display tracking-[-0.018em] text-[44px] leading-[0.95] mt-3">
            Live projects
            <Text className="text-accent-light">.</Text>
          </Text>
          <Text className="text-text-muted text-[14px] leading-[22px] mt-4 max-w-[36ch]">
            Verified Australian residential builds, ranked by fit to your
            service area + project preferences.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(220).duration(460).springify()}
          className="mt-10 rounded-2xl border border-border-subtle bg-surface-1/40 p-6"
        >
          <Text className="text-text-dim text-[12px] leading-[18px]">
            Project list lands here — FlashList-backed, swipe to save, tap
            to view, pull to refresh. Wiring up next.
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
}
