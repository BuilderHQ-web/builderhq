/**
 * /(main)/profile — public profile editor + account settings.
 *
 * For the foundation we just expose sign-out so we can verify the auth
 * loop end-to-end. The real editor (logo upload, ABN check, licence
 * verification, service-area map picker) lands once the API surfaces
 * are in.
 */
import { Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const onSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <Screen variant="flat">
      <View className="flex-1 px-6 pt-4">
        <Animated.View entering={FadeInUp.delay(50).duration(420).springify()}>
          <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium">
            Profile
          </Text>
          <Text className="text-text font-display tracking-[-0.018em] text-[44px] leading-[0.95] mt-3">
            Your
            {"\n"}
            <Text className="text-accent-light">account.</Text>
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(180).duration(420).springify()}
          className="mt-8 rounded-2xl border border-border-subtle bg-surface-1/40 p-5"
        >
          <Text className="text-text-dim text-[10px] tracking-[0.22em] uppercase font-ui font-medium mb-2">
            Signed in as
          </Text>
          <Text className="text-text text-[17px] font-medium">
            {user?.name ?? "—"}
          </Text>
          <Text className="text-text-muted text-[13px] mt-1">
            {user?.email ?? "—"}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(260).duration(420).springify()}
          className="mt-6"
        >
          <Button
            label="Sign out"
            variant="secondary"
            size="md"
            fullWidth
            leftIcon={<LogOut size={16} color="#98b8d0" />}
            onPress={onSignOut}
          />
        </Animated.View>
      </View>
    </Screen>
  );
}
