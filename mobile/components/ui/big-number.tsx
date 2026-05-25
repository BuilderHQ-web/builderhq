/**
 * <BigNumber /> — the hero numeric display.
 *
 * Premium apps make numbers the focal point: Revolut's balance, Strava's
 * distance, Robinhood's portfolio value. This is BuilderHQ's hero
 * numeric — used for:
 *   · Dashboard hero ("3 tenders to review")
 *   · Tender comparison best price ("$1,780,000")
 *   · Builder unlock count ("12 unlocks remaining")
 *
 * Behavior:
 *   · Counts up from 0 to target on mount over 900ms (easeOutSoft).
 *   · Subsequent value changes are NOT re-animated by default — just
 *     snap. Set `animateOnChange` to opt in if it makes sense (e.g.
 *     a live ticker).
 *   · Tabular nums via the system font's native tabular feature.
 *
 * Variants by size (sets fontSize + lineHeight via the theme `type`):
 *   · sm — `numeric` (17px)
 *   · md — `numericLarge` (32px)
 *   · lg — `numericHero` (56px) — for true hero moments
 *
 * Currency formatting:
 *   Pass `currency="AUD"` to format as Australian dollars with $ prefix
 *   and en-AU thousands separators. For non-currency counts, omit.
 */
import * as React from "react";
import { Text, type TextStyle } from "react-native";
import {
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { runOnJS } from "react-native-reanimated";

import { ease } from "@/lib/motion";
import { palette, type } from "@/lib/theme";

type Size = "sm" | "md" | "lg";

interface Props {
  /** Target value to display. */
  value: number;
  /** "AUD" formats as currency; omit for plain integer. */
  currency?: "AUD";
  /** Force-pin to a fixed scale. Defaults `md`. */
  size?: Size;
  /** Override text color. Defaults to `palette.text`. */
  color?: string;
  /** Replay the count-up on every value change. Default false. */
  animateOnChange?: boolean;
  style?: TextStyle;
}

const SIZE_TYPE: Record<Size, { fontSize: number; lineHeight: number }> = {
  sm: type.numeric,
  md: type.numericLarge,
  lg: type.numericHero,
};

const COUNT_DURATION = 900;

export function BigNumber({
  value,
  currency,
  size = "md",
  color = palette.text,
  animateOnChange = false,
  style,
}: Props) {
  const sharedValue = useSharedValue(0);
  const [display, setDisplay] = React.useState(0);
  const hasMounted = React.useRef(false);

  React.useEffect(() => {
    if (hasMounted.current && !animateOnChange) {
      // Subsequent updates snap unless caller opted in.
      sharedValue.value = value;
      setDisplay(value);
      return;
    }
    hasMounted.current = true;
    sharedValue.value = withTiming(value, {
      duration: COUNT_DURATION,
      easing: ease.easeOutSoft,
    });
  }, [value, animateOnChange, sharedValue]);

  useAnimatedReaction(
    () => sharedValue.value,
    (current) => {
      runOnJS(setDisplay)(Math.floor(current));
    },
  );

  const typeStyle = SIZE_TYPE[size];
  const formatted = formatValue(display, currency);

  return (
    <Text
      // Tabular nums via fontVariant so all digits share the same
      // advance width — the price column doesn't shimmy as digits
      // animate.
      style={[
        {
          ...typeStyle,
          color,
          fontVariant: ["tabular-nums"],
          fontWeight: "600",
        } as TextStyle,
        style,
      ]}
    >
      {formatted}
    </Text>
  );
}

function formatValue(n: number, currency?: "AUD"): string {
  if (currency === "AUD") {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return new Intl.NumberFormat("en-AU").format(n);
}
