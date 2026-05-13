/**
 * <ErrorView /> — shown when a dashboard fetch fails.
 *
 * Friendly + actionable. Three pieces:
 *   1. A soft warning glyph in a teal ring so it reads "soft alarm"
 *      not "system crashed."
 *   2. A short reason line — the server's `error.message` if surfaced,
 *      otherwise a generic "Couldn't load — try again" fallback.
 *   3. A retry button that re-runs the upstream fetch.
 *
 * No stack traces, no error codes. Those go to Sentry. The visible
 * surface stays calm.
 */
import { AlertTriangle } from "lucide-react-native";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";

export function ErrorView({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View
        className="size-14 rounded-full border border-border-accent items-center justify-center"
        style={{ backgroundColor: "rgba(0, 212, 200, 0.06)" }}
      >
        <AlertTriangle size={22} color="#7ef5ed" strokeWidth={1.6} />
      </View>
      <Text className="mt-6 text-text font-display text-[28px] tracking-[-0.012em] uppercase">
        Take two
      </Text>
      <Text className="mt-3 text-text-muted text-[14px] leading-[22px] text-center max-w-[260px]">
        {message ?? "Couldn't load your dashboard. Pull down to refresh or try again."}
      </Text>
      <View className="mt-8 w-full max-w-[200px]">
        <Button onPress={onRetry} variant="primary" size="md" label="Try again" />
      </View>
    </View>
  );
}
