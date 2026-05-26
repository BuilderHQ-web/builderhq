/**
 * <TypewriterGreeting /> — centered greeting hero.
 *
 *   Good afternoon,                ← muted system font
 *   Synergy.                       ← minimalistic bold sans
 *
 *   4 new updates since login ▌   ← live-update typewriter
 *
 * Implementation v3 — the mask overlay approach in v2 left visible
 * dark band artifacts (the canvas-color fill was painting over the
 * ambient gradient and reading as a darker rectangle behind the text).
 * v3 drops the mask entirely. The exit animation is a simple
 * character-by-character delete from the right at the same speed as
 * typing — produces a "vanishes into atmosphere from the right" feel
 * without any overlay layer.
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

import { palette, type } from "@/lib/theme";

const TYPE_CHAR_MS = 28; // typing speed per char
const ERASE_CHAR_MS = 18; // exit speed (a touch faster than typing)
const HOLD_MS = 4500;
const ENTER_MS = 280;

interface Props {
  greeting: string;
  name: string;
  sentences: readonly string[];
}

export function TypewriterGreeting({ greeting, name, sentences }: Props) {
  const safeSentences = sentences.length > 0 ? sentences : ["Welcome."];

  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{
          ...type.title,
          color: palette.textMuted,
          fontWeight: "400",
          textAlign: "center",
          letterSpacing: -0.2,
          fontSize: 22,
        }}
      >
        {greeting},
      </Text>
      <Text
        style={{
          fontSize: 56,
          lineHeight: 62,
          color: palette.text,
          fontWeight: "800",
          letterSpacing: -1.6,
          textAlign: "center",
          marginTop: 2,
        }}
      >
        {name}.
      </Text>

      <View style={{ marginTop: 22, minHeight: 28 }}>
        <Typewriter sentences={safeSentences} />
      </View>
    </View>
  );
}

function Typewriter({ sentences }: { sentences: readonly string[] }) {
  const [idx, setIdx] = React.useState(0);
  const [displayLen, setDisplayLen] = React.useState(0);
  const [phase, setPhase] = React.useState<
    "typing" | "hold" | "erasing" | "entering"
  >("typing");

  const containerOpacity = useSharedValue(1);
  const cursorOpacity = useSharedValue(1);

  // Cursor blink while typing.
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

  // Phase machine.
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
      setPhase("hold");
      return;
    }

    if (phase === "hold") {
      const t = setTimeout(() => setPhase("erasing"), HOLD_MS);
      return () => clearTimeout(t);
    }

    if (phase === "erasing") {
      if (displayLen > 0) {
        const t = setTimeout(
          () => setDisplayLen((d) => d - 1),
          ERASE_CHAR_MS,
        );
        return () => clearTimeout(t);
      }
      // Fully erased — fade container, advance to next sentence.
      containerOpacity.value = withTiming(0, { duration: 120 });
      const t = setTimeout(() => {
        setIdx((i) => (i + 1) % sentences.length);
        containerOpacity.value = withTiming(1, {
          duration: ENTER_MS,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        setPhase("entering");
      }, 120);
      return () => clearTimeout(t);
    }

    if (phase === "entering") {
      const t = setTimeout(() => setPhase("typing"), ENTER_MS);
      return () => clearTimeout(t);
    }
  }, [phase, displayLen, idx, sentences, containerOpacity]);

  // Reset if sentences identity changes (data refetch).
  React.useEffect(() => {
    setIdx(0);
    setDisplayLen(0);
    setPhase("typing");
    containerOpacity.value = 1;
  }, [sentences, containerOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
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
          gap: 4,
        },
        containerStyle,
      ]}
    >
      <Text
        style={{
          ...type.body,
          color: palette.textMuted,
          textAlign: "center",
          letterSpacing: -0.05,
          fontWeight: "500",
          fontSize: 15.5,
        }}
      >
        {visible}
      </Text>
      <Animated.View
        style={[
          {
            width: 2,
            height: 17,
            backgroundColor: palette.accent,
            borderRadius: 1,
          },
          cursorStyle,
        ]}
      />
    </Animated.View>
  );
}
