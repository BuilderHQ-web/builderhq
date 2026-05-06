/**
 * auth · drizzle schema.
 *
 * Tables owned by Auth.js v5 (accounts, sessions, verification_tokens).
 * Shape matches the @auth/drizzle-adapter defaults so the adapter wires
 * up with zero column-name overrides.
 *
 * The `users` table itself lives in @/modules/users — auth references it
 * via foreign key but doesn't own the row. Cascade-delete: removing a user
 * removes their sessions and OAuth accounts.
 *
 *   accounts            — OAuth provider links (one user can have many)
 *   sessions            — DB-backed sessions (chosen over JWT so we can
 *                         force-logout, ban, role-change cleanly)
 *   verification_tokens — used for: email verification, magic links,
 *                         password reset. Composite PK by (identifier, token)
 *                         lets one identifier have multiple in-flight tokens.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { users } from "@/modules/users";

// NOTE: TS property names match what @auth/drizzle-adapter expects
// (snake_case for OAuth fields, camelCase for the few it spells that way).
// The DB column names are unchanged — drizzle's casing config maps them.
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(), // "oauth" | "oidc" | "email" | "credentials"
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: text(),
    scope: text(),
    id_token: text(),
    session_state: text(),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_id_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp({ mode: "date", withTimezone: true }).notNull(),
    // Audit trail — populated by the Auth.js callback. Lets admins see
    // where a session was created from when investigating a compromised
    // account. Optional today; we'll backfill in Phase 1 callbacks.
    ip: text(),
    userAgent: text(),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;
