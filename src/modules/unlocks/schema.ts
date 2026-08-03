/**
 * unlocks · drizzle schema.
 *
 * Two tables:
 *
 *   unlocks         — record of a builder committing to view a project's
 *                     full details (exact address, owner contact,
 *                     downloadable docs). One per (builder, project).
 *                     The `source` column tracks how the unlock was
 *                     paid: free during launch, founding-builder credit,
 *                     or eventually a Stripe charge in step 5.
 *
 *   saved_projects  — bookmark. A builder marking a project for later
 *                     ("interested but not committing yet"). Cheap,
 *                     reversible, doesn't reveal anything private.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";

// ── enums ────────────────────────────────────────────────────────────────

/**
 * How an unlock was authorised.
 *
 *   free      — free for everyone during launch (current default)
 *   founding  — founding-builder monthly credit consumed
 *   paid      — Stripe payment intent settled (step 5)
 *   admin     — granted manually by admin override
 *   invited   — hand-picked by the project runner (any round mode; on
 *               runner; free, still occupies a tender spot
 */
export const unlockSourceEnum = pgEnum("unlock_source", [
  "free",
  "founding",
  "paid",
  "admin",
  // Appended last: pg ALTER TYPE ADD VALUE appends safely.
  "invited",
]);

// ── unlocks ──────────────────────────────────────────────────────────────

export const unlocks = pgTable(
  "unlocks",
  {
    id: uuid().primaryKey().defaultRandom(),
    builderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    source: unlockSourceEnum().notNull().default("free"),
    /** Stripe payment intent id when source = "paid" (step 5). */
    stripePaymentIntentId: text(),
    unlockedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // A builder can only unlock a project once.
    uniqueIndex("unlocks_builder_project_idx").on(t.builderId, t.projectId),
    // Hot path: list a builder's unlocked projects.
    index("unlocks_builder_idx").on(t.builderId, t.unlockedAt),
    // Hot path: count unlocks per project (owner KPI).
    index("unlocks_project_idx").on(t.projectId),
  ],
);

// ── saved projects ───────────────────────────────────────────────────────

export const savedProjects = pgTable(
  "saved_projects",
  {
    id: uuid().primaryKey().defaultRandom(),
    builderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    savedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("saved_builder_project_idx").on(t.builderId, t.projectId),
    index("saved_builder_idx").on(t.builderId, t.savedAt),
  ],
);

export type UnlockRow = typeof unlocks.$inferSelect;
export type UnlockInsert = typeof unlocks.$inferInsert;
export type SavedProjectRow = typeof savedProjects.$inferSelect;
export type SavedProjectInsert = typeof savedProjects.$inferInsert;
