/**
 * <AvatarV4 /> — v4 identity glyph.
 *
 * Differences from legacy <Avatar />:
 *   · NO brand gradient fill — v4 drops the teal→blue gradient entirely.
 *     The default avatar is a flat accent-muted surface with the initials
 *     in accentLight; selected / active uses a solid accent fill.
 *   · OPTIONAL verification pip — small teal dot at the bottom-right
 *     when `verified` is true. Premium signal for verified builders.
 *   · Uses v4 palette tokens (no `colors.textInverse` etc.)
 *
 * Initials:
 *   First letter of first name + first letter of last name (or the
 *   single initial for a single-word name). Falls back to '·' for null.
 *
 * Sizes use the locked rhythm: 28, 36, 44, 56, 72. Anything else is a drift.
 */
import * as React from "react";
import { Text, View, type ViewStyle } from "react-native";

import { palette } from "@/lib/theme";

interface Props {
  /** Display name; initials are derived from this. */
  name: string | null | undefined;
  /** Explicit initials override (e.g. team abbreviations). */
  initials?: string;
  /** Avatar diameter. Locked rhythm: 28 / 32 / 36 / 44 / 56 / 72.
   *  (32 added for header avatars — matches the iOS chrome size.) */
  size?: 28 | 32 | 36 | 44 | 56 | 72;
  /** Show a teal verification pip at bottom-right. */
  verified?: boolean;
  /** Filled accent (decisive state) vs default tinted (calm state). */
  variant?: "default" | "filled";
  style?: ViewStyle;
}

function deriveInitials(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function AvatarV4({
  name,
  initials,
  size = 44,
  verified = false,
  variant = "default",
  style,
}: Props) {
  const text = React.useMemo(
    () => (initials ?? deriveInitials(name)).slice(0, 2),
    [initials, name],
  );

  const filled = variant === "filled";

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name ?? text}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: filled ? palette.accent : palette.accentMuted,
          borderWidth: 1,
          borderColor: filled ? palette.accent : palette.hairlineAccent,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: size * 0.36,
          fontWeight: "700",
          color: filled ? palette.accentContrast : palette.accentLight,
          letterSpacing: 0.5,
        }}
      >
        {text}
      </Text>

      {verified ? (
        <View
          // Verification pip — small teal dot with a canvas-colored
          // ring so it reads as "on top of" the avatar, not blended.
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: size * 0.30,
            height: size * 0.30,
            borderRadius: (size * 0.30) / 2,
            backgroundColor: palette.accent,
            borderWidth: 2,
            borderColor: palette.canvas,
          }}
        />
      ) : null}
    </View>
  );
}
