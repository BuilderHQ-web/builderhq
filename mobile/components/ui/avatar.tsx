/**
 * <Avatar /> — round identity glyph.
 *
 * Two modes:
 *   · `image` — when an avatarUrl is supplied (future, when the
 *      app exposes profile photos). Falls through to initials if the
 *      image fails to load.
 *   · `initials` — first letter of first + (optional) last name,
 *      rendered in a soft gradient circle. The gradient + ring
 *      separator give it depth so it reads as a polished avatar
 *      rather than a flat dot.
 *
 * Sized via `size` (default 36). Tints adapt for premium dark canvas:
 *   teal → blue gradient fill, white text, hair-thin outer glass ring.
 */
import { useMemo } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { brandGradient, colors } from "@/lib/theme";

interface Props {
  /** Display name to derive initials from. Splits on whitespace. */
  name: string | null | undefined;
  /** Override the auto-derived initials (e.g. team abbreviations). */
  initials?: string;
  size?: number;
  /** Use a subtle white-glass treatment instead of the brand gradient
   *  — for places where the gradient would clash (already inside an
   *  active state, etc.). */
  variant?: "gradient" | "glass";
}

function deriveInitials(name: string | null | undefined): string {
  if (!name) return "•";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({
  name,
  initials,
  size = 36,
  variant = "gradient",
}: Props) {
  const text = useMemo(
    () => (initials ?? deriveInitials(name)).slice(0, 2),
    [initials, name],
  );

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name ?? text}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
      }}
    >
      {variant === "gradient" ? (
        <LinearGradient
          colors={brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            style={{
              color: colors.textInverse,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: size * 0.36,
              fontWeight: "700",
              letterSpacing: 0.5,
            }}
          >
            {text}
          </Text>
        </LinearGradient>
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.10)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.14)",
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: size * 0.36,
              fontWeight: "700",
              letterSpacing: 0.5,
            }}
          >
            {text}
          </Text>
        </View>
      )}
      {/* Outer hairline ring — gives the avatar a glass-on-canvas
            separator that survives every background. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.18)",
        }}
      />
    </View>
  );
}
