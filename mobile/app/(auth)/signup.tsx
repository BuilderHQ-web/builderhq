/**
 * /signup — stub for now. Real signup flow rebuilds the web's three-step
 * role/identity/details path with native-feeling transitions between
 * steps (slide horizontally instead of pushing a new screen).
 *
 * For the v1 foundation we just route new users back to the web app
 * for signup, then they sign in here once they've claimed an account.
 * Replace once the dedicated mobile signup endpoint ships.
 */
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";

export default function SignupScreen() {
  return (
    <Screen variant="scroll" className="px-6">
      <View className="flex-1 pt-12">
        <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium mb-4">
          Sign up
        </Text>
        <Text className="text-text font-display tracking-[-0.018em] text-[48px] leading-[0.92] mb-3">
          Coming
          {"\n"}
          <Text className="text-accent-light">soon.</Text>
        </Text>
        <Text className="text-text-muted text-[15px] leading-[1.55] mb-10">
          Mobile signup ships next. For now, finish signup on the web —
          then sign in here once you&apos;ve set a password.
        </Text>
        <Button
          label="Back to sign in"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}
