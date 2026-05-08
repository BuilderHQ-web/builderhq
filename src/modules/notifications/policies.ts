/**
 * notifications · policies.
 *
 * Notifications are per-user — the only meaningful access check is
 * "is this row mine?". Reading the feed and marking read both gate
 * on the same predicate. Creation isn't user-driven — it happens
 * inside service code reacting to events, so there's no `canCreate`.
 */

import type { NotificationRow } from "./schema";

/** Owner-only: a user may read their own notifications. */
export function canRead(actorId: string, n: NotificationRow): boolean {
  return n.userId === actorId;
}

/** Same predicate as read — marking-read is just a write to your own row. */
export function canMarkRead(actorId: string, n: NotificationRow): boolean {
  return n.userId === actorId;
}
