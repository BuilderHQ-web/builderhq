/**
 * notifications · drizzle schema.
 *
 * One table — `notifications`. A row is a single in-app notification
 * delivered to one user. Email delivery is parallel and stateless
 * (the email module logs sends to its own audit table later) — this
 * table is purely about the in-app feed (bell + dropdown).
 *
 * Subject FKs (`projectId`, `tenderId`) are nullable because not every
 * notification kind targets both. They cascade-delete with the
 * subject so we don't end up with dangling pointers if a project or
 * tender is removed.
 *
 * The `read_at` timestamp is null until the user marks it read; we
 * filter on this for the unread counter and the "unread first" sort
 * in the dropdown.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";
import { tenders } from "@/modules/tenders/schema";

/**
 * The fixed set of in-app event kinds. Email subject lines / template
 * picks key off this. Add a new kind here, add a template + dispatch
 * branch in the service, and migrate the enum.
 */
export const notificationKindEnum = pgEnum("notification_kind", [
  // Tender state transitions (the comms loop's bread-and-butter)
  "tender_submitted", // → owner
  "tender_withdrawn", // → owner
  "tender_shortlisted", // → builder
  "tender_awarded", // → builder
  "tender_rejected", // → builder
  "tender_invited", // → builder (hand-picked for a tender round)
  // Project events
  "project_published", // → builders (bulk fan-out, gated by marketing flag)
  "project_unlocked", // → owner (a builder unlocked their project)
  // The seat + the clock
  "participant_joined", // → runner (an invited seat was claimed)
  "tender_validity_expiring", // → owner side (a priced tender's validity is closing)
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),

    /** Recipient. */
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    kind: notificationKindEnum().notNull(),

    /** Subject pointers. Both nullable — only set if the kind targets them. */
    projectId: uuid().references(() => projects.id, { onDelete: "cascade" }),
    tenderId: uuid().references(() => tenders.id, { onDelete: "cascade" }),

    /** Short headline shown in the bell dropdown. */
    title: text().notNull(),
    /** One-line description rendered under the title. Optional. */
    body: text(),
    /** Where clicking the notification should take the user. */
    actionUrl: text(),

    /** Null until the user marks it read. */
    readAt: timestamp({ mode: "date", withTimezone: true }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Feed: user's recent notifications, newest first.
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
    // Unread count: where userId = ? and read_at IS NULL.
    index("notifications_user_read_idx").on(t.userId, t.readAt),
    // Idempotency for project_published / project_unlocked: at most one
    // per (recipient, kind, project). Tender events dedup app-side
    // because they key on project + tender pair instead.
    uniqueIndex("notifications_publish_unlock_unique")
      .on(t.userId, t.kind, t.projectId)
      .where(sql`kind IN ('project_published', 'project_unlocked')`),
  ],
);

export type NotificationRow = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;

/**
 * notification_outbox — durable email send queue.
 *
 * Why this exists: bulk email fan-outs (project_published → builders)
 * used to send inline in the publish request via a throttled batch
 * loop. On Vercel serverless the function is terminated shortly after
 * the response, so only the first batch ever sent — the rest were
 * silently dropped (this bit Brunswick AND Footscray).
 *
 * Now the publish does ONE fast, reliable bulk insert here (status
 * 'pending'), and a Vercel cron (`/api/cron/notification-outbox`)
 * drains it in retry-safe batches. A claimed row is moved to 'sending'
 * with a lease (next_attempt_at = now + lease); if the drainer dies
 * mid-send the row becomes re-claimable once the lease expires, so
 * nothing is lost and nothing double-sends.
 */
export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: uuid().primaryKey().defaultRandom(),

    /** Email kind — selects the sender in the drainer. Plain text (not an
     *  enum) so new email kinds don't need a migration. Today only
     *  "project_published_builder". */
    kind: text().notNull(),

    /** Destination address — denormalised so the drainer is self-contained. */
    toEmail: text("to_email").notNull(),

    /** Recipient user — for the unsubscribe-token lookup at send time. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),

    /** Subject project, if any. */
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),

    /** Everything the email template needs, denormalised so a later
     *  project edit/delete can't corrupt an in-flight send. */
    payload: jsonb().notNull().default(sql`'{}'::jsonb`),

    /** pending → sending (claimed, leased) → sent | failed. */
    status: text().notNull().default("pending"),
    attempts: integer().notNull().default(0),
    lastError: text("last_error"),
    /** Resend message id once delivered to the provider. */
    resendId: text("resend_id"),

    /** Doubles as retry-backoff schedule AND the claim lease: a claimed
     *  row gets next_attempt_at = now() + lease; a row is claimable when
     *  next_attempt_at <= now(), which auto-recovers leases the drainer
     *  abandoned by dying mid-send. */
    nextAttemptAt: timestamp("next_attempt_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { mode: "date", withTimezone: true }),
  },
  (t) => [
    // Drainer claim: due rows, oldest first.
    index("notif_outbox_status_next_idx").on(t.status, t.nextAttemptAt),
    // Idempotency — at most one row per (kind, recipient, project) so a
    // re-publish or a double dispatch never double-enqueues.
    uniqueIndex("notif_outbox_kind_email_project_unique").on(
      t.kind,
      t.toEmail,
      t.projectId,
    ),
  ],
);

export type NotificationOutboxRow = typeof notificationOutbox.$inferSelect;
export type NotificationOutboxInsert = typeof notificationOutbox.$inferInsert;
