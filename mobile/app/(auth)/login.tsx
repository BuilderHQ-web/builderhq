/**
 * /login — sign-in screen.
 *
 * Editorial-clean composition, same visual rhythm as the web /login:
 *   · Brand wordmark at top
 *   · Display headline ("Welcome back.")
 *   · Two fields stacked
 *   · Primary CTA + secondary link
 *   · Forgot password link as a soft inline link below
 *
 * Sign-in goes through `useAuth().signIn(...)`. Success haptics fire
 * on a green response; error haptic on validation/auth failure. The
 * keyboard sticks to the bottom of the form via KeyboardAvoidingView
 * inside <Screen/>.
 */
import { useRef, useState } from "react";
import { Link, router } from "expo-router";
import { Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/lib/auth";
import { haptics } from "@/lib/haptics";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (submitting) return;
    setError(null);
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      void haptics.warning();
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    const r = await signIn({ email: e, password });
    setSubmitting(false);
    if (r.ok) {
      void haptics.success();
      router.replace("/(main)");
    } else {
      void haptics.error();
      setError(r.error.message);
    }
  };

  return (
    <Screen variant="scroll" className="px-6">
      <Animated.View entering={FadeIn.duration(320)} className="flex-1 pt-12">
        <View className="flex-row items-center gap-2 mb-10">
          <View className="size-7 rounded-md bg-accent-muted border border-border-accent items-center justify-center">
            <Text className="text-accent-light font-display text-[16px] leading-none">
              b
            </Text>
          </View>
          <Text className="text-text font-display tracking-[-0.01em] text-[18px] leading-none">
            BuilderHQ
          </Text>
        </View>

        <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium mb-4">
          Sign in
        </Text>

        <Text className="text-text font-display tracking-[-0.018em] text-[48px] leading-[0.92] mb-3">
          Welcome
          {"\n"}
          <Text className="text-accent-light">back.</Text>
        </Text>

        <Text className="text-text-muted text-[15px] leading-[1.55] mb-10">
          Your projects, your tenders, your inbox — exactly where you left
          them.
        </Text>

        <View className="gap-5">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="you@company.com.au"
          />
          <TextField
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            placeholder="••••••••"
            error={error}
          />
        </View>

        <View className="mt-8 gap-4">
          <Button
            label={submitting ? "Signing in…" : "Sign in"}
            variant="primary"
            size="lg"
            loading={submitting}
            onPress={onSubmit}
            fullWidth
          />

          <View className="flex-row justify-center gap-1">
            <Text className="text-text-dim text-[13px]">No account yet?</Text>
            <Link href="/(auth)/signup" asChild>
              <Text className="text-accent-light text-[13px] font-medium">
                Sign up
              </Text>
            </Link>
          </View>

          <Link href="/(auth)/forgot" asChild>
            <Text className="text-text-dim text-[12.5px] text-center mt-1">
              Forgot password?
            </Text>
          </Link>
        </View>
      </Animated.View>
    </Screen>
  );
}
