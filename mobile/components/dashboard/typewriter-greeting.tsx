/**
 * <TypewriterGreeting /> — centered greeting hero.
 *
 *   Good afternoon,                ← muted system font
 *   SYNERGY                        ← minimalistic bold sans (heavy)
 *
 *   you have 1 live tender. ▌      ← live-update typewriter, cycles
 *
 * Type direction: characters appear left-to-right, smoothly.
 * Exit direction: characters fade away RIGHT-TO-LEFT via a horizontal
 * linear-gradient mask that sweeps from the right edge of the text to
 * the left edge. The text stays in place — only the gradient moves.
 *
 * Name typography: bold sans-serif (SF Pro Heavy on iOS / system bold
 * on Android), large size, tight letterspacing. Reads as confident
 * and minimal — replaces the Instrument Serif italic per feedback.
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
import { LinearGradient } from "expo-linear-gradient";

import { palette, type } from "@/lib/theme";

const TYPE_CHAR_MS = 28; // faster than before — smoother perceived flow
const HOLD_MS = 4500;
const EXIT_MS = 700;
const ENTER_MS = 300;

interface Props {
  /** "Good morning" / "Good afternoon" / "Good evening". */
  greeting: string;
  /** First-name or display-name for the bold name line. */
  name: string;
  /** Ordered sentences to cycle through. Must be non-empty. */
  sentences: readonly string[];
}

export function TypewriterGreeting({ greeting, name, sentences }: Props) {
  const safeSentences = sentences.length > 0 ? sentences : ["Welcome."];

  return (
    <View style={{ alignItems: "center" }}>
      {/* Greeting line — muted, system font */}
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

      {/* Name — minimalistic bold sans, big, tight tracking */}
      <Text
        style={{
          fontSize: 56,
          lineHeight: 62,
          color: palette.text,
          fontWeight: "800",
          letterSpacing: -1.6,
          textAlign: "center",
          marginTop: 2,
          // System font — SF Pro on iOS, Roboto on Android, at heavy weight.
        }}
      >
        {name}.
      </Text>

      {/* Typewriter live-update line — gradient-mask exit */}
      <View style={{ marginTop: 22, minHeight: 28 }}>
        <Typewriter sentences={safeSentences} />
      </View>
    </View>
  );
}

/**
 * Implements the type / hold / right-to-left-fade / enter cycle.
 * Pulled out so the static greeting block above doesn't re-render on
 * every keystroke tick.
 */
function Typewriter({ sentences }: { sentences: readonly string[] }) {
  const [idx, setIdx] = React.useState(0);
  const [displayLen, setDisplayLen] = React.useState(0);
  const [phase, setPhase] = React.useState<
    "typing" | "hold" | "exiting" | "entering"
  >("typing");
  const [textWidth, setTextWidth] = React.useState(0);

  // Mask sweep position — 0 = mask off-screen-right (text fully visible),
  // 1 = mask fully covering text from left.
  const maskProgress = useSharedValue(0);

  // Container opacity for the new-sentence entry fade.
  const containerOpacity = useSharedValue(1);

  // Blinking cursor during typing.
  const cursorOpacity = useSharedValue(1);

  // Reset cursor blink on phase change.
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
      const t = setTimeout(() => setPhase("exiting"), HOLD_MS);
      return () => clearTimeout(t);
    }

    if (phase === "exiting") {
      // Sweep the gradient mask from right to left, covering chars in
      // turn. Text stays in place — only the mask moves.
      maskProgress.value = 0;
      maskProgress.value = withTiming(1, {
        duration: EXIT_MS,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
      });
      const t = setTimeout(() => {
        // Move to next sentence: reset, fade container in.
        setIdx((i) => (i + 1) % sentences.length);
        setDisplayLen(0);
        maskProgress.value = 0;
        containerOpacity.value = 0;
        setPhase("entering");
        containerOpacity.value = withTiming(1, {
          duration: ENTER_MS,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
      }, EXIT_MS);
      return () => clearTimeout(t);
    }

    if (phase === "entering") {
      const t = setTimeout(() => setPhase("typing"), ENTER_MS);
      return () => clearTimeout(t);
    }
  }, [phase, displayLen, idx, sentences, maskProgress, containerOpacity]);

  // Reset on sentences array change.
  React.useEffect(() => {
    setIdx(0);
    setDisplayLen(0);
    setPhase("typing");
    maskProgress.value = 0;
    containerOpacity.value = 1;
  }, [sentences, maskProgress, containerOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  // The gradient mask sits on top of the text. It's an opaque-canvas-
  // colored panel that sweeps in from the right with a soft transparent
  // left edge — characters disappear right-to-left as the mask passes.
  const maskStyle = useAnimatedStyle(() => {
    if (textWidth === 0) {
      return { transform: [{ translateX: 0 }], opacity: 0 };
    }
    // Mask is wider than text so soft edge can extend off the left.
    // translateX(0) = mask covers entire text from left;
    // translateX(textWidth) = mask off-screen right (text fully visible).
    const tx = (1 - maskProgress.value) * textWidth;
    return {
      transform: [{ translateX: tx }],
      opacity: 1,
    };
  });

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
      {/* Text container — measures its own width so the mask can size
          and position relative to it. */}
      <View
        style={{ position: "relative" }}
        onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
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

        {/* Gradient mask overlay — sits over the text, animates left
            during exit. Uses the canvas color so the masked area
            blends seamlessly with the page background. */}
        {textWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: textWidth,
              },
              maskStyle,
            ]}
          >
            <LinearGradient
              colors={[
                "rgba(6, 8, 15, 0)", // soft transparent on the left
                "rgba(6, 8, 15, 0.5)",
                "rgba(6, 8, 15, 0.95)",
                "rgba(6, 8, 15, 1)", // fully opaque canvas on the right
              ]}
              locations={[0, 0.35, 0.7, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        ) : null}
      </View>

      {/* Blinking cursor — outside the masked area so it stays visible
          while typing. */}
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
