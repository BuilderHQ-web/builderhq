/**
 * <Hero /> — screen-leading hero block.
 *
 * The standard composition for a screen's top section:
 *
 *   ┌─────────────────────────────────────────┐
 *   │  KICKER · CATEGORY                      │  (caption-size, accent)
 *   │                                         │
 *   │  Good morning,                          │  (display, system)
 *   │  Aryan.                                 │  (display, Instrument italic)
 *   │                                         │
 *   │  3 projects on the go.                  │  (body, muted)
 *   └─────────────────────────────────────────┘
 *
 * The split-line headline is THE BuilderHQ device: a non-italic system
 * font line followed by an Instrument Serif italic accent word. It's
 * the same pattern the landing uses ("Tender your build. In days.") so
 * the brand voice carries from web to mobile.
 *
 * Sizing:
 *   · `default`  — display (44px) on mobile
 *   · `large`    — displayLarge (64px) for full-bleed hero screens
 *
 * The hero is a static block (no scroll behavior of its own). Pair
 * with <ScreenHeader /> if you need iOS large-title-on-scroll.
 */
import * as React from "react";
import { Text, View, type TextStyle, type ViewStyle } from "react-native";

import { accentItalicGradient, fonts, palette, type } from "@/lib/theme";

interface Props {
  /** Tiny tracking caption above the headline. e.g. "Owner dashboard". */
  kicker?: string;
  /** The plain-text first line. e.g. "Good morning,". */
  title: string;
  /** The Instrument Serif italic second line. The accent word. */
  accent: string;
  /** Optional sub-line under the headline. */
  sub?: string;
  /** Larger headline for full-bleed hero screens. */
  size?: "default" | "large";
  style?: ViewStyle;
}

export function Hero({
  kicker,
  title,
  accent,
  sub,
  size = "default",
  style,
}: Props) {
  const typeStyle = size === "large" ? type.displayLarge : type.display;

  return (
    <View style={style}>
      {kicker ? (
        <Text
          style={{
            ...type.kicker,
            color: palette.accent,
            fontWeight: "600",
            marginBottom: 14,
          }}
        >
          {kicker}
        </Text>
      ) : null}

      {/* Headline. Two lines: plain title + Instrument Serif italic accent.
          The accent is its own Text so we can give it the italic face
          and the gradient color treatment (via overlay in v4.1; for
          v4.0 we use accent-light solid which still reads premium). */}
      <Text
        style={
          {
            ...typeStyle,
            color: palette.text,
            fontWeight: "500",
          } as TextStyle
        }
      >
        {title}
      </Text>
      <Text
        style={
          {
            ...typeStyle,
            fontFamily: fonts.displayItalic,
            // Italic accent color — the landing's gradient stops simplified
            // to a solid `accentLight` for native rendering parity. The
            // gradient overlay version can land later via MaskedView.
            color: accentItalicGradient[1],
            marginTop: -typeStyle.lineHeight * 0.04, // tighten the optical baseline
          } as TextStyle
        }
      >
        {accent}
      </Text>

      {sub ? (
        <Text
          style={{
            ...type.body,
            color: palette.textMuted,
            marginTop: 16,
            maxWidth: 320,
          }}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
