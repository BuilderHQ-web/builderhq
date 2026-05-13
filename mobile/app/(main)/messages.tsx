/**
 * /(main)/messages — inline messaging thread list.
 *
 * v1: shell. Real version: FlashList of conversation rows (avatar,
 * last message preview, unread dot, timestamp), tap to push a
 * /(main)/messages/[id] thread view with the chat UI.
 */
import { Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { Screen } from "@/components/ui/screen";

export default function MessagesScreen() {
  return (
    <Screen variant="flat">
      <View className="flex-1 px-6 pt-4">
        <Animated.View entering={FadeInUp.delay(50).duration(420).springify()}>
          <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium">
            Messages
          </Text>
          <Text className="text-text font-display tracking-[-0.018em] text-[44px] leading-[0.95] mt-3">
            Inbox
            <Text className="text-accent-light">.</Text>
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(220).duration(460).springify()}
          className="mt-10 rounded-2xl border border-border-subtle bg-surface-1/40 p-6"
        >
          <Text className="text-text-dim text-[12px] leading-[18px]">
            Conversations land here once a project is unlocked. Push
            notifications fire on new replies; tap-to-mark-read with
            haptic.
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
}
