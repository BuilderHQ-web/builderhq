/**
 * <Moment /> — Strava-style full-screen celebration overlay.
 *
 * The contrast device. Most of the BuilderHQ mobile app is calm,
 * restrained, generous in negative space. Moments are the opposite:
 * full-screen, big, animated, haptic-rich. They mark state transitions
 * the user worked for:
 *
 *   · Project published        → "Your project is live."
 *   · Tender submitted         → "Tender sent." + price reveal
 *   · Tender awarded           → "You won [project]!" + trophy
 *   · Builder unlocks project  → "Unlocked." + address reveal
 *
 * The contrast between the calm baseline and the celebratory moment
 * is what makes premium feel earned, not performed.
 *
 * Composition:
 *
 *   ┌─────────────────────────────────────────┐
 *   │                                         │
 *   │             [icon, large]               │  scale + spring in
 *   │                                         │
 *   │           Big display title             │  fade + slide up
 *   │           accent-italic word            │
 *   │                                         │
 *   │         optional sub-line               │  fade in delayed
 *   │                                         │
 *   │      ────────────────────                │
 *   │      Optional secondary text             │
 *   │                                         │
 *   │                                         │
 *   │                  [done]                 │  fade in last
 *   └─────────────────────────────────────────┘
 *
 * Choreography (total ~1.2s):
 *   t=0     icon spring-scales from 0 → 1 (spring curve)
 *   t=180   title slides up from below, fades in
 *   t=360   accent word slides up (italic Instrument Serif)
 *   t=520   sub-line fades in
 *   t=720   primary CTA fades in
 *   t=0     haptic.success fires at mount
 *
 * Use:
 *   <Moment
 *     visible={awarded}
 *     icon="Trophy"
 *     title="You won"
 *     accent="Hampton Residence."
 *     sub="Owner has shared their contact details."
 *     primaryLabel="View tender"
 *     onPrimary={() => router.push(...)}
 *     onDismiss={() => setAwarded(false)}
 *   />
 */
import * as React from "react";
import { Modal, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  ZoomIn,
  type EntryExitAnimationFunction,
} from "react-native-reanimated";

import { haptics } from "@/lib/haptics";
import { Icon, type IconName } from "@/lib/icons";
import { palette, radii4, type, fonts } from "@/lib/theme";

import { Press } from "./press";

interface Props {
  visible: boolean;
  /** Curated icon name (from lib/icons). Defaults to Trophy. */
  icon?: IconName;
  /** Plain-text headline. */
  title: string;
  /** Instrument Serif italic accent word. */
  accent: string;
  /** Optional sub-line under the headline. */
  sub?: string;
  /** Primary CTA label. */
  primaryLabel?: string;
  /** Primary CTA handler. */
  onPrimary?: () => void;
  /** Dismiss handler. Always wires to a 'Done' tap. */
  onDismiss: () => void;
  /** Suppress the success haptic. Default false. */
  silentHaptic?: boolean;
}

export function Moment({
  visible,
  icon = "Trophy",
  title,
  accent,
  sub,
  primaryLabel,
  onPrimary,
  onDismiss,
  silentHaptic = false,
}: Props) {
  React.useEffect(() => {
    if (visible && !silentHaptic) {
      void haptics.success();
    }
  }, [visible, silentHaptic]);

  const IconComponent = Icon[icon] ?? Icon.Trophy;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      {/* Backdrop — slightly tinted canvas so the moment feels like
          the same app, not a system alert. */}
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(220)}
        style={{
          flex: 1,
          backgroundColor: palette.canvas,
          opacity: 0.96,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        {/* Soft accent glow behind the icon — sells the celebration */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: palette.accentMuted,
            opacity: 0.5,
          }}
        />

        {/* Icon — spring scales in from 0 */}
        <Animated.View
          entering={ZoomIn.springify().damping(11).mass(0.7)}
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: palette.accent,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 36,
            shadowColor: palette.accent,
            shadowOpacity: 0.55,
            shadowOffset: { width: 0, height: 12 },
            shadowRadius: 32,
            elevation: 12,
          }}
        >
          <IconComponent size={44} color={palette.accentContrast} strokeWidth={2.2} />
        </Animated.View>

        {/* Title — plain system font */}
        <Animated.View entering={SlideInDown.duration(420).delay(180)}>
          <Text
            style={{
              ...type.displayLarge,
              color: palette.text,
              fontWeight: "500",
              textAlign: "center",
            }}
          >
            {title}
          </Text>
        </Animated.View>

        {/* Accent word — Instrument Serif italic */}
        <Animated.View entering={SlideInDown.duration(420).delay(360)}>
          <Text
            style={{
              ...type.displayLarge,
              fontFamily: fonts.displayItalic,
              color: palette.accentLight,
              textAlign: "center",
              marginTop: -8,
            }}
          >
            {accent}
          </Text>
        </Animated.View>

        {sub ? (
          <Animated.View entering={FadeIn.duration(360).delay(520)}>
            <Text
              style={{
                ...type.body,
                color: palette.textMuted,
                textAlign: "center",
                marginTop: 20,
                maxWidth: 320,
              }}
            >
              {sub}
            </Text>
          </Animated.View>
        ) : null}

        {/* Actions — pinned near the bottom-center */}
        <View
          style={{
            position: "absolute",
            left: 32,
            right: 32,
            bottom: 64,
            gap: 12,
          }}
        >
          {primaryLabel && onPrimary ? (
            <Animated.View entering={FadeIn.duration(320).delay(720)}>
              <Press
                onPress={() => {
                  void haptics.select();
                  onPrimary();
                  onDismiss();
                }}
                haptic="none"
                style={{
                  height: 54,
                  borderRadius: radii4.pill,
                  backgroundColor: palette.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    letterSpacing: 0.1,
                    color: palette.accentContrast,
                  }}
                >
                  {primaryLabel}
                </Text>
              </Press>
            </Animated.View>
          ) : null}
          <Animated.View entering={FadeIn.duration(320).delay(840)}>
            <Press
              onPress={onDismiss}
              haptic="tap"
              style={{
                height: 54,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: palette.textMuted,
                  letterSpacing: 0.2,
                }}
              >
                Done
              </Text>
            </Press>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// Suppress unused type warning — re-exported for advanced consumers
// who want to customize the entering animation.
export type { EntryExitAnimationFunction };
