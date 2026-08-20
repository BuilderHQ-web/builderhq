import "server-only";

/**
 * users/attribution — where an account came from, written once.
 *
 * A sibling entry point rather than part of the main barrel, for the
 * same reason `account.ts` is: other modules' schema files import the
 * `users` table from the barrel, so anything the barrel re-exports gets
 * pulled into the schema-load chain and takes `lib/db` with it. See the
 * long comment in users/index.ts.
 *
 * One caller today: the signup action, which reads the visitor's own
 * attribution cookie on the server and hands it over here.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Attribution } from "@/lib/attribution";

import { userAttribution } from "./schema";

/** Postgres will reject a bad timestamp; an unparseable one is no date. */
function asDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Record how this account arrived.
 *
 * BEST EFFORT, ALWAYS. Attribution is analytics. An account being
 * created is the thing that matters, and no failure here may ever
 * interfere with it, so this swallows its own errors and logs them.
 *
 * Idempotent: a retried signup overwrites rather than throwing on the
 * primary key.
 */
export async function recordSignupAttribution(
  userId: string,
  a: Attribution,
): Promise<void> {
  if (!a.aid && !a.first && !a.last) return;
  const row = {
    userId,
    anonId: a.aid ?? null,
    firstSource: a.first?.source ?? null,
    firstMedium: a.first?.medium ?? null,
    firstCampaign: a.first?.campaign ?? null,
    firstContent: a.first?.content ?? null,
    firstTerm: a.first?.term ?? null,
    firstReferrer: a.first?.referrer ?? null,
    firstLanding: a.first?.landing ?? null,
    firstAt: asDate(a.first?.at),
    lastSource: a.last?.source ?? null,
    lastMedium: a.last?.medium ?? null,
    lastCampaign: a.last?.campaign ?? null,
    lastContent: a.last?.content ?? null,
    lastTerm: a.last?.term ?? null,
    lastReferrer: a.last?.referrer ?? null,
    lastLanding: a.last?.landing ?? null,
    lastAt: asDate(a.last?.at),
    gclid: a.gclid ?? null,
    fbclid: a.fbclid ?? null,
  };
  try {
    await db
      .insert(userAttribution)
      .values(row)
      .onConflictDoUpdate({ target: userAttribution.userId, set: row });
  } catch (err) {
    logger.warn(
      {
        event: "attribution.write_failed",
        userId,
        msg: err instanceof Error ? err.message : String(err),
      },
      "could not record signup attribution",
    );
  }
}
