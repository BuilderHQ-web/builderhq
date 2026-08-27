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
  // Architects and building designers who run tenders on behalf of
  // clients. Appended last: pg ALTER TYPE ADD VALUE appends safely,
  // reordering an existing enum is a table rewrite.
  "architect",
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

    /**
     * Single-use claim token for migrated accounts. NULL for normal
     * sign-ups. When set, the user can hit /claim/<token> to set their
     * first password (Bubble bcrypt hashes can't migrate). Cleared on
     * successful claim. Expires in 90 days; re-issued by admin if a
     * user contacts support after that.
     */
    claimToken: uuid("claim_token"),
    claimTokenExpiresAt: timestamp("claim_token_expires_at", {
      mode: "date",
      withTimezone: true,
    }),

    /**
     * Legacy migration breadcrumbs. `legacy_source = 'bubble'` for
     * imported users. `legacy_bubble_id` is the Bubble unique-id so
     * the migration scripts stay idempotent + admin can answer
     * "where did this user come from?" questions.
     */
    legacyBubbleId: text("legacy_bubble_id"),
    legacySource: text("legacy_source"),

    /**
     * Expo push notification token for the user's most recent mobile
     * device. Single-device for now — last-registered wins. When users
     * start running BuilderHQ on multiple devices (phone + tablet) we
     * promote this to a separate `user_devices` table keyed on
     * (user_id, expo_push_token) so notifications fan out to all
     * registered devices. NULL = no mobile app session registered.
     */
    expoPushToken: text("expo_push_token"),
    expoPushTokenUpdatedAt: timestamp("expo_push_token_updated_at", {
      mode: "date",
      withTimezone: true,
    }),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    uniqueIndex("users_stripe_customer_unique").on(t.stripeCustomerId),
    uniqueIndex("users_unsubscribe_token_unique").on(t.unsubscribeToken),
    index("users_role_idx").on(t.role),
    index("users_status_idx").on(t.status),
    index("users_created_at_idx").on(t.createdAt),
    // claimToken / legacyBubbleId indexes live as partial unique
    // constraints in migration 0015 (Drizzle can't express partial
    // indexes inline yet — the DB has them, this code-side declaration
    // is informational).
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * user_attribution · where an account came from, in full.
 *
 * `users.signupSource` and `users.signupCampaign` stay where they are:
 * two columns, last touch, written at signup, and read by code that
 * already exists. This table is the complete record beside them.
 *
 * WHY IT IS SEPARATE. Attribution belongs to the visitor before it
 * belongs to the account. It is collected over days by somebody with no
 * user row at all, and it is analytics rather than identity, so it does
 * not earn a dozen columns on the table every request in the product
 * reads. Deleting the account deletes it.
 *
 * WHY FIRST AND LAST. Reporting on one of them alone is how a channel
 * gets defunded for another channel's work: last touch hands every
 * delayed conversion to search, first touch hands every one of them to
 * the advertisement, and the truth is that both did a job. Keeping the
 * pair means the analysis can choose rather than the schema deciding.
 *
 * `anonId` is the join to pre-signup behaviour: the same id the events
 * pipeline stamps on every page view and demo beat before anybody has
 * an account.
 */
export const userAttribution = pgTable(
  "user_attribution",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),

    /** First-party anonymous id, from the visitor's own cookie. */
    anonId: text("anon_id"),

    // The campaign that introduced us. Written once, never updated.
    firstSource: text("first_source"),
    firstMedium: text("first_medium"),
    firstCampaign: text("first_campaign"),
    firstContent: text("first_content"),
    firstTerm: text("first_term"),
    firstReferrer: text("first_referrer"),
    firstLanding: text("first_landing"),
    firstAt: timestamp("first_at", { mode: "date", withTimezone: true }),

    // The campaign that closed. Rewritten by any later campaign visit.
    lastSource: text("last_source"),
    lastMedium: text("last_medium"),
    lastCampaign: text("last_campaign"),
    lastContent: text("last_content"),
    lastTerm: text("last_term"),
    lastReferrer: text("last_referrer"),
    lastLanding: text("last_landing"),
    lastAt: timestamp("last_at", { mode: "date", withTimezone: true }),

    /** The platforms' own join keys, kept so their reports can be checked. */
    gclid: text("gclid"),
    fbclid: text("fbclid"),

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("user_attribution_anon_idx").on(t.anonId),
    index("user_attribution_first_campaign_idx").on(t.firstCampaign),
    index("user_attribution_last_campaign_idx").on(t.lastCampaign),
  ],
);

export type UserAttribution = typeof userAttribution.$inferSelect;
export type NewUserAttribution = typeof userAttribution.$inferInsert;
