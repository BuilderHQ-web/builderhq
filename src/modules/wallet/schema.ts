/**
 * wallet · drizzle schema.
 *
 * Account credit in whole Australian dollars. Named `wallet` because
 * `modules/credits` is already taken by Founding Builder Access, which
 * counts free unlocks per 30-day cycle rather than money and is being
 * retired. The two must not be conflated: FBA grants ATTEMPTS, this
 * grants VALUE.
 *
 * Two tables, because a balance you can edit is a balance you can lose:
 *
 *   credit_grants      — what was given, and when it stops counting
 *   credit_redemptions — what was spent, and against which grant
 *
 * The balance is always derived. See service.balanceFor.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";
import { unlocks } from "@/modules/unlocks/schema";

// ── credit_grants ────────────────────────────────────────────────────

export const creditGrants = pgTable(
  "credit_grants",
  {
    id: uuid().primaryKey().defaultRandom(),
    builderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Whole AUD dollars, matching payments.amountAud. Always positive. */
    amountAud: integer().notNull(),

    /**
     * Machine key for the cohort this grant belongs to, so a batch can
     * be found later without parsing prose.
     */
    reason: text().notNull(),

    /** The sentence the builder reads on their dashboard. */
    note: text(),

    /** Null when a script issued it rather than a person. */
    grantedBy: uuid().references(() => users.id, { onDelete: "set null" }),

    grantedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp({ mode: "date", withTimezone: true }).notNull(),

    /**
     * Stamped when the builder dismisses the announcement. Null means
     * they have not been told, which is exactly what drives the card.
     */
    acknowledgedAt: timestamp({ mode: "date", withTimezone: true }),

    /** Pulled early by an admin. Treated exactly like expired. */
    revokedAt: timestamp({ mode: "date", withTimezone: true }),
  },
  (t) => [index("credit_grants_builder_expiry_idx").on(t.builderId, t.expiresAt)],
);

// ── credit_redemptions ───────────────────────────────────────────────

export const creditRedemptions = pgTable(
  "credit_redemptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    grantId: uuid()
      .notNull()
      .references(() => creditGrants.id, { onDelete: "cascade" }),

    /** Denormalised from the grant so a balance never needs the join. */
    builderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Whole AUD dollars. Positive; the sign lives in the table name. */
    amountAud: integer().notNull(),

    /**
     * What it bought. Set null rather than cascade: if the project or
     * the unlock is removed the money was still spent, and a ledger
     * that forgets a debit is worse than one with a dangling label.
     */
    projectId: uuid().references(() => projects.id, { onDelete: "set null" }),
    unlockId: uuid().references(() => unlocks.id, { onDelete: "set null" }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("credit_redemptions_grant_idx").on(t.grantId),
    index("credit_redemptions_builder_idx").on(t.builderId, t.createdAt),
    // One unlock is funded once. Without this a retried request could
    // debit the same unlock twice.
    uniqueIndex("credit_redemptions_unlock_grant_idx")
      .on(t.unlockId, t.grantId)
      .where(sql`${t.unlockId} is not null`),
  ],
);

export type CreditGrantRow = typeof creditGrants.$inferSelect;
export type CreditGrantInsert = typeof creditGrants.$inferInsert;
export type CreditRedemptionRow = typeof creditRedemptions.$inferSelect;
export type CreditRedemptionInsert = typeof creditRedemptions.$inferInsert;
