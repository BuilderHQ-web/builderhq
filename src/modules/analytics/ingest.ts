import "server-only";

/**
 * analytics/ingest — the only way an event row is written.
 *
 * A sibling entry point rather than part of the barrel, so `lib/db` is
 * never dragged into the schema-load chain. See users/index.ts.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

import { events, type NewAnalyticsEvent } from "./schema";

/** One request may not write more than this, whatever it claims. */
export const MAX_BATCH = 20;

/**
 * Write a batch.
 *
 * BEST EFFORT, ALWAYS. Measurement is the least important thing this
 * application does. A failure here is logged and swallowed, never
 * surfaced, and never retried in a way that could amplify an outage.
 */
export async function recordEvents(rows: NewAnalyticsEvent[]): Promise<number> {
  if (rows.length === 0) return 0;
  const capped = rows.slice(0, MAX_BATCH);
  try {
    await db.insert(events).values(capped);
    return capped.length;
  } catch (err) {
    logger.warn(
      {
        event: "analytics.write_failed",
        count: capped.length,
        msg: err instanceof Error ? err.message : String(err),
      },
      "could not record analytics events",
    );
    return 0;
  }
}
