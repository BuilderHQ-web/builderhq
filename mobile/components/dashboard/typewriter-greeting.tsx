/**
 * <TypewriterGreeting /> — the hero block of the builder home.
 *
 *   Good afternoon,
 *   Smith.                                    ← Instrument Serif italic
 *
 *   You have 1 live tender ▌                   ← typewriter, cycles
 *
 * Composition:
 *   · Greeting line + Instrument-serif accent name, centered horizontally
 *   · Live-update sentence underneath that types itself character-by-
 *     character on first render, holds for 5 seconds, slides out to the
 *     left while fading, and the next sentence slides in from the right
 *     to type itself in turn. Cycles forever.
 *   · A blinking accent cursor follows the typewriter while typing.
 *
 * The sentences are passed in as a stable array — derive them from
 * dashboard data in the caller. If the array changes, the cycle resets
 * to index 0 so the user always sees the freshest content first.
 */

import * as React from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { fonts, palette, type } from "@/lib/theme";

const TYPE_CHAR_MS = 40; // per-character typing speed
const HOLD_MS = 5000; // pause after typing
const TRANSITION_MS = 480; // slide/fade between sentences

interface Props {
  /** "Good morning" / "Good afternoon" / "Good evening". */
  greeting: string;
  /** First-name or display-name for the accent line. */
  name: string;
  /** Ordered sentences to cycle through. Must be non-empty for typewriter. */
  sentences: readonly string[];
}

export function TypewriterGreeting({ greeting, name, sentences }: Props) {
  const safeSentences = sentences.length > 0 ? sentences : ["Welcome."];

  // ── Static greeting block ─────────────────────────────────────────────
  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{
          ...type.title,
          color: palette.textMuted,
          fontWeight: "500",
          textAlign: "center",
          letterSpacing: -0.2,
        }}
      >
        {greeting},
      </Text>
      <Text
        style={{
          fontFamily: fonts.displayItalic,
          fontSize: 56,
          lineHeight: 60,
          color: palette.accentLight,
          textAlign: "center",
          marginTop: -2,
          letterSpacing: -0.6,
        }}
      >
        {name}.
      </Text>

      {/* The live-update typewriter line */}
      <View style={{ marginTop: 18, minHeight: 28 }}>
        <Typewriter sentences={safeSentences} />
      </View>
    </View>
  );
}

/**
 * Encapsulates the type / hold / slide-out / slide-in / repeat cycle.
 * Lives in its own component so the static greeting above doesn't
 * re-render on every keystroke tick.
 */
function Typewriter({ sentences }: { sentences: readonly string[] }) {
  const [idx, setIdx] = React.useState(0);
  const [displayLen, setDisplayLen] = React.useState(0);
  const [phase, setPhase] = React.useState<"typing" | "hold" | "exiting">(
    "typing",
  );

  // Shared values drive the slide-out/slide-in motion via Reanimated.
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  // Blinking cursor for the typing phase.
  const cursorOpacity = useSharedValue(1);

  // Reset the cursor blink whenever we re-enter the typing phase.
  React.useEffect(() => {
    if (phase === "typing") {
      cursorOpacity.value = 1;
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 480, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 480, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      cursorOpacity.value = withTiming(0, { duration: 120 });
    }
  }, [phase, cursorOpacity]);

  // Drive the typing / hold / exit phases via a single chained effect.
  React.useEffect(() => {
    if (sentences.length === 0) return;
    const current = sentences[idx]!;

    if (phase === "typing") {
      if (displayLen < current.length) {
        const t = setTimeout(
          () => setDisplayLen((d) => d + 1),
          TYPE_CHAR_MS,
        );
        return () => clearTimeout(t);
      }
      // Done typing — hold for HOLD_MS then exit.
      const t = setTimeout(() => setPhase("hold"), 0);
      return () => clearTimeout(t);
    }

    if (phase === "hold") {
      const t = setTimeout(() => setPhase("exiting"), HOLD_MS);
      return () => clearTimeout(t);
    }

    if (phase === "exiting") {
      // Slide out to the left while fading.
      opacity.value = withTiming(0, {
        duration: TRANSITION_MS,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      translateX.value = withTiming(-28, {
        duration: TRANSITION_MS,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      const t = setTimeout(() => {
        // Reset for the next sentence — start it on the right, then
        // slide it in to centre.
        translateX.value = 28;
        opacity.value = 0;
        setIdx((i) => (i + 1) % sentences.length);
        setDisplayLen(0);
        setPhase("typing");
        // Slide-in animation.
        translateX.value = withTiming(0, {
          duration: TRANSITION_MS,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        opacity.value = withTiming(1, {
          duration: TRANSITION_MS,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
      }, TRANSITION_MS);
      return () => clearTimeout(t);
    }
  }, [phase, displayLen, idx, sentences, opacity, translateX]);

  // Reset everything when the sentences array changes identity (data refresh).
  React.useEffect(() => {
    setIdx(0);
    setDisplayLen(0);
    setPhase("typing");
    opacity.value = 1;
    translateX.value = 0;
  }, [sentences, opacity, translateX]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const current = sentences[idx] ?? "";
  const visible = current.slice(0, displayLen);

  return (
    <Animated.View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        },
        animStyle,
      ]}
    >
      <Text
        style={{
          ...type.body,
          color: palette.textMuted,
          textAlign: "center",
          letterSpacing: -0.1,
        }}
      >
        {visible}
      </Text>
      <Animated.View
        style={[
          {
            width: 2,
            height: 16,
            backgroundColor: palette.accent,
            marginLeft: 2,
            borderRadius: 1,
          },
          cursorStyle,
        ]}
      />
    </Animated.View>
  );
}
