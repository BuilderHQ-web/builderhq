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
  // Cold-outreach confirmation from architects whose planning permit
  // applications appeared on PlanningAlerts (Moonee Valley + Merri-bek
  // pilot). Per-form specifics ride in the `meta` jsonb column.
  "architect_tender",
  // "Book a call" Google Ads funnel — owner requests a 15-min intro
  // call to get matched with builders. Project type / suburb / state /
  // timeline ride in the `meta` jsonb column.
  "book_call",
  // Owner Advisory Program (/owneradvisory) — homeowner requests
  // independent advisory on their tender. project_type / suburb / stage
  // ride in the `meta` jsonb column; first name + mobile are top-level.
  "owner_advisory",
  // Preferred Partner network interest — architects / finance brokers
  // registering via the landing "Join the network" CTAs. Firm name lands
  // in practice_name; state + website ride in the `meta` jsonb. No
  // project is attached (these are practitioners, not project owners).
  "partner_architect_interest",
  "partner_finance_interest",
  // Homeowner asking BuilderHQ for a Preferred Partner introduction
  // (architect, finance broker, or both) via the landing network CTA.
  // The need + state ride in the `meta` jsonb.
  "partner_intro_request",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid().primaryKey().defaultRandom(),

    kind: leadKindEnum().notNull(),

    // Canonical identity captured by every form.
    firstName: text("first_name").notNull(),
    /**
     * Surname — populated for forms that collect it (architect_tender,
     * estimate_request). NULL for the guide flow which only asks for
     * a first name. Lifted out of `meta` so admin queries don't have
     * to JSON-path through to search by family name.
     */
    lastName: text("last_name"),
    email: text().notNull(),
    phone: text(),

    /**
     * Architect / company / practice the lead is associated with.
     * Currently populated by architect_tender; estimate_request also
     * captures a "company" field that lands here. NULL otherwise.
     */
    practiceName: text("practice_name"),

    /**
     * Project street address — the pivot column for /architect-tender.
     * Used for dedupe ("did we already onboard 67 Bowes Avenue?"),
     * cross-reference against the original PlanningAlerts entry, and
     * the admin list-view's primary sort key. Indexed case-insensitively
     * (see migration 0021). NULL for lead kinds that don't capture an
     * address (guide download, estimate request).
     */
    projectAddress: text("project_address"),

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
