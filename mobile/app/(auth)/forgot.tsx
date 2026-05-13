/**
 * /forgot — request password reset. Talks to the same /api/auth/forgot
 * endpoint the web uses (returns "we sent it if it exists" regardless
 * to defeat email enumeration).
 *
 * Success state hides the form and shows confirmation copy + a "back
 * to sign in" CTA. Failure (network only — the action never reveals
 * "wrong email") shows an inline error.
 */
import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { api } from "@/lib/api";
import { haptics } from "@/lib/haptics";

export default function ForgotScreen() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (submitting) return;
    setError(null);
    const e = email.trim().toLowerCase();
    if (!e) {
      void haptics.warning();
      setError("Enter the email on your account.");
      return;
    }
    setSubmitting(true);
    const r = await api.post(
      "/api/mobile/forgot",
      { email: e },
      { auth: false },
    );
    setSubmitting(false);
    if (r.ok) {
      void haptics.success();
      setSent(true);
    } else {
      void haptics.error();
      setError(r.error.message);
    }
  };

  if (sent) {
    return (
      <Screen variant="scroll" className="px-6">
        <View className="flex-1 pt-12">
          <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium mb-4">
            Check your inbox
          </Text>
          <Text className="text-text font-display tracking-[-0.018em] text-[48px] leading-[0.92] mb-3">
            On its
            {"\n"}
            <Text className="text-accent-light">way.</Text>
          </Text>
          <Text className="text-text-muted text-[15px] leading-[1.55] mb-10">
            If we have an account for that email, a reset link is in your
            inbox in the next minute. Check spam too.
          </Text>
          <Button
            label="Back to sign in"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace("/(auth)/login")}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen variant="scroll" className="px-6">
      <View className="flex-1 pt-12">
        <Text className="text-accent text-[10.5px] tracking-[0.24em] uppercase font-ui font-medium mb-4">
          Forgot password
        </Text>
        <Text className="text-text font-display tracking-[-0.018em] text-[48px] leading-[0.92] mb-3">
          We&apos;ll send
          {"\n"}
          <Text className="text-accent-light">a link.</Text>
        </Text>
        <Text className="text-text-muted text-[15px] leading-[1.55] mb-8">
          Enter your account email and we&apos;ll send you a fresh
          password-reset link.
        </Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@company.com.au"
          error={error}
        />

        <View className="mt-8 gap-4">
          <Button
            label={submitting ? "Sending…" : "Send reset link"}
            variant="primary"
            size="lg"
            loading={submitting}
            fullWidth
            onPress={onSubmit}
          />
          <Button
            label="Back to sign in"
            variant="ghost"
            size="md"
            fullWidth
            onPress={() => router.back()}
          />
        </View>
      </View>
    </Screen>
  );
}
