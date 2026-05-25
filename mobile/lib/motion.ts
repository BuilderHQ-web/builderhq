/**
 * Motion presets — five named curves, four durations.
 *
 * Why named instead of inline:
 *   · Every spring-bounce inline is a chance to introduce a different
 *     curve and dilute the system. Naming them forces consistency.
 *   · Premium apps have ONE motion personality. Linear feels like
 *     Linear because every transition reads from the same easing
 *     library. We're doing the same.
 *
 * Use:
 *   · `easeOut`     — default for anything that fades / translates in
 *   · `easeOutSoft` — premium slide-ins, sheet expansions
 *   · `easeInOut`   — symmetric transitions (open/close)
 *   · `spring`      — celebration ONLY (moment animations)
 *   · `linear`      — ticking timers / progress bars
 *
 * Durations:
 *   · `fast`        — 180ms — interactive feedback (press, toggle)
 *   · `base`        — 320ms — most screen-level transitions
 *   · `slow`        — 500ms — sheet open, modal in
 *   · `celebrate`   — 1200ms — moment animations (Strava-style)
 *
 * For Reanimated worklets we re-export the timing helpers tuned to
 * these durations + curves — call sites get `t.base`, `t.slow`, etc.
 */

import { Easing, type WithTimingConfig } from "react-native-reanimated";

import { curves, durations } from "./theme";

export { curves, durations };

/** Reanimated Easing functions matching our named curves. */
export const ease = {
  easeOut: Easing.bezier(...curves.easeOut),
  easeOutSoft: Easing.bezier(...curves.easeOutSoft),
  easeInOut: Easing.bezier(...curves.easeInOut),
  spring: Easing.bezier(...curves.spring),
  linear: Easing.linear,
} as const;

/** Pre-built `withTiming` configs. Reduces boilerplate at call sites. */
export const timing: Record<
  "fast" | "base" | "slow" | "celebrate",
  WithTimingConfig
> = {
  fast: { duration: durations.fast, easing: ease.easeOut },
  base: { duration: durations.base, easing: ease.easeOutSoft },
  slow: { duration: durations.slow, easing: ease.easeOutSoft },
  celebrate: { duration: durations.celebrate, easing: ease.spring },
};

/**
 * Motion (react-native-reanimated) transition presets for use with
 * `entering` and `exiting` props on Animated.View.
 *
 * Example:
 *   <Animated.View entering={FadeInUp.duration(durations.base).easing(ease.easeOutSoft)}>
 *
 * Most callers just pull `transitions.fadeUp.base` etc.
 */
