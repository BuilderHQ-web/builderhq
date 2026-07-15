/**
 * push · schema.
 *
 * Native device registry. One row per device TOKEN — a user signing
 * in on a second phone gets a second row, and a phone changing hands
 * (new sign-in on the same device) moves its token row to the new
 * user via upsert-on-token rather than duplicating it.
 *
 * Supersedes the single-device `users.expo_push_token` column pair,
 * which stays in place until the legacy Expo wrap is retired — the
 * send layer fans out over BOTH stores during the transition.
 *
 *   platform — where the app runs (ios | android)
 *   provider — which push network the token belongs to
 *              (apns | fcm | expo)
 *
 * `last_seen_at` doubles as the freshness stamp: clients re-register
 * on every cold start, so anything stale past the send layer's
 * 30-day window is treated as an uninstall we missed.
 */

import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/users";

export const pushPlatformEnum = pgEnum("push_platform", ["ios", "android"]);
export const pushProviderEnum = pgEnum("push_provider", [
  "apns",
  "fcm",
  "expo",
]);

export const userDevices = pgTable(
  "user_devices",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: pushPlatformEnum().notNull(),
    provider: pushProviderEnum().notNull(),
    /** Raw provider token (APNs hex, FCM registration id, Expo token). */
    token: text().notNull().unique(),
    /** Free-text client label (e.g. "Pixel 9 Pro"). Nullable. */
    deviceLabel: text(),
    /** Bumped on every re-registration — the freshness stamp. */
    lastSeenAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .default(sql`now()`),
    /**
     * Set on sign-out (that device) and when the provider reports the
     * token permanently dead. Revoked rows are skipped at send time
     * and resurrected by re-registration (revoked_at → NULL).
     */
    revokedAt: timestamp({ mode: "date", withTimezone: true }),
  },
  (t) => [index("user_devices_user_id_idx").on(t.userId)],
);

export type UserDevice = typeof userDevices.$inferSelect;
