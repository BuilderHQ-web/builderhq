/**
 * users · drizzle schema.
 *
 * Single canonical user row. Owned by the `users` module. Other modules
 * reference users.id via foreign key (always with onDelete: "set null" or
 * "cascade" depending on whether the row is meaningful without an owner).
 *
 * Aligned with Auth.js v5's expected fields (id, name, email, emailVerified,
 * image) so the @auth/drizzle-adapter works out of the box. BuilderHQ
 * adds: role, status, password_hash, phone, stripe_customer_id, soft-delete,
 * last_seen_at.
 *
 * Role/status are stored as Postgres enums (typed in TS via the inferred
 * column types) — cheaper than CHECK constraints, easier to extend.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ── enums ────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", [
  "project_owner",
  "builder",
  "admin",
]);

export const userStatusEnum = pgEnum("user_status", [
  "pending_verification",
  "active",
  "suspended",
  "banned",
]);

// ── table ────────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),

    // Auth.js-compatible fields (snake_case in DB via drizzle.config casing).
    // `name` stays for OAuth providers that hand us a single display string;
    // app code prefers first_name + last_name and falls back to name.
    name: text(),
    email: text().notNull(),
    emailVerified: timestamp({ mode: "date", withTimezone: true }),
    image: text(),

    // BuilderHQ — identity.
    firstName: text(),
    lastName: text(),
    passwordHash: text(),
    role: userRoleEnum(),
    status: userStatusEnum().notNull().default("pending_verification"),
    phone: text(),
    stripeCustomerId: text(),

    // Acquisition attribution — write-once at signup, never mutated.
    // Useful for marketing analytics, not a privacy concern (no PII).
    signupSource: text(),
    signupCampaign: text(),

    // Marketing-class email gate. Default true; flipped by the
    // /unsubscribe/[token] one-click route or the settings toggle.
    // Operational emails (welcome, receipts, tender outcomes) ignore
    // this flag — only the bulk new-project blast respects it.
    marketingEmailsEnabled: boolean("marketing_emails_enabled")
      .notNull()
      .default(true),
    /**
     * Per-user opaque token for the unsubscribe URL. Generated lazily
     * on first marketing send and persisted thereafter — UNIQUE so the
     * unsubscribe page can locate the user from the URL alone (no
     * login needed, the token IS auth).
     */
    unsubscribeToken: uuid("unsubscribe_token"),

    // Activity & lifecycle.
    lastSeenAt: timestamp({ mode: "date", withTimezone: true }),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),

    // Soft delete — hard delete only via redact_user() on GDPR/Privacy Act
    // erasure requests. Day-to-day "delete" sets this column.
    deletedAt: timestamp({ mode: "date", withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    uniqueIndex("users_stripe_customer_unique").on(t.stripeCustomerId),
    uniqueIndex("users_unsubscribe_token_unique").on(t.unsubscribeToken),
    index("users_role_idx").on(t.role),
    index("users_status_idx").on(t.status),
    index("users_created_at_idx").on(t.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
