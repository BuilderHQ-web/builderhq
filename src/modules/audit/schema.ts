/**
 * audit · drizzle schema.
 *
 * One table for now — `admin_actions` — capturing every state-changing
 * action an admin takes on the platform. Append-only by convention
 * (no UPDATE/DELETE in service code).
 *
 * Why this lives in its own module instead of inside `admin`: other
 * modules (notifications, tenders, payments) will eventually log
 * their own audit events here too. Keeping the table + service free
 * of admin-specific helpers lets it grow without churn.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "@/modules/users";
// Import the FK target tables from their schema files directly, NOT the
// module barrels — the barrels re-export server-only services, which the
// drizzle-kit schema loader (db:generate) can't import. Every other
// schema.ts follows this same rule.
import { projects } from "@/modules/projects/schema";
import { tenders } from "@/modules/tenders/schema";

export const adminActionKindEnum = pgEnum("admin_action_kind", [
  "builder_approved",
  "builder_rejected",
  "builder_suspended",
  "builder_unsuspended",
  "user_suspended",
  "user_unsuspended",
  "user_banned",
  "user_unbanned",
  "user_deleted",
  "project_archived",
  "project_restored",
  "tender_force_decided",
]);

export const adminActions = pgTable(
  "admin_actions",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Acting admin. Nullable so deleting an admin account doesn't
     *  destroy the audit trail. */
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    kind: adminActionKindEnum().notNull(),
    /** Exactly one of these is set in practice — different actions
     *  target different subjects. */
    subjectUserId: uuid("subject_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    subjectProjectId: uuid("subject_project_id").references(
      () => projects.id,
      { onDelete: "set null" },
    ),
    subjectTenderId: uuid("subject_tender_id").references(() => tenders.id, {
      onDelete: "set null",
    }),
    /** Free-text reason captured at action time. */
    reason: text(),
    /** Structured before/after payload. Shape varies by kind. */
    meta: jsonb().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("admin_actions_actor_idx").on(t.actorId, t.createdAt),
    index("admin_actions_subject_user_idx").on(t.subjectUserId, t.createdAt),
    index("admin_actions_created_at_idx").on(t.createdAt),
  ],
);

export type AdminActionRow = typeof adminActions.$inferSelect;
export type AdminActionInsert = typeof adminActions.$inferInsert;
export type AdminActionKind = (typeof adminActionKindEnum.enumValues)[number];
