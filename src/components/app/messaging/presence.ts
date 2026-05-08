/**
 * Presence heuristics for messaging.
 *
 * No real-time presence yet (would need a websocket or a polling
 * presence ping). This is a best-effort approximation using each
 * participant's `last_read_at` timestamp on the conversation row.
 *
 * If the other party has read the conversation in the last
 * `RECENTLY_ACTIVE_MS` window, we render an "active" dot. Otherwise
 * nothing — better to be silent than wrong.
 */

const RECENTLY_ACTIVE_MS = 5 * 60 * 1000; // 5 minutes

export function isRecentlyActive(at: Date | string | null | undefined): boolean {
  if (!at) return false;
  const t = typeof at === "string" ? new Date(at).getTime() : at.getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < RECENTLY_ACTIVE_MS;
}
