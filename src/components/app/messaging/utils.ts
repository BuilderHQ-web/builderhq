/**
 * Messaging time helpers.
 *
 * Kept tiny (no date-fns) so the chat bundle stays light.
 */

/** "Today" / "Yesterday" / "Wed, 8 May" / "8 May 2024". */
export function dayLabel(d: Date): string {
  const now = new Date();
  const a = new Date(d);
  const sameDay = (x: Date, y: Date) =>
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate();
  if (sameDay(a, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(a, yesterday)) return "Yesterday";
  const sameYear = a.getFullYear() === now.getFullYear();
  return a.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "9:42 am" / "11:08 pm" — compact 12h clock for message bubbles. */
export function clockLabel(d: Date): string {
  const a = new Date(d);
  return a
    .toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
}

/** "now" / "9m" / "2h" / "yesterday" / "8 May" — compact preview ts. */
export function previewLabel(d: Date | string | null): string {
  if (!d) return "";
  const t = new Date(d).getTime();
  const ms = Date.now() - t;
  const s = Math.round(ms / 1000);
  if (s < 45) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const dY = new Date(t);
  const now = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (
    dY.getFullYear() === yest.getFullYear() &&
    dY.getMonth() === yest.getMonth() &&
    dY.getDate() === yest.getDate()
  ) {
    return "yesterday";
  }
  const sameYear = dY.getFullYear() === now.getFullYear();
  return dY.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "2-digit" }),
  });
}

/**
 * Heuristic for visual message grouping. Two consecutive messages from
 * the same sender within this window collapse into a single visual run
 * (no avatar repeat, no time stamp on the inner bubble).
 */
export const GROUP_WINDOW_MS = 4 * 60 * 1000;
