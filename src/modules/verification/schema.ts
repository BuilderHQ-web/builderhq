/**
 * verification · drizzle schema.
 *
 * Single audit table — one row per verification attempt against an
 * external register (ABR, VBA, future: QBCC, NSW Fair Trading, etc.).
 * Retries become new rows, each archiving the full provider response.
 *
 * The field-lock check reads from this table: if a verified row
 * exists for a builder's CURRENT subject_value (the ABN / licence
 * number they have on their profile), the corresponding field is
 * locked. Changing the input → no matching verified row → no lock →
 * editable again, with a re-verify CTA in the UI.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "@/modules/users";

export const verificationKindEnum = pgEnum("verification_kind", [
  "abn",
  "licence",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending", // request in flight (rare — most calls are sync)
  "verified", // provider confirmed match + active
  "mismatch", // provider has the record but data doesn't line up
  "inactive", // provider has it, but it's cancelled / expired / not current
  "not_found", // provider doesn't have it
  "error", // provider errored or unreachable
]);

export const builderVerifications = pgTable(
  "builder_verifications",
  {
    id: uuid().primaryKey().defaultRandom(),

    builderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    kind: verificationKindEnum().notNull(),

    /** Licence id for kind='licence'; NULL for kind='abn'. No FK on
     *  purpose — keeps audit history if the licence is later removed. */
    targetId: uuid(),

    /** The input that was checked. Lock comparison happens on this:
     *  if profile.abn === verifications.subject_value && status='verified'
     *  → ABN field is locked. */
    subjectValue: text().notNull(),

    status: verificationStatusEnum().notNull(),

    /** Adapter that performed the check — 'abr', 'vba', etc. Lets us
     *  add new state authorities later without schema changes. */
    provider: text().notNull(),

    /** Full archived response from the provider, for compliance +
     *  disputes. */
    providerResponse: jsonb(),

    /** Denormalised for cheap UI reads — entity / holder / company name. */
    matchedName: text(),

    /** When the underlying credential expires (licences). Null for ABN. */
    expiresAt: timestamp({ mode: "date", withTimezone: true }),

    /** Human-readable reason — only set for non-verified statuses. */
    reason: text(),

    verifiedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),

    /** When this verification result is no longer trusted. Future
     *  cron sweeps + nudges builders to re-verify. */
    ttlAt: timestamp({ mode: "date", withTimezone: true }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("builder_verifications_builder_kind_idx").on(
      t.builderId,
      t.kind,
      t.verifiedAt,
    ),
    index("builder_verifications_target_idx").on(t.targetId, t.verifiedAt),
    check(
      "builder_verifications_target_consistent",
      sql`(${t.kind} = 'abn' AND ${t.targetId} IS NULL) OR (${t.kind} = 'licence' AND ${t.targetId} IS NOT NULL)`,
    ),
  ],
);

export type BuilderVerificationRow = typeof builderVerifications.$inferSelect;
export type BuilderVerificationInsert =
  typeof builderVerifications.$inferInsert;
