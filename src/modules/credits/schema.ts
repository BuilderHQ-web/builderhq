/**
 * credits · drizzle schema.
 *
 * Houses Founding Builder Access (FBA) — the early-access perk that
 * gives qualifying builders 5 free unlocks every 30 days for a fixed
 * window (default: 3 months from grant). Used credits don't carry
 * over: any unused credit at the end of a 30-day cycle expires.
 *
 * Pricing for "regular" unlocks (no credits available) lives as a
 * static price-by-project-type table in modules/projects/pricing.ts.
 * Step 5b will wire the paid path through Stripe; for now the UI
 * shows the price + "coming soon" CTA when credits are exhausted.
 *
 * Schema:
 *   fba_grants — one row per (builder × time-window). A builder can
 *                receive multiple grants over time (e.g. extended
 *                after expiry). The "current" grant is the most
 *                recent active row. Cycles are derived: every 30
 *                days from start_at, until end_at.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/users";

// ── enums ────────────────────────────────────────────────────────────────

export const fbaSourceEnum = pgEnum("fba_source", [
  "founding",     // auto-granted during the founding window (≤ 31 May 2026, cap 100)
  "manual_admin", // granted by an admin override
]);

// ── fba_grants ───────────────────────────────────────────────────────────

export const fbaGrants = pgTable(
  "fba_grants",
  {
    id: uuid().primaryKey().defaultRandom(),
    builderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Window during which credits are available. Cycles tile from
     *  startAt every 30 days until endAt. */
    startAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    endAt: timestamp({ mode: "date", withTimezone: true }).notNull(),

    /** Free unlocks per 30-day cycle. Default 5. Stored per-grant so
     *  admin can grant "VIP" tiers later (e.g. 10/cycle) without a
     *  schema change. */
    monthlyQuota: integer().notNull().default(5),

    source: fbaSourceEnum().notNull().default("founding"),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Set when an admin pulls the grant early. Treated as "expired". */
    revokedAt: timestamp({ mode: "date", withTimezone: true }),
  },
  (t) => [
    // Hot path: "do you have an active grant right now?" lookup.
    index("fba_grants_builder_end_idx").on(t.builderId, t.endAt),
  ],
);

export type FbaGrantRow = typeof fbaGrants.$inferSelect;
export type FbaGrantInsert = typeof fbaGrants.$inferInsert;
