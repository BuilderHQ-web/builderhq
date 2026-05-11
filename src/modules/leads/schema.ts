/**
 * leads · drizzle schema.
 *
 * Inbound-interest captures from marketing landing pages — one table
 * shared across `/guide` (PDF download), `/estimate-request`, and any
 * future top-of-funnel surface. Per-flow extras (which guide variant,
 * postcode, scope text, etc.) live in the `meta` jsonb so we don't
 * churn the schema for every new acquisition page.
 *
 * The lead is owned by the landing page (not by a user) — these rows
 * are created without authentication, by people who don't yet have
 * BuilderHQ accounts. Admin views aggregate them under
 * `/admin/leads` (next).
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const leadKindEnum = pgEnum("lead_kind", [
  "guide_melbourne_build_brief",
  "estimate_request",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid().primaryKey().defaultRandom(),

    kind: leadKindEnum().notNull(),

    // Canonical identity captured by every form.
    firstName: text("first_name").notNull(),
    email: text().notNull(),
    phone: text(),

    // Attribution — utm_* params, referrer-derived source, etc.
    source: text(),

    // Audit (spot bot floods after the fact).
    ip: text(),
    userAgent: text("user_agent"),

    // Per-flow data we don't normalize. Caller-defined shape.
    meta: jsonb().notNull().default(sql`'{}'::jsonb`),

    // User-facing email send result. NULL = not sent yet, populated
    // on successful Resend response. delivery_error captures the
    // human-readable failure message for the admin "needs retry" view.
    deliveredAt: timestamp("delivered_at", { mode: "date", withTimezone: true }),
    deliveryError: text("delivery_error"),

    // Ops-notification (info@) email send result.
    opsNotifiedAt: timestamp("ops_notified_at", { mode: "date", withTimezone: true }),

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),

    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (t) => [
    index("leads_kind_created_at_idx").on(t.kind, t.createdAt),
    index("leads_email_idx").on(t.email),
  ],
);

export type LeadRow = typeof leads.$inferSelect;
export type LeadInsert = typeof leads.$inferInsert;
export type LeadKind = (typeof leadKindEnum.enumValues)[number];
