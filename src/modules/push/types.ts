/**
 * push · public types.
 *
 * Types used by both the push service and any dispatch caller. Kept
 * deliberately narrow — push payloads are simple by Expo's contract
 * (title + body + optional structured data + optional badge).
 */

/**
 * The shape we send to Expo's Push API. Maps 1:1 to the relevant
 * subset of ExpoPushMessage — we don't surface every field because
 * most defaults (sound, priority, channelId) are right for our
 * use case.
 */
export interface PushPayload {
  /** Bold first line in the notification banner. Keep under ~40 chars. */
  title: string;
  /** Plain body text. Renders as one or two lines on most platforms. */
  body: string;
  /**
   * Structured data the mobile app reads when the user TAPS the
   * notification. Used by the tap router in mobile/app/_layout.tsx
   * to decide which screen to push.
   *
   * Convention: include a `url` key holding an absolute in-app
   * route (e.g. "/(main)/messages/abc123") so the router can do a
   * single `router.push(data.url)` without any kind-specific code.
   */
  data?: Record<string, unknown>;
  /**
   * iOS badge count to set on the app icon. Optional — we generally
   * let the OS manage badges and only set this when we want a
   * cleared / explicit value (e.g. on a "mark all read" event).
   */
  badge?: number;
}

/**
 * Reasons we might skip sending — surfaced in the dispatcher's
 * return shape so the caller can log meaningfully. None of these
 * are errors; they're "expected non-deliveries."
 */
export type PushSkipReason =
  | "no_token"
  | "stale_token"
  | "self_send";

export interface PushSendResult {
  /** Total recipients we attempted. */
  attempted: number;
  /** Successfully accepted by Expo. */
  delivered: number;
  /** Recipients we skipped (no token / stale / self). */
  skipped: number;
  /**
   * Per-recipient skip reasons — handy for debugging "why didn't I
   * get a push?" without enabling debug-level logging. Not populated
   * in production (kept empty to avoid log bloat).
   */
  skipReasons?: Record<string, PushSkipReason>;
}
