/**
 * Haptic feedback — wraps expo-haptics in a tiny semantic API so callers
 * write `haptics.tap()` instead of remembering ImpactFeedbackStyle.
 *
 * Why every premium app does this: a haptic tied to a meaningful state
 * change (button tap, success toast, error shake) is the strongest
 * "this feels good" signal you can ship. The cost is near zero — iOS
 * Taptic Engine + Android vibration patterns both ship with the OS.
 *
 * Use sparingly. Hapticking every minor touch fatigues the wrist within
 * a session and the user starts ignoring them, so reserve them for:
 *   · tap()     — light, on primary actions (CTA press)
 *   · select()  — medium, on selection changes (tab switch, pick option)
 *   · impact()  — heavy, on decisive moments (commit / publish / award)
 *   · success() — notification, after async resolves green
 *   · warning() — notification, on recoverable errors
 *   · error()   — notification, on hard failures
 *
 * Silenced automatically on Web (Expo's `web` target) and on devices
 * without the Taptic Engine — the underlying calls no-op there.
 */
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const noop = async () => {};

const enabled = Platform.OS === "ios" || Platform.OS === "android";

export const haptics = {
  tap: enabled
    ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    : noop,
  select: enabled
    ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    : noop,
  impact: enabled
    ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    : noop,
  rigid: enabled
    ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
    : noop,
  soft: enabled
    ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
    : noop,
  success: enabled
    ? () =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : noop,
  warning: enabled
    ? () =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    : noop,
  error: enabled
    ? () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    : noop,
  /** Soft selection click — for picker scrolls, slider notches, etc. */
  pulse: enabled ? () => Haptics.selectionAsync() : noop,
} as const;

export type HapticKind = keyof typeof haptics;
