/**
 * <BrowseProjectsCTA /> — the premium primary action under the hero.
 *
 * Filled accent pill with a multi-layer teal glow (outer shadow + inner
 * highlight + soft outer halo). Press animates the haptic + scale.
 *
 * Variant note: the surrounding hero is centered, so we expose `align`
 * = 'center' | 'stretch'. Default 'center' renders a self-sized pill.
 */

import * as React from "react";
import { Text, View } from "react-native";

import { Icon } from "@/lib/icons";
import { palette } from "@/lib/theme";

import { Press } from "@/components/ui/press";

interface Props {
  label?: string;
  onPress?: () => void;
  align?: "center" | "stretch";
}

export function BrowseProjectsCTA({
  label = "Browse projects",
  onPress,
  align = "center",
}: Props) {
  return (
    <View
      style={{
        marginTop: 24,
        alignItems: align === "center" ? "center" : "stretch",
      }}
    >
      {/* Soft outer halo — a wider, dimmer shadow expanded out so the
          button "glows" rather than just having a drop shadow. */}
      <View
        style={{
          shadowColor: palette.accent,
          shadowOpacity: 0.55,
          shadowOffset: { width: 0, height: 14 },
          shadowRadius: 30,
          elevation: 12,
        }}
      >
        <Press
          onPress={onPress}
          haptic="select"
          scaleTo={0.96}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            height: 54,
            paddingHorizontal: 28,
            borderRadius: 999,
            backgroundColor: palette.accent,
            borderWidth: 1,
            borderColor: palette.accentLight,
            // Inner top highlight for a glossy reflective quality.
            shadowColor: "rgba(255,255,255,0.5)",
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 0,
          }}
        >
          <Icon.Browse size={18} color={palette.accentContrast} strokeWidth={2} />
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: palette.accentContrast,
              letterSpacing: 0.1,
            }}
          >
            {label}
          </Text>
        </Press>
      </View>
    </View>
  );
}
